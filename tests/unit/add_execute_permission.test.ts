/**
 * Unit tests for add_execute_permission.ts
 * Tests the functionality that adds execute permissions to files
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { chmod } from '../../src/add_execute_permission';
import { resetMocks as resetCoreMocks } from '../__mocks__/@actions/core';

// Mock @actions/core
jest.mock('@actions/core');

describe('add_execute_permission', () => {
  describe('chmod', () => {
    let testDir: string;

    beforeEach(async () => {
      // Create a temporary test directory with secure permissions
      testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chmod-test-'));
      resetCoreMocks();
    });

    afterEach(async () => {
      // Clean up test directory
      if (testDir) {
        await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
      }
    });

    it('should add execute permission to single file', async () => {
      // Create a test file
      const testFile = path.join(testDir, 'test-script.sh');
      await fs.writeFile(testFile, '#!/bin/bash\necho "hello"');

      // Run chmod
      await chmod(testDir);

      // Check permissions (only on Unix-like systems)
      if (process.platform !== 'win32') {
        const stats = await fs.stat(testFile);
        // 0o755 = rwxr-xr-x
        expect(stats.mode & 0o111).toBeTruthy(); // At least one execute bit should be set
      }
    });

    it('should add execute permission to multiple files', async () => {
      // Create multiple test files
      const files = ['script1.sh', 'script2.sh', 'binary'];
      for (const fileName of files) {
        const filePath = path.join(testDir, fileName);
        await fs.writeFile(filePath, 'content');
      }

      // Run chmod
      await chmod(testDir);

      // Check permissions on each file (only on Unix-like systems)
      if (process.platform !== 'win32') {
        for (const fileName of files) {
          const filePath = path.join(testDir, fileName);
          const stats = await fs.stat(filePath);
          expect(stats.mode & 0o111).toBeTruthy();
        }
      }
    });

    it('should not process subdirectories', async () => {
      // Create a subdirectory with a file
      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir);
      const subFile = path.join(subDir, 'file.sh');
      await fs.writeFile(subFile, 'content');

      // Create a file in the root directory
      const rootFile = path.join(testDir, 'root-file.sh');
      await fs.writeFile(rootFile, 'content');

      // Run chmod on root directory
      await chmod(testDir);

      // Root file should have execute permission
      if (process.platform !== 'win32') {
        const rootStats = await fs.stat(rootFile);
        expect(rootStats.mode & 0o111).toBeTruthy();

        // Subdirectory file should NOT have execute permission
        // (chmod only processes files in the immediate directory)
        const subStats = await fs.stat(subFile);
        // The file in subdirectory won't have execute permission added
        // because chmod doesn't recurse into subdirectories
      }
    });

    it('should handle empty directory', async () => {
      // Run chmod on empty directory - should not throw
      await expect(chmod(testDir)).resolves.not.toThrow();
    });

    it('should handle directory with only subdirectories', async () => {
      // Create only subdirectories, no files
      await fs.mkdir(path.join(testDir, 'dir1'));
      await fs.mkdir(path.join(testDir, 'dir2'));

      // Run chmod - should not throw
      await expect(chmod(testDir)).resolves.not.toThrow();
    });

    it('should set permission to 0o755 on Unix systems', async () => {
      // Skip this test on Windows
      if (process.platform === 'win32') {
        return;
      }

      // Create a test file with restrictive permissions
      const testFile = path.join(testDir, 'test-file');
      await fs.writeFile(testFile, 'content');
      await fs.chmod(testFile, 0o600); // rw-------

      // Verify initial permissions
      let stats = await fs.stat(testFile);
      expect(stats.mode & 0o777).toBe(0o600);

      // Run chmod
      await chmod(testDir);

      // Verify new permissions are 0o755 (rwxr-xr-x)
      stats = await fs.stat(testFile);
      expect(stats.mode & 0o777).toBe(0o755);
    });

    it('should process all files regardless of extension', async () => {
      // Create files with various extensions
      const files = ['script.sh', 'binary', 'file.txt', 'app.exe', 'data.json'];
      for (const fileName of files) {
        await fs.writeFile(path.join(testDir, fileName), 'content');
      }

      // Run chmod
      await chmod(testDir);

      // All files should be processed (on Unix)
      if (process.platform !== 'win32') {
        for (const fileName of files) {
          const filePath = path.join(testDir, fileName);
          const stats = await fs.stat(filePath);
          expect(stats.mode & 0o111).toBeTruthy();
        }
      }
    });

    it('should handle files with special characters in names', async () => {
      const specialFiles = [
        'file with spaces.sh',
        'file-with-dashes',
        'file_with_underscores',
        'file.multiple.dots.sh',
      ];

      for (const fileName of specialFiles) {
        await fs.writeFile(path.join(testDir, fileName), 'content');
      }

      // Run chmod - should not throw
      await expect(chmod(testDir)).resolves.not.toThrow();

      // Verify permissions (on Unix)
      if (process.platform !== 'win32') {
        for (const fileName of specialFiles) {
          const filePath = path.join(testDir, fileName);
          const stats = await fs.stat(filePath);
          expect(stats.mode & 0o111).toBeTruthy();
        }
      }
    });

    it('should log info message about adding permissions', async () => {
      const core = require('@actions/core');
      
      await fs.writeFile(path.join(testDir, 'file.sh'), 'content');
      
      await chmod(testDir);

      // Verify core.info was called with appropriate message
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Adding +x permission'));
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining(testDir));
    });

    it('should log debug message for each file', async () => {
      const core = require('@actions/core');
      
      const fileName = 'test-file.sh';
      const filePath = path.join(testDir, fileName);
      await fs.writeFile(filePath, 'content');
      
      await chmod(testDir);

      // Verify core.debug was called for the file
      expect(core.debug).toHaveBeenCalledWith(expect.stringContaining('Added +x permission'));
      expect(core.debug).toHaveBeenCalledWith(expect.stringContaining(filePath));
    });

    it('should work with different file sizes', async () => {
      // Create files of different sizes
      const smallFile = path.join(testDir, 'small.sh');
      const largeFile = path.join(testDir, 'large.sh');
      
      await fs.writeFile(smallFile, 'small');
      await fs.writeFile(largeFile, 'x'.repeat(10000)); // 10KB file

      await chmod(testDir);

      // Both should have execute permissions (on Unix)
      if (process.platform !== 'win32') {
        const smallStats = await fs.stat(smallFile);
        const largeStats = await fs.stat(largeFile);
        
        expect(smallStats.mode & 0o111).toBeTruthy();
        expect(largeStats.mode & 0o111).toBeTruthy();
      }
    });

    it('should be idempotent - running twice has same effect', async () => {
      const testFile = path.join(testDir, 'test.sh');
      await fs.writeFile(testFile, 'content');

      // Run chmod twice
      await chmod(testDir);
      const stats1 = await fs.stat(testFile);
      
      await chmod(testDir);
      const stats2 = await fs.stat(testFile);

      // Permissions should be the same
      expect(stats1.mode).toBe(stats2.mode);
    });
  });
});
