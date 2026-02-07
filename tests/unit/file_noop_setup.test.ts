/**
 * Unit tests for file_noop_setup.ts
 * Tests the wrapInDirectory functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { wrapInDirectory } from '../../src/file_noop_setup';
import { createSecureTempDir, rmDir } from '../../src/utils';

describe('file_noop_setup', () => {
  describe('wrapInDirectory', () => {
    let testDir: string;
    let sourceFile: string;

    beforeEach(async () => {
      // Create a temporary test directory and a source file
      testDir = await createSecureTempDir('noop-test-');
      sourceFile = path.join(testDir, 'source-file.txt');
      await fs.writeFile(sourceFile, 'test content');
    });

    afterEach(async () => {
      // Clean up test directory
      if (testDir) {
        await rmDir(testDir);
      }
    });

    it('should create directory and copy file with target name', async () => {
      const targetName = 'target-file.txt';
      const callback = jest.fn(async (dirPath: string) => {
        // Verify directory exists
        const stats = await fs.stat(dirPath);
        expect(stats.isDirectory()).toBe(true);

        // Verify file was copied with target name
        const targetPath = path.join(dirPath, targetName);
        const fileExists = await fs.access(targetPath).then(() => true).catch(() => false);
        expect(fileExists).toBe(true);

        // Verify content matches
        const content = await fs.readFile(targetPath, 'utf-8');
        expect(content).toBe('test content');
      });

      const resultDir = await wrapInDirectory(sourceFile, targetName, callback);

      // Verify callback was called
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(resultDir);

      // Verify returned directory exists
      const stats = await fs.stat(resultDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create unique directory each time', async () => {
      const targetName = 'file.txt';
      const callback = jest.fn(async () => {});

      const dir1 = await wrapInDirectory(sourceFile, targetName, callback);
      const dir2 = await wrapInDirectory(sourceFile, targetName, callback);

      // Directories should be different
      expect(dir1).not.toBe(dir2);

      // Both should exist
      const stats1 = await fs.stat(dir1);
      const stats2 = await fs.stat(dir2);
      expect(stats1.isDirectory()).toBe(true);
      expect(stats2.isDirectory()).toBe(true);

      // Clean up the extra directories
      await rmDir(dir1);
      await rmDir(dir2);
    });

    it('should handle different target file names', async () => {
      const targetNames = ['app.exe', 'script.sh', 'data.json', 'file-with-dash.txt'];
      const callback = jest.fn(async () => {});

      for (const targetName of targetNames) {
        const resultDir = await wrapInDirectory(sourceFile, targetName, callback);

        const targetPath = path.join(resultDir, targetName);
        const exists = await fs.access(targetPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);

        await rmDir(resultDir);
      }
    });

    it('should preserve file content during copy', async () => {
      const specialContent = 'Special content with\nmultiple lines\nand special chars: !@#$%^&*()';
      const sourceFileSpecial = path.join(testDir, 'special.txt');
      await fs.writeFile(sourceFileSpecial, specialContent);

      const targetName = 'copied-special.txt';
      const callback = jest.fn(async () => {});

      const resultDir = await wrapInDirectory(sourceFileSpecial, targetName, callback);

      const targetPath = path.join(resultDir, targetName);
      const copiedContent = await fs.readFile(targetPath, 'utf-8');
      expect(copiedContent).toBe(specialContent);

      await rmDir(resultDir);
    });

    it('should copy binary files correctly', async () => {
      // Create a binary file with specific bytes
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);
      const binaryFile = path.join(testDir, 'binary.bin');
      await fs.writeFile(binaryFile, binaryData);

      const targetName = 'copied-binary.bin';
      const callback = jest.fn(async () => {});

      const resultDir = await wrapInDirectory(binaryFile, targetName, callback);

      const targetPath = path.join(resultDir, targetName);
      const copiedData = await fs.readFile(targetPath);
      expect(copiedData).toEqual(binaryData);

      await rmDir(resultDir);
    });

    it('should invoke callback with created directory path', async () => {
      const targetName = 'file.txt';
      let callbackInvokedWith: string | null = null;

      const callback = jest.fn(async (dirPath: string) => {
        callbackInvokedWith = dirPath;
      });

      const resultDir = await wrapInDirectory(sourceFile, targetName, callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callbackInvokedWith).toBe(resultDir);
    });

    it('should await callback completion', async () => {
      const targetName = 'file.txt';
      let callbackCompleted = false;

      const callback = jest.fn(async (dirPath: string) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        callbackCompleted = true;
      });

      await wrapInDirectory(sourceFile, targetName, callback);

      expect(callbackCompleted).toBe(true);
    });

    it('should propagate callback errors', async () => {
      const targetName = 'file.txt';
      const errorMessage = 'Callback processing error';

      const callback = jest.fn(async () => {
        throw new Error(errorMessage);
      });

      await expect(wrapInDirectory(sourceFile, targetName, callback)).rejects.toThrow(errorMessage);
    });

    it('should handle large files', async () => {
      // Create a larger file (1MB)
      const largeContent = 'x'.repeat(1024 * 1024);
      const largeFile = path.join(testDir, 'large.txt');
      await fs.writeFile(largeFile, largeContent);

      const targetName = 'large-copy.txt';
      const callback = jest.fn(async () => {});

      const resultDir = await wrapInDirectory(largeFile, targetName, callback);

      const targetPath = path.join(resultDir, targetName);
      const copiedContent = await fs.readFile(targetPath, 'utf-8');
      expect(copiedContent.length).toBe(largeContent.length);
      expect(copiedContent).toBe(largeContent);

      await rmDir(resultDir);
    });

    it('should handle special characters in target name', async () => {
      const specialNames = [
        'file with spaces.txt',
        'file-with-dashes.txt',
        'file_with_underscores.txt',
        'file.multiple.dots.txt',
      ];

      const callback = jest.fn(async () => {});

      for (const targetName of specialNames) {
        const resultDir = await wrapInDirectory(sourceFile, targetName, callback);

        const targetPath = path.join(resultDir, targetName);
        const exists = await fs.access(targetPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);

        await rmDir(resultDir);
      }
    });

    it('should fail gracefully if source file does not exist', async () => {
      const nonExistentFile = path.join(testDir, 'does-not-exist.txt');
      const targetName = 'target.txt';
      const callback = jest.fn(async () => {});

      await expect(wrapInDirectory(nonExistentFile, targetName, callback)).rejects.toThrow();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return temp directory path starting with D_', async () => {
      const targetName = 'file.txt';
      const callback = jest.fn(async () => {});

      const resultDir = await wrapInDirectory(sourceFile, targetName, callback);

      // The directory name should contain D_ prefix (from randomDirName)
      const dirName = path.basename(resultDir);
      expect(dirName).toMatch(/^D_/);

      await rmDir(resultDir);
    });

    it('should maintain file permissions on Unix systems', async () => {
      // Skip on Windows
      if (process.platform === 'win32') {
        return;
      }

      // Create a file with specific permissions
      const execFile = path.join(testDir, 'executable.sh');
      await fs.writeFile(execFile, '#!/bin/bash\necho "test"');
      await fs.chmod(execFile, 0o755);

      const targetName = 'copied-exec.sh';
      const callback = jest.fn(async () => {});

      const resultDir = await wrapInDirectory(execFile, targetName, callback);

      const targetPath = path.join(resultDir, targetName);
      const stats = await fs.stat(targetPath);
      
      // File should exist
      expect(stats.isFile()).toBe(true);

      await rmDir(resultDir);
    });

    it('should create directory even if callback is simple', async () => {
      const targetName = 'file.txt';
      const simpleCallback = async (_: string) => {
        // Do nothing
      };

      const resultDir = await wrapInDirectory(sourceFile, targetName, simpleCallback);

      const stats = await fs.stat(resultDir);
      expect(stats.isDirectory()).toBe(true);

      const targetPath = path.join(resultDir, targetName);
      const fileExists = await fs.access(targetPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      await rmDir(resultDir);
    });
  });
});
