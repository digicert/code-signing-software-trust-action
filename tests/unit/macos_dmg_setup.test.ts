/**
 * Unit tests for macos_dmg_setup.ts
 * Tests DMG mounting, callback execution, and proper unmounting
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { extractDmg } from '../../src/macos_dmg_setup';
import { getExecOutput, resetMocks as resetExecMocks } from '../__mocks__/@actions/exec';
import { resetMocks as resetCoreMocks } from '../__mocks__/@actions/core';

describe('macos_dmg_setup.ts - DMG Extraction and Unmounting', () => {
    
    beforeEach(() => {
        resetCoreMocks();
        resetExecMocks();
        jest.clearAllMocks();
    });

    describe('extractDmg - Successful Scenarios', () => {
        test('should mount DMG file and unmount after callback', async () => {
            const dmgFile = '/path/to/test.dmg';
            const callback = jest.fn().mockResolvedValue(undefined) as any;

            (getExecOutput as any).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            const volume = await extractDmg(dmgFile, callback);

            // Should call hdiutil attach
            expect(getExecOutput).toHaveBeenCalledWith(
                'hdiutil',
                expect.arrayContaining(['attach', dmgFile, '-mountpoint'])
            );

            // Should execute callback
            expect(callback).toHaveBeenCalledWith(volume);
            expect(callback).toHaveBeenCalledTimes(1);

            // Should call hdiutil detach
            expect(getExecOutput).toHaveBeenCalledWith(
                'hdiutil',
                ['detach', volume],
                { ignoreReturnCode: true }
            );

            // Should have both mount and unmount calls
            expect(getExecOutput).toHaveBeenCalledTimes(2);
        });

        test('should unmount even if callback succeeds', async () => {
            const dmgFile = '/test/app.dmg';
            const callback = jest.fn().mockResolvedValue('success');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            await extractDmg(dmgFile, callback);

            // Verify detach was called
            const detachCall = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls.find(
                call => call[0] === 'hdiutil' && call[1][0] === 'detach'
            );
            expect(detachCall).toBeDefined();
        });

        test('should use random directory name for mount point', async () => {
            const callback = jest.fn().mockResolvedValue(undefined);

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            const volume1 = await extractDmg('/test1.dmg', callback);
            const volume2 = await extractDmg('/test2.dmg', callback);

            // Should use different mount points
            expect(volume1).not.toBe(volume2);
            expect(volume1).toContain('Volumes');
            expect(volume1).toContain('D_');
            expect(volume2).toContain('Volumes');
            expect(volume2).toContain('D_');
        });

        test('should return the mount volume path', async () => {
            const callback = jest.fn().mockResolvedValue(undefined);

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            const volume = await extractDmg('/test.dmg', callback);

            expect(volume).toContain('Volumes');
            expect(volume).toContain('D_'); // Random directory prefix
        });
    });

    describe('extractDmg - Error Scenarios with Unmounting', () => {
        test('should unmount DMG even if callback throws error', async () => {
            const dmgFile = '/path/to/failing.dmg';
            const callbackError = new Error('Callback processing failed');
            const callback = jest.fn().mockRejectedValue(callbackError);

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            await expect(extractDmg(dmgFile, callback)).rejects.toThrow('Callback processing failed');

            // Should still call hdiutil detach despite callback error
            const detachCall = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls.find(
                call => call[0] === 'hdiutil' && call[1][0] === 'detach'
            );
            expect(detachCall).toBeDefined();
            expect(detachCall![2]).toEqual({ ignoreReturnCode: true });
        });

        test('should handle unmount failure gracefully', async () => {
            const callback = jest.fn().mockResolvedValue(undefined);

            (getExecOutput as jest.Mock<typeof getExecOutput>)
                .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // mount succeeds
                .mockRejectedValueOnce(new Error('Unmount failed')); // unmount fails

            // Should NOT throw despite unmount failure
            await expect(extractDmg('/test.dmg', callback)).resolves.toBeDefined();

            // Callback should have been executed
            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('should not attempt unmount if mount fails', async () => {
            const callback = jest.fn().mockResolvedValue(undefined);

            (getExecOutput as jest.Mock<typeof getExecOutput>)
                .mockRejectedValueOnce(new Error('Mount failed'));

            await expect(extractDmg('/bad.dmg', callback)).rejects.toThrow('Mount failed');

            // Should only have one exec call (failed mount)
            expect(getExecOutput).toHaveBeenCalledTimes(1);
            
            // Callback should never be called
            expect(callback).not.toHaveBeenCalled();
        });

        test('should use ignoreReturnCode for unmount to prevent false failures', async () => {
            const callback = jest.fn().mockResolvedValue(undefined);

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            await extractDmg('/test.dmg', callback);

            // Find the detach call
            const detachCall = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls.find(
                call => call[0] === 'hdiutil' && call[1][0] === 'detach'
            );

            expect(detachCall).toBeDefined();
            expect(detachCall![2]).toEqual({ ignoreReturnCode: true });
        });
    });

    describe('extractDmg - Self-Hosted Runner Leak Prevention', () => {
        test('should prevent mount point leaks on self-hosted runners', async () => {
            // Simulate multiple DMG extractions (as would happen on self-hosted runners)
            const callback = jest.fn().mockResolvedValue(undefined);

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            // Extract 3 DMGs sequentially
            await extractDmg('/test1.dmg', callback);
            await extractDmg('/test2.dmg', callback);
            await extractDmg('/test3.dmg', callback);

            // Should have 6 exec calls (3 mounts + 3 unmounts)
            expect(getExecOutput).toHaveBeenCalledTimes(6);

            // Count mount and unmount calls
            const attachCalls = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls.filter(
                call => call[0] === 'hdiutil' && call[1][0] === 'attach'
            );
            const detachCalls = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls.filter(
                call => call[0] === 'hdiutil' && call[1][0] === 'detach'
            );

            expect(attachCalls).toHaveLength(3);
            expect(detachCalls).toHaveLength(3);
        });

        test('should unmount with callback exception to prevent leaks', async () => {
            const callback1 = jest.fn().mockResolvedValue(undefined);
            const callback2 = jest.fn().mockRejectedValue(new Error('Processing error'));
            const callback3 = jest.fn().mockResolvedValue(undefined);

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            // First extraction succeeds
            await extractDmg('/test1.dmg', callback1);

            // Second extraction fails in callback
            await expect(extractDmg('/test2.dmg', callback2)).rejects.toThrow();

            // Third extraction succeeds
            await extractDmg('/test3.dmg', callback3);

            // All 3 should have been unmounted (6 exec calls total)
            const detachCalls = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls.filter(
                call => call[0] === 'hdiutil' && call[1][0] === 'detach'
            );
            expect(detachCalls).toHaveLength(3);
        });
    });

    describe('extractDmg - Integration Test Scenarios', () => {
        test('should handle complex callback with file operations', async () => {
            const callback = jest.fn(async (mountPath: string) => {
                // Simulate complex operations on mounted volume
                expect(mountPath).toContain('Volumes');
                return `/extracted/path/from/${mountPath}`;
            });

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            const volume = await extractDmg('/complex.dmg', callback);

            expect(callback).toHaveBeenCalledWith(volume);
            expect(volume).toContain('Volumes');
            expect(volume).toContain('D_');

            // Still unmounts after complex callback
            const detachCall = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls.find(
                call => call[0] === 'hdiutil' && call[1][0] === 'detach'
            );
            expect(detachCall).toBeDefined();
        });

        test('should handle async callback properly', async () => {
            const callback = jest.fn(async (mountPath: string) => {
                await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async work
                return 'async result';
            });

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            await extractDmg('/async.dmg', callback);

            expect(callback).toHaveBeenCalled();

            // Unmount should happen after async callback completes
            const calls = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls;
            const attachIndex = calls.findIndex(call => call[1][0] === 'attach');
            const detachIndex = calls.findIndex(call => call[1][0] === 'detach');

            expect(attachIndex).toBeLessThan(detachIndex); // Detach after attach
        });
    });
});
