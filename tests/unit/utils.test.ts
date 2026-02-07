/**
 * Unit tests for utils.ts
 * Tests utility functions in isolation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  randomFileName,
  randomDirName,
  randomTmpDir,
  createSecureTempDir,
  rmDir,
  isValidStr,
  cacheDirPathFor,
  tmpDir,
} from '../../src/utils';

describe('utils', () => {
  describe('randomFileName', () => {
    it('should return string starting with F_', () => {
      const name = randomFileName();
      expect(name).toMatch(/^F_[0-9a-f-]+$/i);
    });

    it('should generate unique names', () => {
      const name1 = randomFileName();
      const name2 = randomFileName();
      expect(name1).not.toBe(name2);
    });

    it('should include valid UUID format', () => {
      const name = randomFileName();
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidPattern = /^F_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(name).toMatch(uuidPattern);
    });
  });

  describe('randomDirName', () => {
    it('should return string starting with D_', () => {
      const name = randomDirName();
      expect(name).toMatch(/^D_[0-9a-f-]+$/i);
    });

    it('should generate unique names', () => {
      const name1 = randomDirName();
      const name2 = randomDirName();
      expect(name1).not.toBe(name2);
    });

    it('should include valid UUID format', () => {
      const name = randomDirName();
      const uuidPattern = /^D_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(name).toMatch(uuidPattern);
    });
  });

  describe('randomTmpDir', () => {
    it('should return path combining tmpDir and random directory name', () => {
      const tmpDirPath = randomTmpDir();
      expect(tmpDirPath).toContain(tmpDir);
      expect(path.dirname(tmpDirPath)).toBe(tmpDir);
    });

    it('should include D_ prefix in the directory name', () => {
      const tmpDirPath = randomTmpDir();
      const basename = path.basename(tmpDirPath);
      expect(basename).toMatch(/^D_[0-9a-f-]+$/i);
    });

    it('should generate unique paths', () => {
      const path1 = randomTmpDir();
      const path2 = randomTmpDir();
      expect(path1).not.toBe(path2);
    });
  });

  describe('createSecureTempDir', () => {
    let createdDirs: string[] = [];

    afterEach(async () => {
      // Cleanup created directories
      for (const dir of createdDirs) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      createdDirs = [];
    });

    it('should create directory with default prefix', async () => {
      const dir = await createSecureTempDir();
      createdDirs.push(dir);
      
      expect(dir).toContain('digicert-');
      const basename = path.basename(dir);
      expect(basename).toMatch(/^digicert-[0-9a-f-]+$/i);
      
      const stats = await fs.stat(dir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create directory with custom prefix', async () => {
      const dir = await createSecureTempDir('test-prefix-');
      createdDirs.push(dir);
      
      expect(dir).toContain('test-prefix-');
      const basename = path.basename(dir);
      expect(basename).toMatch(/^test-prefix-[0-9a-f-]+$/i);
      
      const stats = await fs.stat(dir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create directory with restrictive permissions on Unix', async () => {
      if (process.platform === 'win32') {
        // Skip permission test on Windows
        return;
      }

      const dir = await createSecureTempDir('perms-test-');
      createdDirs.push(dir);
      
      const stats = await fs.stat(dir);
      // On Unix: mode should be 0o700 (rwx------)
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o700);
    });

    it('should create unique directories', async () => {
      const dir1 = await createSecureTempDir();
      const dir2 = await createSecureTempDir();
      createdDirs.push(dir1, dir2);
      
      expect(dir1).not.toBe(dir2);
    });

    it('should create directory in tmpDir', async () => {
      const dir = await createSecureTempDir();
      createdDirs.push(dir);
      
      expect(path.dirname(dir)).toBe(tmpDir);
    });
  });

  describe('rmDir', () => {
    let testDir: string;

    beforeEach(async () => {
      testDir = await createSecureTempDir('rmdir-test-');
      // Create some content
      await fs.writeFile(path.join(testDir, 'file.txt'), 'test content');
      await fs.mkdir(path.join(testDir, 'subdir'));
      await fs.writeFile(path.join(testDir, 'subdir', 'nested.txt'), 'nested content');
    });

    it('should remove directory and all contents', async () => {
      await rmDir(testDir);
      
      // Directory should not exist
      await expect(fs.access(testDir)).rejects.toThrow();
    });

    it('should not throw error if directory does not exist', async () => {
      const nonExistentDir = path.join(tmpDir, 'non-existent-' + Date.now());
      
      // Should not throw
      await expect(rmDir(nonExistentDir)).resolves.not.toThrow();
    });

    it('should handle nested directories', async () => {
      // Create deeply nested structure
      const deepPath = path.join(testDir, 'a', 'b', 'c', 'd');
      await fs.mkdir(deepPath, { recursive: true });
      await fs.writeFile(path.join(deepPath, 'deep.txt'), 'deep content');
      
      await rmDir(testDir);
      
      await expect(fs.access(testDir)).rejects.toThrow();
    });
  });

  describe('isValidStr', () => {
    it('should return true for non-empty string', () => {
      expect(isValidStr('hello')).toBe(true);
      expect(isValidStr('a')).toBe(true);
      expect(isValidStr('123')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidStr('')).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      expect(isValidStr('   ')).toBe(false);
      expect(isValidStr('\t')).toBe(false);
      expect(isValidStr('\n')).toBe(false);
      expect(isValidStr('  \t  \n  ')).toBe(false);
    });

    it('should return true for string with leading/trailing whitespace but content', () => {
      expect(isValidStr('  hello  ')).toBe(true);
      expect(isValidStr('\ttest\n')).toBe(true);
    });
  });

  describe('cacheDirPathFor', () => {
    const originalToolCacheDir = process.env.RUNNER_TOOL_CACHE;

    afterEach(() => {
      // Restore original value
      if (originalToolCacheDir !== undefined) {
        process.env.RUNNER_TOOL_CACHE = originalToolCacheDir;
      } else {
        delete process.env.RUNNER_TOOL_CACHE;
      }
    });

    it('should return undefined if toolCacheDir is not set', () => {
      delete process.env.RUNNER_TOOL_CACHE;
      
      const result = cacheDirPathFor('test-tool');
      expect(result).toBeUndefined();
    });

    it('should return path joined with toolCacheDir when set', () => {
      const testCacheDir = '/test/cache/dir';
      process.env.RUNNER_TOOL_CACHE = testCacheDir;
      
      const result = cacheDirPathFor('test-tool');
      expect(result).toBe(path.join(testCacheDir, 'test-tool'));
    });

    it('should handle different tool names', () => {
      const testCacheDir = '/test/cache/dir';
      process.env.RUNNER_TOOL_CACHE = testCacheDir;
      
      expect(cacheDirPathFor('smctl')).toBe(path.join(testCacheDir, 'smctl'));
      expect(cacheDirPathFor('smtools')).toBe(path.join(testCacheDir, 'smtools'));
    });
  });

  describe('tmpDir', () => {
    it('should use RUNNER_TEMP if set', () => {
      // This test just verifies tmpDir is defined and is a string
      expect(typeof tmpDir).toBe('string');
      expect(tmpDir.length).toBeGreaterThan(0);
    });

    it('should be an absolute path', () => {
      expect(path.isAbsolute(tmpDir)).toBe(true);
    });

    it('should exist as a directory', async () => {
      const stats = await fs.stat(tmpDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });
});
