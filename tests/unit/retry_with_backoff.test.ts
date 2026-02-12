import * as core from '@actions/core';
import { retryWithBackoff } from '../../src/utils';

// Mock @actions/core
jest.mock('@actions/core');

describe('retryWithBackoff', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Successful Operations', () => {
        test('should execute operation successfully on first attempt', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            
            const promise = retryWithBackoff(operation, 'Test Operation');
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
            expect(core.debug).toHaveBeenCalledWith('[Attempt 1/3] Test Operation');
        });

        test('should not log success message on first attempt', async () => {
            const operation = jest.fn().mockResolvedValue('data');
            
            const promise = retryWithBackoff(operation, 'Download Tool');
            await jest.runAllTimersAsync();
            await promise;

            expect(core.info).not.toHaveBeenCalledWith(
                expect.stringContaining('succeeded on attempt 1')
            );
        });

        test('should return correct result type', async () => {
            const complexObject = { id: 123, name: 'test', nested: { value: true } };
            const operation = jest.fn().mockResolvedValue(complexObject);
            
            const promise = retryWithBackoff(operation, 'Fetch Data');
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toEqual(complexObject);
        });
    });

    describe('Retry Logic with Transient Failures', () => {
        test('should retry once and succeed on second attempt', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Network timeout'))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(
                operation, 
                'Download Binary',
                { maxAttempts: 3, initialDelayMs: 1000 }
            );
            
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(2);
            expect(core.warning).toHaveBeenCalledWith(
                '⚠ Download Binary failed (attempt 1/3): Network timeout'
            );
            expect(core.info).toHaveBeenCalledWith('Retrying in 1000ms with exponential backoff...');
            expect(core.info).toHaveBeenCalledWith('✓ Download Binary succeeded on attempt 2/3');
        });

        test('should retry twice and succeed on third attempt', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Connection refused'))
                .mockRejectedValueOnce(new Error('Timeout'))
                .mockResolvedValueOnce('finally works');
            
            const promise = retryWithBackoff(
                operation,
                'Download Checksum',
                { maxAttempts: 3, initialDelayMs: 500 }
            );
            
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBe('finally works');
            expect(operation).toHaveBeenCalledTimes(3);
            expect(core.warning).toHaveBeenCalledTimes(2);
            expect(core.info).toHaveBeenCalledWith('✓ Download Checksum succeeded on attempt 3/3');
        });
    });

    describe('Exponential Backoff Timing', () => {
        test('should use initial delay for first retry', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Fail'))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(
                operation,
                'Test',
                { initialDelayMs: 2000 }
            );
            
            await jest.runAllTimersAsync();
            await promise;

            expect(core.info).toHaveBeenCalledWith('Retrying in 2000ms with exponential backoff...');
        });

        test('should apply exponential backoff (2x multiplier)', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Error 1'))
                .mockRejectedValueOnce(new Error('Error 2'))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(
                operation,
                'Test',
                { initialDelayMs: 1000, backoffMultiplier: 2 }
            );
            
            await jest.runAllTimersAsync();
            await promise;

            const infoCalls = (core.info as jest.Mock).mock.calls;
            const retryCalls = infoCalls.filter(call => 
                call[0].includes('Retrying in') && call[0].includes('ms')
            );
            
            expect(retryCalls[0][0]).toContain('Retrying in 1000ms');
            expect(retryCalls[1][0]).toContain('Retrying in 2000ms');
        });

        test('should respect maximum delay cap', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Error 1'))
                .mockRejectedValueOnce(new Error('Error 2'))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(
                operation,
                'Test',
                { 
                    initialDelayMs: 10000, 
                    backoffMultiplier: 3,
                    maxDelayMs: 15000 
                }
            );
            
            await jest.runAllTimersAsync();
            await promise;

            const infoCalls = (core.info as jest.Mock).mock.calls;
            const retryCalls = infoCalls.filter(call => 
                call[0].includes('Retrying in') && call[0].includes('ms')
            );
            
            // First retry: 10000ms
            expect(retryCalls[0][0]).toContain('Retrying in 10000ms');
            // Second retry: would be 30000ms, but capped at 15000ms
            expect(retryCalls[1][0]).toContain('Retrying in 15000ms');
        });

        test('should use custom backoff multiplier', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Error 1'))
                .mockRejectedValueOnce(new Error('Error 2'))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(
                operation,
                'Test',
                { 
                    initialDelayMs: 500,
                    backoffMultiplier: 3,
                    maxDelayMs: 100000
                }
            );
            
            await jest.runAllTimersAsync();
            await promise;

            const infoCalls = (core.info as jest.Mock).mock.calls;
            const retryCalls = infoCalls.filter(call => 
                call[0].includes('Retrying in') && call[0].includes('ms')
            );
            
            expect(retryCalls[0][0]).toContain('Retrying in 500ms');  // 500 * 1
            expect(retryCalls[1][0]).toContain('Retrying in 1500ms'); // 500 * 3
        });
    });

    describe('Exhausted Retries - Permanent Failures', () => {
        test('should fail after max attempts with default config', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
            
            const promise = retryWithBackoff(operation, 'Download Tool');
            
            // Run timers and catch the rejection
            const result = promise.catch(err => err);
            await jest.runAllTimersAsync();
            const error = await result;
            
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('Persistent failure');
            expect(operation).toHaveBeenCalledTimes(3); // Default maxAttempts
            expect(core.error).toHaveBeenCalledWith(
                '✗ Download Tool failed after 3 attempts: Persistent failure'
            );
        });

        test('should fail after custom max attempts', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
            
            const promise = retryWithBackoff(
                operation,
                'Fetch Metadata',
                { maxAttempts: 5 }
            );
            
            const result = promise.catch(err => err);
            await jest.runAllTimersAsync();
            const error = await result;
            
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('Always fails');
            expect(operation).toHaveBeenCalledTimes(5);
        });

        test('should log warning for each failed attempt except last', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Fail'));
            
            const promise = retryWithBackoff(
                operation,
                'Test',
                { maxAttempts: 4 }
            );
            
            const result = promise.catch(err => err);
            await jest.runAllTimersAsync();
            await result;
            
            expect(core.warning).toHaveBeenCalledTimes(3); // n-1 warnings
            expect(core.error).toHaveBeenCalledTimes(1);   // 1 final error
        });

        test('should handle non-Error thrown values', async () => {
            const operation = jest.fn().mockRejectedValue('string error');
            
            const promise = retryWithBackoff(operation, 'Test');
            
            const result = promise.catch(err => err);
            await jest.runAllTimersAsync();
            const error = await result;
            
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('string error');
        });
    });

    describe('Custom Configuration', () => {
        test('should respect maxAttempts = 1 (no retries)', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Immediate fail'));
            
            const promise = retryWithBackoff(
                operation,
                'Quick Operation',
                { maxAttempts: 1 }
            );
            
            const result = promise.catch(err => err);
            await jest.runAllTimersAsync();
            const error = await result;
            
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe('Immediate fail');
            expect(operation).toHaveBeenCalledTimes(1);
            expect(core.warning).not.toHaveBeenCalled(); // No retries = no warnings
        });

        test('should accept all custom config parameters', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Fail'))
                .mockResolvedValueOnce('success');
            
            const promise = retryWithBackoff(
                operation,
                'Custom Test',
                {
                    maxAttempts: 5,
                    initialDelayMs: 100,
                    backoffMultiplier: 1.5,
                    maxDelayMs: 5000
                }
            );
            
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(2);
        });
    });

    describe('Real-World Scenarios', () => {
        test('should handle CDN download simulation', async () => {
            const downloadSimulation = jest.fn()
                .mockRejectedValueOnce(new Error('503 Service Unavailable'))
                .mockRejectedValueOnce(new Error('Connection timeout'))
                .mockResolvedValueOnce('/tmp/downloaded-file.tar.gz');
            
            const promise = retryWithBackoff(
                downloadSimulation,
                'Download smctl from CDN',
                { maxAttempts: 5, initialDelayMs: 2000 }
            );
            
            await jest.runAllTimersAsync();
            const filePath = await promise;

            expect(filePath).toBe('/tmp/downloaded-file.tar.gz');
            expect(downloadSimulation).toHaveBeenCalledTimes(3);
        });

        test('should handle checksum download failure then success', async () => {
            const checksumDownload = jest.fn()
                .mockRejectedValueOnce(new Error('404 Not Found'))
                .mockResolvedValueOnce('/tmp/checksum.sha256');
            
            const promise = retryWithBackoff(
                checksumDownload,
                'Download checksum file',
                { maxAttempts: 3, initialDelayMs: 1000 }
            );
            
            await jest.runAllTimersAsync();
            const checksumPath = await promise;

            expect(checksumPath).toBe('/tmp/checksum.sha256');
            expect(core.warning).toHaveBeenCalledWith(
                '⚠ Download checksum file failed (attempt 1/3): 404 Not Found'
            );
        });

        test('should handle complete CDN outage (all retries fail)', async () => {
            const cdnOutage = jest.fn().mockRejectedValue(
                new Error('ERR_CONNECTION_REFUSED')
            );
            
            const promise = retryWithBackoff(
                cdnOutage,
                'Download from unreachable CDN',
                { maxAttempts: 3 }
            );
            
            const result = promise.catch(err => err);
            await jest.runAllTimersAsync();
            const error = await result;
            
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe('ERR_CONNECTION_REFUSED');
            expect(cdnOutage).toHaveBeenCalledTimes(3);
            expect(core.error).toHaveBeenCalledWith(
                '✗ Download from unreachable CDN failed after 3 attempts: ERR_CONNECTION_REFUSED'
            );
        });
    });

    describe('Edge Cases', () => {
        test('should handle operation that throws synchronously', async () => {
            const operation = jest.fn().mockImplementation(() => {
                throw new Error('Sync error');
            });
            
            const promise = retryWithBackoff(operation, 'Sync Operation');
            
            const result = promise.catch(err => err);
            await jest.runAllTimersAsync();
            const error = await result;
            
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe('Sync error');
        });

        test('should handle operation returning undefined', async () => {
            const operation = jest.fn().mockResolvedValue(undefined);
            
            const promise = retryWithBackoff(operation, 'Returns Undefined');
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBeUndefined();
            expect(operation).toHaveBeenCalledTimes(1);
        });

        test('should handle operation returning null', async () => {
            const operation = jest.fn().mockResolvedValue(null);
            
            const promise = retryWithBackoff(operation, 'Returns Null');
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBeNull();
        });

        test('should handle empty config object', async () => {
            const operation = jest.fn().mockResolvedValue('default config');
            
            const promise = retryWithBackoff(operation, 'Default Config', {});
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBe('default config');
        });
    });
});
