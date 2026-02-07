/**
 * Tests for zip_setup.ts - Archive extraction tests
 * Tests extraction functionality with real archive files
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';
import * as tar from 'tar';
import { extractZip, extractTar } from '../../src/zip_setup';

describe('zip_setup.ts - Archive Extraction Tests', () => {
    let testDir: string;
    let zipFilePath: string;
    let tarFilePath: string;

    beforeEach(async () => {
        // Create a temporary test directory
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zip-setup-test-'));
        zipFilePath = path.join(testDir, 'test-archive.zip');
        tarFilePath = path.join(testDir, 'test-archive.tar');
    });

    afterEach(async () => {
        // Cleanup test directory
        if (testDir) {
            try {
                await fs.rm(testDir, { recursive: true, force: true });
            } catch (error) {
                console.warn(`Failed to cleanup test directory: ${error}`);
            }
        }
    });

    describe('extractZip', () => {
        test('should successfully call extractZip with valid zip file', async () => {
            // Create a simple zip file
            const tempSourceDir = path.join(testDir, 'source');
            await fs.mkdir(tempSourceDir, { recursive: true });
            await fs.writeFile(path.join(tempSourceDir, 'test.txt'), 'Hello, World!', 'utf-8');

            const zip = new AdmZip();
            zip.addLocalFile(path.join(tempSourceDir, 'test.txt'));
            zip.writeZip(zipFilePath);

            // Track callback invocation
            let callbackInvoked = false;
            let extractedPath = '';

            // Extract the zip
            const tmpDir = await extractZip(zipFilePath, async (extractPath) => {
                callbackInvoked = true;
                extractedPath = extractPath;
            });

            // Verify callback was invoked
            expect(callbackInvoked).toBe(true);
            expect(extractedPath).toBeTruthy();
            expect(tmpDir).toBeTruthy();
            
            // Verify it returns a directory path
            const stats = await fs.stat(tmpDir);
            expect(stats.isDirectory()).toBe(true);

            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        });

        test('should return a temporary directory path', async () => {
            const tempSourceDir = path.join(testDir, 'source');
            await fs.mkdir(tempSourceDir, { recursive: true });
            await fs.writeFile(path.join(tempSourceDir, 'test.txt'), 'Test', 'utf-8');

            const zip = new AdmZip();
            zip.addLocalFile(path.join(tempSourceDir, 'test.txt'));
            zip.writeZip(zipFilePath);

            const tmpDir = await extractZip(zipFilePath, async () => {});

            // Verify the returned path exists and is a directory
            const stats = await fs.stat(tmpDir);
            expect(stats.isDirectory()).toBe(true);

            // Verify it's in the temp directory
            expect(tmpDir).toContain(os.tmpdir());

            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        });

        test('should execute callback with extraction path', async () => {
            const tempSourceDir = path.join(testDir, 'source');
            await fs.mkdir(tempSourceDir, { recursive: true });
            await fs.writeFile(path.join(tempSourceDir, 'callback-test.txt'), 'Callback Test', 'utf-8');

            const zip = new AdmZip();
            zip.addLocalFile(path.join(tempSourceDir, 'callback-test.txt'));
            zip.writeZip(zipFilePath);

            let callbackExtractPath = '';
            let callbackExecuted = false;

            const returnedTmpDir = await extractZip(zipFilePath, async (extractPath) => {
                callbackExtractPath = extractPath;
                callbackExecuted = true;
                
                // Verify extract path is an absolute path
                expect(path.isAbsolute(extractPath)).toBe(true);
            });

            // Verify callback was executed
            expect(callbackExecuted).toBe(true);
            expect(callbackExtractPath).toBeTruthy();

            // Cleanup
            await fs.rm(returnedTmpDir, { recursive: true, force: true }).catch(() => {});
        });

        test('should handle multiple files in zip', async () => {
            const tempSourceDir = path.join(testDir, 'source');
            await fs.mkdir(tempSourceDir, { recursive: true });
            await fs.writeFile(path.join(tempSourceDir, 'file1.txt'), 'Content 1', 'utf-8');
            await fs.writeFile(path.join(tempSourceDir, 'file2.txt'), 'Content 2', 'utf-8');

            const zip = new AdmZip();
            zip.addLocalFile(path.join(tempSourceDir, 'file1.txt'));
            zip.addLocalFile(path.join(tempSourceDir, 'file2.txt'));
            zip.writeZip(zipFilePath);

            let callbackInvoked = false;

            const tmpDir = await extractZip(zipFilePath, async () => {
                callbackInvoked = true;
            });

            expect(callbackInvoked).toBe(true);
            expect(tmpDir).toBeTruthy();

            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        });
    });

    describe('extractTar', () => {
        test('should successfully call extractTar with valid tar file', async () => {
            // Create a tar file
            const tempSourceDir = path.join(testDir, 'source');
            await fs.mkdir(tempSourceDir, { recursive: true });
            await fs.writeFile(path.join(tempSourceDir, 'test.txt'), 'Hello from tar!', 'utf-8');

            await tar.create(
                { file: tarFilePath, cwd: tempSourceDir },
                ['test.txt']
            );

            let callbackInvoked = false;
            let extractedPath = '';

            const tmpDir = await extractTar(tarFilePath, async (extractPath) => {
                callbackInvoked = true;
                extractedPath = extractPath;
            });

            // Verify callback was invoked
            expect(callbackInvoked).toBe(true);
            expect(extractedPath).toBeTruthy();
            expect(tmpDir).toBeTruthy();

            // Verify it returns a directory
            const stats = await fs.stat(tmpDir);
            expect(stats.isDirectory()).toBe(true);

            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        });

        test('should return a temporary directory path', async () => {
            const tempSourceDir = path.join(testDir, 'source');
            await fs.mkdir(tempSourceDir, { recursive: true });
            await fs.writeFile(path.join(tempSourceDir, 'test.txt'), 'Test', 'utf-8');

            await tar.create({ file: tarFilePath, cwd: tempSourceDir }, ['test.txt']);

            const tmpDir = await extractTar(tarFilePath, async () => {});

            // Verify the returned path exists and is a directory
            const stats = await fs.stat(tmpDir);
            expect(stats.isDirectory()).toBe(true);

            // Verify it's in the temp directory
            expect(tmpDir).toContain(os.tmpdir());

            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        });

        test('should execute callback with extraction path', async () => {
            const tempSourceDir = path.join(testDir, 'source');
            await fs.mkdir(tempSourceDir, { recursive: true });
            await fs.writeFile(path.join(tempSourceDir, 'callback-tar.txt'), 'Tar Callback Test', 'utf-8');

            await tar.create({ file: tarFilePath, cwd: tempSourceDir }, ['callback-tar.txt']);

            let callbackExtractPath = '';
            let callbackExecuted = false;

            const returnedTmpDir = await extractTar(tarFilePath, async (extractPath) => {
                callbackExtractPath = extractPath;
                callbackExecuted = true;
                
                // Verify extract path is an absolute path
                expect(path.isAbsolute(extractPath)).toBe(true);
            });

            // Verify callback was executed
            expect(callbackExecuted).toBe(true);
            expect(callbackExtractPath).toBeTruthy();

            // Cleanup
            await fs.rm(returnedTmpDir, { recursive: true, force: true }).catch(() => {});
        });

        test('should handle multiple files in tar', async () => {
            const tempSourceDir = path.join(testDir, 'source');
            await fs.mkdir(tempSourceDir, { recursive: true });
            await fs.writeFile(path.join(tempSourceDir, 'file1.txt'), 'Tar Content 1', 'utf-8');
            await fs.writeFile(path.join(tempSourceDir, 'file2.txt'), 'Tar Content 2', 'utf-8');

            await tar.create(
                { file: tarFilePath, cwd: tempSourceDir },
                ['file1.txt', 'file2.txt']
            );

            let callbackInvoked = false;

            const tmpDir = await extractTar(tarFilePath, async () => {
                callbackInvoked = true;
            });

            expect(callbackInvoked).toBe(true);
            expect(tmpDir).toBeTruthy();

            // Cleanup
            await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        });
    });

    describe('Integration Tests', () => {
        test('should handle zip and tar extraction in sequence', async () => {
            // Create test files
            const tempSourceDir = path.join(testDir, 'source');
            await fs.mkdir(tempSourceDir, { recursive: true });
            await fs.writeFile(path.join(tempSourceDir, 'shared.txt'), 'Shared Content', 'utf-8');

            // Create zip
            const zip = new AdmZip();
            zip.addLocalFile(path.join(tempSourceDir, 'shared.txt'));
            zip.writeZip(zipFilePath);

            // Create tar
            await tar.create(
                { file: tarFilePath, cwd: tempSourceDir },
                ['shared.txt']
            );

            // Extract both
            let zipCallbackInvoked = false;
            let tarCallbackInvoked = false;

            const zipTmpDir = await extractZip(zipFilePath, async () => {
                zipCallbackInvoked = true;
            });

            const tarTmpDir = await extractTar(tarFilePath, async () => {
                tarCallbackInvoked = true;
            });

            // Verify both completed
            expect(zipCallbackInvoked).toBe(true);
            expect(tarCallbackInvoked).toBe(true);
            expect(zipTmpDir).toBeTruthy();
            expect(tarTmpDir).toBeTruthy();
            expect(zipTmpDir).not.toBe(tarTmpDir); // Different temp directories

            // Cleanup
            await fs.rm(zipTmpDir, { recursive: true, force: true }).catch(() => {});
            await fs.rm(tarTmpDir, { recursive: true, force: true }).catch(() => {});
        });

        test('should create unique temp directories for each extraction', async () => {
            const tempSourceDir = path.join(testDir, 'source');
            await fs.mkdir(tempSourceDir, { recursive: true });
            await fs.writeFile(path.join(tempSourceDir, 'test.txt'), 'Test', 'utf-8');

            const zip = new AdmZip();
            zip.addLocalFile(path.join(tempSourceDir, 'test.txt'));
            zip.writeZip(zipFilePath);

            // Extract same zip twice
            const tmpDir1 = await extractZip(zipFilePath, async () => {});
            const tmpDir2 = await extractZip(zipFilePath, async () => {});

            // Should be different directories
            expect(tmpDir1).not.toBe(tmpDir2);

            // Both should exist
            const stats1 = await fs.stat(tmpDir1);
            const stats2 = await fs.stat(tmpDir2);
            expect(stats1.isDirectory()).toBe(true);
            expect(stats2.isDirectory()).toBe(true);

            // Cleanup
            await fs.rm(tmpDir1, { recursive: true, force: true }).catch(() => {});
            await fs.rm(tmpDir2, { recursive: true, force: true }).catch(() => {});
        });
    });
});
