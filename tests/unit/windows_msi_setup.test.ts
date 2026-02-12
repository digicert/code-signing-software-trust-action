/**
 * Tests for windows_msi_setup.ts with mocked exec calls
 * Tests both positive and negative scenarios for MSI installation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { installMsi } from '../../src/windows_msi_setup';
import { resetMocks as resetCoreMocks } from '../__mocks__/@actions/core';
import { getExecOutput } from '../__mocks__/@actions/exec';

describe('windows_msi_setup.ts - Mocked Exec Tests', () => {
    let testMsiPath: string;
    let callbackExecuted: boolean;
    let tempDir: string;

    beforeEach(async () => {
        resetCoreMocks();
        jest.clearAllMocks();
        callbackExecuted = false;

        // Create a secure temporary directory for test files
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'windows-msi-test-'));
        
        // Create a fake MSI file inside the secure temp directory
        testMsiPath = path.join(tempDir, 'test.msi');
        await fs.writeFile(testMsiPath, 'fake msi content');
    });

    afterEach(async () => {
        // Cleanup: remove entire temp directory
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        }
    });

    describe('Positive Scenarios - Success Cases', () => {
        test('should successfully install MSI when msiexec succeeds', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: 'Installation completed successfully',
                stderr: '',
            });

            const callback = jest.fn(async (dir: string) => {
                callbackExecuted = true;
                expect(dir).toBeTruthy();
            });

            const result = await installMsi(testMsiPath, callback);

            expect(result).toBeTruthy();
            expect(callback).toHaveBeenCalled();
            expect(getExecOutput).toHaveBeenCalled();
        });

        test('should call msiexec with correct arguments for installation', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            const callback = jest.fn(async () => {});

            await installMsi(testMsiPath, callback);

            // Find the install call (not uninstall)
            const installCall = (getExecOutput as jest.Mock).mock.calls.find(
                (call: any[]) => call[1] && call[1][0] === '/i'
            );

            expect(installCall).toBeDefined();
            expect(installCall![0]).toBe('msiexec');
            expect(installCall![1]).toContain('/i');
            expect(installCall![1]).toContain(testMsiPath);
            expect(installCall![1]).toContain('/qn'); // Quiet mode, no UI
            expect(installCall![1]).toContain('/le'); // Log errors
            expect(installCall![1]).toContain('/norestart'); // No restart
            
            // Check that INSTALLDIR is set (the last argument should start with INSTALLDIR=)
            const installDirArg = installCall![1].find((arg: string) => arg.startsWith('INSTALLDIR='));
            expect(installDirArg).toBeDefined();
            expect(installDirArg).toMatch(/^INSTALLDIR=/);
        });

        test('should create installation log file', async () => {
            let capturedLogFile: string | undefined;

            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string, args: string[]) => {
                if (args && args[0] === '/i') {
                    // Extract log file path from arguments
                    const leIndex = args.indexOf('/le');
                    if (leIndex !== -1 && leIndex + 1 < args.length) {
                        capturedLogFile = args[leIndex + 1];
                    }
                }
                return { exitCode: 0, stdout: '', stderr: '' };
            });

            const callback = jest.fn(async () => {});

            await installMsi(testMsiPath, callback);

            expect(capturedLogFile).toBeDefined();
            expect(capturedLogFile).toMatch(/\.log$/);
        });

        test('should attempt uninstall before install', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            const callback = jest.fn(async () => {});

            await installMsi(testMsiPath, callback);

            // Should be called at least twice: uninstall + install
            expect(getExecOutput).toHaveBeenCalled();
            const calls = (getExecOutput as jest.Mock).mock.calls;
            
            // First call should be uninstall (/x)
            expect(calls[0][1]).toContain('/x');
            
            // Second call should be install (/i)
            const installCall = calls.find((call: any[]) => call[1] && call[1][0] === '/i');
            expect(installCall).toBeDefined();
        });

        test('should handle case when no existing installation found (error 1605)', async () => {
            let callCount = 0;

            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string, args: string[]) => {
                callCount++;
                if (args && args[0] === '/x') {
                    // Uninstall returns 1605 (not installed)
                    return { exitCode: 1605, stdout: '', stderr: '' };
                }
                // Install succeeds
                return { exitCode: 0, stdout: '', stderr: '' };
            });

            const callback = jest.fn(async () => {});

            await installMsi(testMsiPath, callback);

            expect(callCount).toBeGreaterThanOrEqual(2); // uninstall + install
            expect(callback).toHaveBeenCalled();
        });

        test('should invoke callback with installation directory', async () => {
            let capturedInstallDir: string | undefined;

            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            const callback = jest.fn(async (dir: string) => {
                capturedInstallDir = dir;
            });

            await installMsi(testMsiPath, callback);

            expect(callback).toHaveBeenCalledTimes(1);
            expect(capturedInstallDir).toBeDefined();
            expect(capturedInstallDir).toMatch(/D_/); // Should have directory prefix
        });

        test('should return installation directory path', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            const callback = jest.fn(async () => {});

            const result = await installMsi(testMsiPath, callback);

            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('Negative Scenarios - Error Cases', () => {
        test('should throw error when installation fails with non-zero exit code', async () => {
            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string, args: string[]) => {
                if (args && args[0] === '/x') {
                    // Uninstall not found
                    return { exitCode: 1605, stdout: '', stderr: '' };
                }
                // Install fails
                return {
                    exitCode: 1603,
                    stdout: '',
                    stderr: 'Fatal error during installation',
                };
            });

            const callback = jest.fn(async () => {});

            await expect(installMsi(testMsiPath, callback)).rejects.toThrow('Installation of');
            
            // Callback should NOT be called on failure
            expect(callback).not.toHaveBeenCalled();
        });

        test('should include log file content in error message when available', async () => {
            let logFilePath: string | undefined;

            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string, args: string[]) => {
                if (args && args[0] === '/x') {
                    return { exitCode: 1605, stdout: '', stderr: '' };
                }
                
                // Capture log file path
                const leIndex = args.indexOf('/le');
                if (leIndex !== -1) {
                    logFilePath = args[leIndex + 1];
                    // Create log file with error content
                    await fs.writeFile(logFilePath, 'ERROR: Installation failed due to insufficient permissions');
                }
                
                return { exitCode: 1603, stdout: '', stderr: '' };
            });

            const callback = jest.fn(async () => {});

            try {
                await installMsi(testMsiPath, callback);
                fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).toContain('Installation of');
                expect(error.message).toContain('insufficient permissions');
            }

            // Cleanup log file
            if (logFilePath) {
                await fs.unlink(logFilePath).catch(() => {});
            }
        });

        test('should handle case when log file cannot be read on error', async () => {
            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string, args: string[]) => {
                if (args && args[0] === '/x') {
                    return { exitCode: 1605, stdout: '', stderr: '' };
                }
                return { exitCode: 1619, stdout: '', stderr: '' };
            });

            const callback = jest.fn(async () => {});

            await expect(installMsi(testMsiPath, callback)).rejects.toThrow('Installation of');
        });

        test('should handle uninstall failures gracefully and continue with install', async () => {
            let callCount = 0;

            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string, args: string[]) => {
                callCount++;
                if (args && args[0] === '/x') {
                    // Uninstall fails with unexpected error
                    return { exitCode: 1234, stdout: '', stderr: 'Unexpected error' };
                }
                // But install succeeds
                return { exitCode: 0, stdout: '', stderr: '' };
            });

            const callback = jest.fn(async () => {});

            await installMsi(testMsiPath, callback);

            expect(callCount).toBe(2); // Both uninstall and install attempted
            expect(callback).toHaveBeenCalled(); // Install succeeded
        });

        test('should handle exec throwing exception', async () => {
            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string, args: string[]) => {
                if (args && args[0] === '/x') {
                    return { exitCode: 1605, stdout: '', stderr: '' };
                }
                throw new Error('msiexec process crashed');
            });

            const callback = jest.fn(async () => {});

            await expect(installMsi(testMsiPath, callback)).rejects.toThrow();
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        test('should handle non-existent MSI file', async () => {
            // Use path within secure temp directory
            const nonExistentMsi = path.join(tempDir, 'nonexistent.msi');

            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string, args: string[]) => {
                if (args && args[0] === '/x') {
                    return { exitCode: 1605, stdout: '', stderr: '' };
                }
                return {
                    exitCode: 1619,
                    stdout: '',
                    stderr: 'This installation package could not be opened',
                };
            });

            const callback = jest.fn(async () => {});

            await expect(installMsi(nonExistentMsi, callback)).rejects.toThrow();
        });

        test('should use ignoreReturnCode for uninstall operation', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            const callback = jest.fn(async () => {});

            await installMsi(testMsiPath, callback);

            // Find uninstall call
            const uninstallCall = (getExecOutput as jest.Mock).mock.calls.find(
                (call: any[]) => call[1] && call[1][0] === '/x'
            );

            expect(uninstallCall).toBeDefined();
            expect(uninstallCall![2]).toEqual(expect.objectContaining({
                ignoreReturnCode: true,
                silent: true
            }));
        });

        test('should handle callback throwing error', async () => {
            (getExecOutput as jest.Mock).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: '',
            });

            const callback = jest.fn(async () => {
                throw new Error('Callback processing failed');
            });

            await expect(installMsi(testMsiPath, callback)).rejects.toThrow('Callback processing failed');
        });

        test('should create unique temporary directory for each installation', async () => {
            const capturedDirs = new Set<string>();

            (getExecOutput as jest.Mock).mockImplementation(async (cmd: string, args: string[]) => {
                const installDirArg = args.find((arg: string) => arg.startsWith('INSTALLDIR='));
                if (installDirArg) {
                    capturedDirs.add(installDirArg);
                }
                return { exitCode: 0, stdout: '', stderr: '' };
            });

            const callback = jest.fn(async () => {});

            await installMsi(testMsiPath, callback);
            await installMsi(testMsiPath, callback);

            expect(capturedDirs.size).toBe(2); // Two unique directories
        });
    });
});
