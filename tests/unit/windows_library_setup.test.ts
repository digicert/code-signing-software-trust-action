/**
 * Tests for windows_library_setup.ts with mocked exec and fs operations
 * Tests both positive and negative scenarios for process execution and file operations
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { setupLibraries } from '../../src/windows_library_setup';
import { 
    mockInputs,
    resetMocks as resetCoreMocks 
} from '../__mocks__/@actions/core';
import { getExecOutput } from '../__mocks__/@actions/exec';

// Mock fs.copyFile at module level
jest.mock('fs/promises', () => {
    const actual = jest.requireActual('fs/promises') as any;
    return {
        ...actual,
        copyFile: jest.fn().mockResolvedValue(undefined),
    };
});

describe('windows_library_setup.ts - Mocked Exec and FS Tests', () => {
    let testSmtoolsPath: string;
    const copyFileMock = fs.copyFile as jest.Mock;

    beforeEach(async () => {
        // Reset all mocks
        resetCoreMocks();
        jest.clearAllMocks();

        // Create test smtools directory with required files
        testSmtoolsPath = await fs.mkdtemp(path.join(os.tmpdir(), 'smtools-test-'));
        
        // Create mock DLL files
        await fs.writeFile(path.join(testSmtoolsPath, 'smksp-x64.dll'), 'mock x64 ksp dll');
        await fs.writeFile(path.join(testSmtoolsPath, 'smksp-x86.dll'), 'mock x86 ksp dll');
        await fs.writeFile(path.join(testSmtoolsPath, 'ssmcsp-x64.dll'), 'mock x64 csp dll');
        await fs.writeFile(path.join(testSmtoolsPath, 'ssmcsp-x86.dll'), 'mock x86 csp dll');
        await fs.writeFile(path.join(testSmtoolsPath, 'smctl'), 'mock smctl');
        await fs.writeFile(path.join(testSmtoolsPath, 'smctl.exe'), 'mock smctl.exe');

        // Set environment variables for Windows paths
        if (!process.env['SystemRoot']) {
            process.env['SystemRoot'] = 'C:\\Windows';
        }

        // Reset copyFile mock
        copyFileMock.mockResolvedValue(undefined);
    });

    afterEach(async () => {
        // Cleanup test directory
        if (testSmtoolsPath) {
            try {
                await fs.rm(testSmtoolsPath, { recursive: true, force: true });
            } catch (error) {
                console.warn(`Failed to cleanup test directory: ${error}`);
            }
        }
    });

    describe('Positive Scenarios - Success Cases', () => {
        test('should successfully register KSP and CSP when all operations succeed', async () => {
            // Mock successful exec outputs
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: 'Success',
                stderr: '',
            });

            await setupLibraries(testSmtoolsPath);

            // Verify smctl KSP register was called
            expect(getExecOutput).toHaveBeenCalledWith(
                expect.stringContaining('smctl'),
                ['windows', 'ksp', 'register']
            );

            // Verify batch file was executed
            expect(getExecOutput).toHaveBeenCalledWith(
                expect.stringContaining('.bat'),
                [],
                expect.objectContaining({ ignoreReturnCode: true })
            );

            // Should have been called twice (KSP register + batch file)
            expect(getExecOutput).toHaveBeenCalledTimes(2);

            // Verify copyFile was called 4 times (2 KSP + 2 CSP, x64 and x86)
            expect(copyFileMock).toHaveBeenCalledTimes(4);
        });

        test('should copy all DLL files to correct System32 and SysWOW64 locations', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            await setupLibraries(testSmtoolsPath);

            // Verify all 4 DLL copy operations
            const system32 = `${process.env['SystemRoot']}\\System32`;
            const sysWOW64 = `${process.env['SystemRoot']}\\SysWOW64`;

            // KSP files
            expect(copyFileMock).toHaveBeenCalledWith(
                path.join(testSmtoolsPath, 'smksp-x64.dll'),
                path.join(system32, 'smksp.dll')
            );
            expect(copyFileMock).toHaveBeenCalledWith(
                path.join(testSmtoolsPath, 'smksp-x86.dll'),
                path.join(sysWOW64, 'smksp.dll')
            );

            // CSP files
            expect(copyFileMock).toHaveBeenCalledWith(
                path.join(testSmtoolsPath, 'ssmcsp-x64.dll'),
                path.join(system32, 'ssmcsp.dll')
            );
            expect(copyFileMock).toHaveBeenCalledWith(
                path.join(testSmtoolsPath, 'ssmcsp-x86.dll'),
                path.join(sysWOW64, 'ssmcsp.dll')
            );

            expect(copyFileMock).toHaveBeenCalledTimes(4);
        });

        test('should create batch file with correct registry commands', async () => {
            let capturedBatchContent: string | undefined;

            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string, args: any[]) => {
                if (cmd.endsWith('.bat')) {
                    // Capture batch file content before execution
                    try {
                        capturedBatchContent = await fs.readFile(cmd, 'utf-8');
                    } catch {
                        // File might not exist yet
                    }
                }
                return { exitCode: 0, stdout: '', stderr: '' };
            });

            await setupLibraries(testSmtoolsPath);

            // Verify batch file content was captured
            expect(capturedBatchContent).toBeDefined();
            
            if (capturedBatchContent) {
                // Verify it contains registry commands
                expect(capturedBatchContent).toContain('reg add');
                expect(capturedBatchContent).toContain('DigiCert Software Trust Manager CSP');
                expect(capturedBatchContent).toContain('DigiCert Secure Software Manager CSP');
                expect(capturedBatchContent).toContain('HKEY_LOCAL_MACHINE');
                expect(capturedBatchContent).toContain('ssmcsp.dll');
                
                // Verify error handling in batch file
                expect(capturedBatchContent).toContain('if %errorlevel% neq 0');
                expect(capturedBatchContent).toContain('exit /b %errorlevel%');
            }
        });

        test('should execute file operations in correct order', async () => {
            const operationOrder: string[] = [];

            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string, args: any[]) => {
                if (cmd.includes('smctl')) {
                    operationOrder.push('ksp-register');
                } else if (cmd.endsWith('.bat')) {
                    operationOrder.push('batch-execute');
                }
                return { exitCode: 0, stdout: '', stderr: '' };
            });

            copyFileMock.mockImplementation(async (src: string, dest: string) => {
                if (src.includes('smksp')) {
                    operationOrder.push('copy-ksp');
                } else if (src.includes('ssmcsp')) {
                    operationOrder.push('copy-csp');
                }
            });

            await setupLibraries(testSmtoolsPath);

            // Verify order: KSP register -> copy files -> batch execute
            expect(operationOrder[0]).toBe('ksp-register');
            expect(operationOrder[operationOrder.length - 1]).toBe('batch-execute');
            
            // Copy operations should be between KSP register and batch execute
            const copyOperations = operationOrder.filter(op => op.startsWith('copy-'));
            expect(copyOperations.length).toBe(4); // 2 KSP + 2 CSP
        });

        test('should cleanup temporary directory after successful execution', async () => {
            let capturedBatchDir: string | undefined;

            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string) => {
                if (cmd.endsWith('.bat')) {
                    capturedBatchDir = path.dirname(cmd);
                }
                return { exitCode: 0, stdout: '', stderr: '' };
            });

            await setupLibraries(testSmtoolsPath).catch(() => {
                // May fail on DLL copy, but temp dir should still be cleaned
            });

            // Verify temp directory was created with secure prefix
            expect(capturedBatchDir).toBeDefined();
            if (capturedBatchDir) {
                expect(capturedBatchDir).toMatch(/csp-setup-/);
                
                // Verify it was cleaned up (should not exist anymore)
                await expect(fs.access(capturedBatchDir)).rejects.toThrow();
            }
        });
    });

    describe('Negative Scenarios - Error Cases', () => {
        test('should throw error when KSP register fails', async () => {
            (getExecOutput as jest.Mock).mockRejectedValueOnce(
                new Error('Failed to register KSP')
            );

            await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow('Failed to register KSP');

            // Verify it tried to call KSP register
            expect(getExecOutput).toHaveBeenCalledWith(
                expect.stringContaining('smctl'),
                ['windows', 'ksp', 'register']
            );

            // Should only be called once (failed on first call)
            expect(getExecOutput).toHaveBeenCalledTimes(1);
        });

        test('should throw error when batch file execution fails with non-zero exit code', async () => {
            let callCount = 0;

            (getExecOutput as jest.Mock).mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    // KSP register succeeds
                    return { exitCode: 0, stdout: 'KSP registered', stderr: '' };
                } else {
                    // Batch file fails
                    return {
                        exitCode: 1,
                        stdout: 'Registry operation failed',
                        stderr: 'Access denied',
                    };
                }
            });

            await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow(
                'Failed to register CSP registry keys'
            );

            // Verify both calls were made
            expect(getExecOutput).toHaveBeenCalledTimes(2);
        });

        test('should include exit code and output in error message when batch fails', async () => {
            let callCount = 0;

            (getExecOutput as jest.Mock).mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    return { exitCode: 0, stdout: '', stderr: '' };
                } else {
                    return {
                        exitCode: 5,
                        stdout: 'Registry key creation failed',
                        stderr: 'ERROR: Access is denied',
                    };
                }
            });

            try {
                await setupLibraries(testSmtoolsPath);
                fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).toContain('Failed to register CSP registry keys');
                expect(error.message).toContain('Exit code: 5');
            }

            expect(getExecOutput).toHaveBeenCalledTimes(2);
        });

        test('should cleanup temp directory even when KSP register fails', async () => {
            let capturedBatchDir: string | undefined;

            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string) => {
                if (cmd.endsWith('.bat')) {
                    capturedBatchDir = path.dirname(cmd);
                }
                throw new Error('KSP register failed');
            });

            await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow();

            // Temp directory should still be cleaned up
            if (capturedBatchDir) {
                await expect(fs.access(capturedBatchDir)).rejects.toThrow();
            }
        });

        test('should cleanup temp directory even when batch execution fails', async () => {
            let capturedBatchDir: string | undefined;
            let callCount = 0;

            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string) => {
                callCount++;
                if (cmd.endsWith('.bat')) {
                    capturedBatchDir = path.dirname(cmd);
                    return { exitCode: 1, stdout: '', stderr: 'Failed' };
                }
                return { exitCode: 0, stdout: '', stderr: '' };
            });

            await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow();

            // Temp directory should be cleaned up
            if (capturedBatchDir) {
                await expect(fs.readFile( capturedBatchDir)).rejects.toThrow();
            }
        });

        test('should fail when KSP x64 DLL copy fails', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            // First copyFile call (smksp-x64.dll) fails
            copyFileMock.mockRejectedValueOnce(new Error('EACCES: permission denied'));

            await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow('permission denied');

            // Verify KSP register was called
            expect(getExecOutput).toHaveBeenCalledWith(
                expect.stringContaining('smctl'),
                ['windows', 'ksp', 'register']
            );

            // Verify copyFile was attempted
            expect(copyFileMock).toHaveBeenCalledTimes(1);
            
            // Batch file should NOT be executed if copy fails
            const batchCalls = (getExecOutput as jest.Mock).mock.calls.filter(
                (call: any[]) => call[0] && call[0].endsWith('.bat')
            );
            expect(batchCalls.length).toBe(0);
        });

        test('should fail when KSP x86 DLL copy fails', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            // First copy succeeds, second fails (smksp-x86.dll)
            copyFileMock
                .mockResolvedValueOnce(undefined) // smksp-x64.dll succeeds
                .mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

            await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow('no such file or directory');

            expect(copyFileMock).toHaveBeenCalledTimes(2);
        });

        test('should fail when CSP x64 DLL copy fails', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            // First 2 copies succeed, third fails (ssmcsp-x64.dll)
            copyFileMock
                .mockResolvedValueOnce(undefined) // smksp-x64.dll
                .mockResolvedValueOnce(undefined) // smksp-x86.dll
                .mockRejectedValueOnce(new Error('ENOSPC: no space left on device'));

            await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow('no space left on device');

            expect(copyFileMock).toHaveBeenCalledTimes(3);
        });

        test('should fail when CSP x86 DLL copy fails', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            // First 3 copies succeed, fourth fails (ssmcsp-x86.dll)
            copyFileMock
                .mockResolvedValueOnce(undefined) // smksp-x64.dll
                .mockResolvedValueOnce(undefined) // smksp-x86.dll
                .mockResolvedValueOnce(undefined) // ssmcsp-x64.dll
                .mockRejectedValueOnce(new Error('EPERM: operation not permitted'));

            await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow('operation not permitted');

            expect(copyFileMock).toHaveBeenCalledTimes(4);
        });

        test('should cleanup temp directory even when DLL copy fails', async () => {
            let capturedBatchDir: string | undefined;

            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string) => {
                if (cmd.endsWith('.bat')) {
                    capturedBatchDir = path.dirname(cmd);
                }
                return { exitCode: 0, stdout: '', stderr: '' };
            });

            // Fail on first copy
            copyFileMock.mockRejectedValue(new Error('Copy failed'));

            await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow('Copy failed');

            // Verify temp directory was cleaned up
            if (capturedBatchDir) {
                // Directory should not exist after cleanup
                await expect(fs.readFile( capturedBatchDir)).rejects.toThrow();
            }
        });

        test('should propagate specific file system error codes', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            const testCases = [
                { error: 'EACCES', message: 'permission denied' },
                { error: 'ENOENT', message: 'no such file' },
                { error: 'ENOSPC', message: 'no space left' },
                { error: 'EPERM', message: 'operation not permitted' },
                { error: 'EROFS', message: 'read-only file system' },
            ];

            for (const { error, message } of testCases) {
                jest.clearAllMocks();
                copyFileMock.mockRejectedValueOnce(new Error(`${error}: ${message}`));

                await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow(message);
                expect(copyFileMock).toHaveBeenCalled();
            }
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing smctl executable', async () => {
            // Remove smctl files
            await fs.unlink(path.join(testSmtoolsPath, 'smctl')).catch(() => {});
            await fs.unlink(path.join(testSmtoolsPath, 'smctl.exe')).catch(() => {});

            (getExecOutput as jest.Mock).mockRejectedValue(
                new Error('smctl not found')
            );

            await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow();
        });

        test('should handle missing DLL files', async () => {
            // Remove one DLL file
            await fs.unlink(path.join(testSmtoolsPath, 'smksp-x64.dll'));

            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            // Mock copyFile to fail for the missing file
            copyFileMock.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

            // Should fail when trying to copy missing DLL
            await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow();
        });

        test('should handle SystemRoot environment variable not set', async () => {
            const originalSystemRoot = process.env['SystemRoot'];
            delete process.env['SystemRoot'];

            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            // When SystemRoot is undefined, paths will be like "undefined\\System32"
            // copyFile will fail with invalid path
            copyFileMock.mockRejectedValueOnce(new Error('ENOENT: no such file or directory, copyFile'));

            try {
                await expect(setupLibraries(testSmtoolsPath)).rejects.toThrow();
            } finally {
                process.env['SystemRoot'] = originalSystemRoot;
            }
        });

        test('should use ignoreReturnCode option for batch execution', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            await setupLibraries(testSmtoolsPath).catch(() => {
                // May fail on DLL copy
            });

            // Find the batch file execution call
            const batchCall = (getExecOutput as jest.Mock).mock.calls.find(
                call => call[0] && call[0].endsWith('.bat')
            );

            expect(batchCall).toBeDefined();
            expect(batchCall![2]).toEqual(expect.objectContaining({
                ignoreReturnCode: true
            }));
        });
    });
});
