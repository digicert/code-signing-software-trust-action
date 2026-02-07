/**
 * Unit tests for directory_walk_recursive.ts
 * Tests the recursive directory traversal functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { walk } from '../../src/directory_walk_recursive';
import { createSecureTempDir, rmDir } from '../../src/utils';

describe('directory_walk_recursive', () => {
  describe('walk', () => {
    let testDir: string;

    beforeEach(async () => {
      // Create a temporary test directory
      testDir = await createSecureTempDir('walk-test-');
    });

    afterEach(async () => {
      // Clean up test directory
      if (testDir) {
        await rmDir(testDir);
      }
    });

    it('should return empty array for empty directory', async () => {
      const result = await walk(testDir);
      expect(result).toEqual([]);
    });

    it('should list files in directory with [F] prefix', async () => {
      // Create test files
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.js');
      await fs.writeFile(file1, 'content1');
      await fs.writeFile(file2, 'content2');

      const result = await walk(testDir);
      
      expect(result).toHaveLength(2);
      expect(result).toContain(`[F]${file1}`);
      expect(result).toContain(`[F]${file2}`);
    });

    it('should list directories with [D] prefix', async () => {
      // Create test directory
      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir);

      const result = await walk(testDir);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(`[D]${subDir}`);
    });

    it('should recursively walk nested directories', async () => {
      // Create nested structure:
      // testDir/
      //   file1.txt
      //   subdir1/
      //     file2.txt
      //     subdir2/
      //       file3.txt

      const file1 = path.join(testDir, 'file1.txt');
      await fs.writeFile(file1, 'content1');

      const subDir1 = path.join(testDir, 'subdir1');
      await fs.mkdir(subDir1);
      const file2 = path.join(subDir1, 'file2.txt');
      await fs.writeFile(file2, 'content2');

      const subDir2 = path.join(subDir1, 'subdir2');
      await fs.mkdir(subDir2);
      const file3 = path.join(subDir2, 'file3.txt');
      await fs.writeFile(file3, 'content3');

      const result = await walk(testDir);

      // Should have: file1, subdir1, file2, subdir2, file3
      expect(result).toHaveLength(5);
      expect(result).toContain(`[F]${file1}`);
      expect(result).toContain(`[D]${subDir1}`);
      expect(result).toContain(`[F]${file2}`);
      expect(result).toContain(`[D]${subDir2}`);
      expect(result).toContain(`[F]${file3}`);
    });

    it('should maintain correct order (directories before their contents)', async () => {
      // Create structure
      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir);
      const file = path.join(subDir, 'file.txt');
      await fs.writeFile(file, 'content');

      const result = await walk(testDir);

      // Directory should appear before its contents
      const dirIndex = result.indexOf(`[D]${subDir}`);
      const fileIndex = result.indexOf(`[F]${file}`);
      expect(dirIndex).toBeGreaterThanOrEqual(0);
      expect(fileIndex).toBeGreaterThanOrEqual(0);
      expect(dirIndex).toBeLessThan(fileIndex);
    });

    it('should handle mix of files and directories', async () => {
      // Create mixed structure
      await fs.writeFile(path.join(testDir, 'root-file.txt'), 'root');
      
      const dir1 = path.join(testDir, 'dir1');
      await fs.mkdir(dir1);
      await fs.writeFile(path.join(dir1, 'file1.txt'), 'content1');
      
      const dir2 = path.join(testDir, 'dir2');
      await fs.mkdir(dir2);
      await fs.writeFile(path.join(dir2, 'file2.txt'), 'content2');

      const result = await walk(testDir);

      // Should have 5 entries total
      expect(result).toHaveLength(5);
      
      // Count directories and files
      const directories = result.filter(entry => entry.startsWith('[D]'));
      const files = result.filter(entry => entry.startsWith('[F]'));
      
      expect(directories).toHaveLength(2);
      expect(files).toHaveLength(3);
    });

    it('should handle non-existent directory gracefully', async () => {
      const nonExistentDir = path.join(testDir, 'does-not-exist');
      
      // Should not throw, but return empty array due to error handling
      const result = await walk(nonExistentDir);
      expect(result).toEqual([]);
    });

    it('should handle deeply nested directories', async () => {
      // Create deeply nested structure
      let currentDir = testDir;
      const depth = 5;
      const dirs = [];

      for (let i = 0; i < depth; i++) {
        currentDir = path.join(currentDir, `level-${i}`);
        dirs.push(currentDir);
        await fs.mkdir(currentDir);
      }

      // Add a file at the deepest level
      const deepFile = path.join(currentDir, 'deep-file.txt');
      await fs.writeFile(deepFile, 'deep content');

      const result = await walk(testDir);

      // Should have all directories + the file
      expect(result).toHaveLength(depth + 1);
      
      // Verify all directories are listed
      dirs.forEach(dir => {
        expect(result).toContain(`[D]${dir}`);
      });
      
      // Verify the file is listed
      expect(result).toContain(`[F]${deepFile}`);
    });

    it('should handle special characters in filenames', async () => {
      // Create files with special characters
      const specialFiles = [
        'file with spaces.txt',
        'file-with-dashes.txt',
        'file_with_underscores.txt',
        'file.multiple.dots.txt',
      ];

      for (const fileName of specialFiles) {
        await fs.writeFile(path.join(testDir, fileName), 'content');
      }

      const result = await walk(testDir);

      expect(result).toHaveLength(specialFiles.length);
      specialFiles.forEach(fileName => {
        const filePath = path.join(testDir, fileName);
        expect(result).toContain(`[F]${filePath}`);
      });
    });

    it('should handle empty subdirectories', async () => {
      // Create empty subdirectories
      const emptyDir1 = path.join(testDir, 'empty1');
      const emptyDir2 = path.join(testDir, 'empty2');
      await fs.mkdir(emptyDir1);
      await fs.mkdir(emptyDir2);

      const result = await walk(testDir);

      // Should list the directories even if empty
      expect(result).toHaveLength(2);
      expect(result).toContain(`[D]${emptyDir1}`);
      expect(result).toContain(`[D]${emptyDir2}`);
    });
  });
});
