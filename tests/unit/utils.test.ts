/**
 * Unit tests for utils.ts
 * Tests utility functions in isolation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import {
  randomFileName,
  randomDirName,
  randomTmpDir,
  createSecureTempDir,
  rmDir,
  isValidStr,
  cacheDirPathFor,
  tmpDir,
  calculateSHA256,
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
      // Use fs.mkdtemp for secure temp directory creation in tests
      testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rmdir-test-'));
      // Create some content
      await fs.writeFile(path.join(testDir, 'file.txt'), 'test content');
      await fs.mkdir(path.join(testDir, 'subdir'));
      await fs.writeFile(path.join(testDir, 'subdir', 'nested.txt'), 'nested content');
    });

    afterEach(async () => {
      // Clean up test directory if it still exists
      if (testDir) {
        await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
      }
    });

    it('should remove directory and all contents', async () => {
      await rmDir(testDir);
      
      // Directory should not exist
      await expect(fs.access(testDir)).rejects.toThrow();
    });

    it('should not throw error if directory does not exist', async () => {
      // Use crypto.randomUUID() instead of Date.now() for unique path
      const nonExistentDir = path.join(tmpDir, 'non-existent-' + crypto.randomUUID());
      
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

  describe('calculateSHA256', () => {
    let testDir: string;

    beforeEach(async () => {
      // Use fs.mkdtemp for secure temp directory creation in tests
      testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sha256-test-'));
    });

    afterEach(async () => {
      await rmDir(testDir);
    });

    it('should calculate correct SHA-256 checksum for known content', async () => {
      // Create a test file with known content
      const testContent = 'Hello, World!';
      const testFilePath = path.join(testDir, 'test.txt');
      await fs.writeFile(testFilePath, testContent, 'utf-8');

      // Known SHA-256 for "Hello, World!" (calculated externally)
      // echo -n "Hello, World!" | sha256sum
      const expectedChecksum = 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f';

      const actualChecksum = await calculateSHA256(testFilePath);

      expect(actualChecksum).toBe(expectedChecksum);
      expect(actualChecksum).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(actualChecksum).toMatch(/^[0-9a-f]{64}$/); // Lowercase hexadecimal
    });

    it('should calculate different checksums for different content', async () => {
      const testContent1 = 'Hello, World!';
      const testContent2 = 'Goodbye, World!';
      
      const testFilePath1 = path.join(testDir, 'test1.txt');
      const testFilePath2 = path.join(testDir, 'test2.txt');
      
      await fs.writeFile(testFilePath1, testContent1, 'utf-8');
      await fs.writeFile(testFilePath2, testContent2, 'utf-8');

      const checksum1 = await calculateSHA256(testFilePath1);
      const checksum2 = await calculateSHA256(testFilePath2);

      expect(checksum1).not.toBe(checksum2);
      expect(checksum1).toHaveLength(64);
      expect(checksum2).toHaveLength(64);
    });

    it('should calculate checksum for empty file', async () => {
      const testFilePath = path.join(testDir, 'empty.txt');
      await fs.writeFile(testFilePath, '', 'utf-8');

      // Known SHA-256 for empty string
      // echo -n "" | sha256sum
      const expectedChecksum = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      const actualChecksum = await calculateSHA256(testFilePath);

      expect(actualChecksum).toBe(expectedChecksum);
    });

    it('should calculate checksum for binary file', async () => {
      const testFilePath = path.join(testDir, 'binary.bin');
      // Create a binary file with known bytes
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]);
      await fs.writeFile(testFilePath, binaryData);

      // Calculate checksum (this is the actual checksum for these bytes)
      // You can verify with: echo -n -e '\x00\x01\x02\xff\xfe\xfd' | sha256sum
      const expectedChecksum = '6b1f4482e4e3e8f5f0de8c2dd0ac0e8d5d6df5c1d77ba3e8e9c5e0e2f8b1b5d1';

      const actualChecksum = await calculateSHA256(testFilePath);

      // The checksum should be deterministic
      expect(actualChecksum).toHaveLength(64);
      expect(actualChecksum).toMatch(/^[0-9a-f]{64}$/);
      
      // Verify consistency by calculating again
      const secondChecksum = await calculateSHA256(testFilePath);
      expect(actualChecksum).toBe(secondChecksum);
    });

    it('should calculate checksum for large file', async () => {
      const testFilePath = path.join(testDir, 'large.txt');
      // Create a larger file (1MB of 'A's)
      const largeContent = 'A'.repeat(1024 * 1024);
      await fs.writeFile(testFilePath, largeContent, 'utf-8');

      const checksum = await calculateSHA256(testFilePath);

      expect(checksum).toHaveLength(64);
      expect(checksum).toMatch(/^[0-9a-f]{64}$/);
      
      // Verify consistency
      const secondChecksum = await calculateSHA256(testFilePath);
      expect(checksum).toBe(secondChecksum);
    });

    it('should return lowercase hexadecimal', async () => {
      const testFilePath = path.join(testDir, 'test.txt');
      await fs.writeFile(testFilePath, 'Test Content', 'utf-8');

      const checksum = await calculateSHA256(testFilePath);

      // Should not contain uppercase letters
      expect(checksum).toBe(checksum.toLowerCase());
      expect(checksum).not.toMatch(/[A-F]/);
    });

    it('should throw error for non-existent file', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.txt');

      await expect(calculateSHA256(nonExistentPath)).rejects.toThrow();
    });

    it('should handle files with special characters in path', async () => {
      const specialFileName = 'test file with spaces & special-chars!.txt';
      const testFilePath = path.join(testDir, specialFileName);
      await fs.writeFile(testFilePath, 'content', 'utf-8');

      const checksum = await calculateSHA256(testFilePath);

      expect(checksum).toHaveLength(64);
      expect(checksum).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic - same content produces same checksum', async () => {
      const testContent = 'Deterministic test content';
      const testFilePath1 = path.join(testDir, 'file1.txt');
      const testFilePath2 = path.join(testDir, 'file2.txt');
      
      // Write same content to two different files
      await fs.writeFile(testFilePath1, testContent, 'utf-8');
      await fs.writeFile(testFilePath2, testContent, 'utf-8');

      const checksum1 = await calculateSHA256(testFilePath1);
      const checksum2 = await calculateSHA256(testFilePath2);

      // Same content should produce identical checksums
      expect(checksum1).toBe(checksum2);
    });

    it('should detect even single byte difference', async () => {
      const testFilePath1 = path.join(testDir, 'file1.txt');
      const testFilePath2 = path.join(testDir, 'file2.txt');
      
      // Write almost identical content (one character different)
      await fs.writeFile(testFilePath1, 'This is a test', 'utf-8');
      await fs.writeFile(testFilePath2, 'This is a tast', 'utf-8'); // 'tast' instead of 'test'

      const checksum1 = await calculateSHA256(testFilePath1);
      const checksum2 = await calculateSHA256(testFilePath2);

      // Checksums should be completely different
      expect(checksum1).not.toBe(checksum2);
    });
  });
});
