/**
 * Mock implementation of @actions/tool-cache
 * Used for testing tool download, extraction, and caching functionality
 * 
 * SECURITY NOTE: All input sanitization functions are included to prevent
 * CodeQL security warnings about path traversal vulnerabilities in test code.
 * While these are mocks for testing purposes, we sanitize inputs to demonstrate
 * security best practices and prevent any potential exploitation through test data.
 */

import * as path from 'path';

// Mock state storage
const mockExtractedPaths = new Map<string, string>();
const mockCachedTools = new Map<string, Map<string, string>>(); // toolName -> version -> path
const mockDownloadedFiles = new Map<string, string>();

// Export state for test assertions
export const extractedPaths = mockExtractedPaths;
export const cachedTools = mockCachedTools;
export const downloadedFiles = mockDownloadedFiles;

/**
 * SECURITY NOTE: All path-related inputs (URLs, file names, tool names, versions) 
 * are sanitized using path.basename() to prevent path traversal vulnerabilities (CWE-22).
 * 
 * CodeQL recognizes path.basename() as a proper sanitization barrier. We apply it
 * directly at the point of use rather than in a separate function to ensure CodeQL's
 * dataflow analysis properly recognizes the sanitization.
 * 
 * Pattern used throughout:
 *   path.basename(untrustedInput.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'))
 * 
 * This removes:
 * - Path traversal sequences (.., /.., \..) via .replace(/\.\./g, '')
 * - Special characters (<>:"|?*) via .replace(/[<>:"|?*]/g, '_')
 * - Any remaining directory components via path.basename()
 */

/**
 * Mock implementation of extractZip
 * Simulates extracting a ZIP archive to a destination directory
 * Creates actual directory structure
 */
export const extractZip = jest.fn(async (file: string, dest?: string): Promise<string> => {
  const fs = require('fs/promises');
  const os = require('os');
  const path = require('path');
  
  // SECURITY: Use path.basename() directly to prevent path traversal (CWE-22)
  const safeBasename = path.basename(file.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'), '.zip');
  // SECURITY: Sanitize dest parameter to prevent path traversal through test data
  const safeDest = dest ? path.join(os.tmpdir(), path.basename(dest.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'))) : path.join(os.tmpdir(), `mock-extract-${Date.now()}-${safeBasename}`);
  const extractPath = safeDest;
  await fs.mkdir(extractPath, { recursive: true });
  
  mockExtractedPaths.set(file, extractPath);
  return extractPath;
});

/**
 * Mock implementation of extractTar
 * Simulates extracting a TAR archive to a destination directory
 * Creates actual directory structure
 */
export const extractTar = jest.fn(async (file: string, dest?: string, flags?: string | string[]): Promise<string> => {
  const fs = require('fs/promises');
  const os = require('os');
  const path = require('path');
  
  // SECURITY: Use path.basename() directly to prevent path traversal (CWE-22)
  const safeBasename = path.basename(file.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'), '.tar.gz');
  // SECURITY: Sanitize dest parameter to prevent path traversal through test data
  const safeDest = dest ? path.join(os.tmpdir(), path.basename(dest.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'))) : path.join(os.tmpdir(), `mock-extract-${Date.now()}-${safeBasename}`);
  const extractPath = safeDest;
  await fs.mkdir(extractPath, { recursive: true });
  
  mockExtractedPaths.set(file, extractPath);
  return extractPath;
});

/**
 * Mock implementation of extract7z
 * Simulates extracting a 7z archive to a destination directory
 * Creates actual directory structure
 */
export const extract7z = jest.fn(async (file: string, dest?: string): Promise<string> => {
  const fs = require('fs/promises');
  const os = require('os');
  const path = require('path');
  
  // SECURITY: Use path.basename() directly to prevent path traversal (CWE-22)
  const safeBasename = path.basename(file.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'), '.7z');
  // SECURITY: Sanitize dest parameter to prevent path traversal through test data
  const safeDest = dest ? path.join(os.tmpdir(), path.basename(dest.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'))) : path.join(os.tmpdir(), `mock-extract-${Date.now()}-${safeBasename}`);
  const extractPath = safeDest;
  await fs.mkdir(extractPath, { recursive: true });
  
  mockExtractedPaths.set(file, extractPath);
  return extractPath;
});

/**
 * Mock implementation of downloadTool
 * Simulates downloading a file from a URL
 * Creates an actual temporary file so copyFile and other operations work
 */
export const downloadTool = jest.fn(async (url: string, dest?: string): Promise<string> => {
  const fs = require('fs/promises');
  const os = require('os');
  const path = require('path');
  
  // Create actual temp file
  const tmpDir = os.tmpdir();
  // SECURITY FIX: Use path.basename() directly to prevent path traversal (CWE-22)
  // CodeQL recognizes path.basename() as a sanitization barrier
  // Safe: path.basename('../../etc/passwd') => 'passwd' (no directory traversal)
  const safeFileName = path.basename(url.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'));
  // SECURITY: Sanitize dest parameter as well to prevent path traversal through test data
  const safeDest = dest ? path.join(tmpDir, path.basename(dest.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'))) : path.join(tmpDir, `mock-download-${Date.now()}-${safeFileName}`);
  const downloadPath = safeDest;
  
  // Create parent directory if needed
  const parentDir = path.dirname(downloadPath);
  await fs.mkdir(parentDir, { recursive: true }).catch(() => {});
  
  // Create empty file (or small mock content)
  await fs.writeFile(downloadPath, 'Mock download content', 'utf-8');
  
  mockDownloadedFiles.set(url, downloadPath);
  return downloadPath;
});

/**
 * Mock implementation of cacheDir
 * Simulates caching a directory for a tool
 * Creates actual cache directory
 */
export const cacheDir = jest.fn(async (sourceDir: string, tool: string, version: string): Promise<string> => {
  const fs = require('fs/promises');
  const os = require('os');
  const path = require('path');
  
  // SECURITY: Use path.basename() directly to prevent path traversal (CWE-22)
  const safeTool = path.basename(tool.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'));
  const safeVersion = path.basename(version.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'));
  const cachePath = path.join(os.tmpdir(), `mock-cache-${safeTool}-${safeVersion}-${Date.now()}`);
  await fs.mkdir(cachePath, { recursive: true });
  
  if (!mockCachedTools.has(tool)) {
    mockCachedTools.set(tool, new Map());
  }
  mockCachedTools.get(tool)!.set(version, cachePath);
  return cachePath;
});

/**
 * Mock implementation of cacheFile
 * Simulates caching a single file for a tool
 * Creates actual cache directory
 */
export const cacheFile = jest.fn(async (sourceFile: string, targetFile: string, tool: string, version: string): Promise<string> => {
  const fs = require('fs/promises');
  const os = require('os');
  const path = require('path');
  
  // SECURITY: Use path.basename() directly to prevent path traversal (CWE-22)
  const safeTool = path.basename(tool.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'));
  const safeVersion = path.basename(version.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_'));
  const cachePath = path.join(os.tmpdir(), `mock-cache-${safeTool}-${safeVersion}-${Date.now()}`);
  await fs.mkdir(cachePath, { recursive: true });
  
  if (!mockCachedTools.has(tool)) {
    mockCachedTools.set(tool, new Map());
  }
  mockCachedTools.get(tool)!.set(version, cachePath);
  return cachePath;
});

/**
 * Mock implementation of find
 * Simulates finding a cached tool by name and version
 */
export const find = jest.fn((toolName: string, versionSpec: string, arch?: string): string => {
  const versions = mockCachedTools.get(toolName);
  if (versions && versions.has(versionSpec)) {
    return versions.get(versionSpec)!;
  }
  return '';
});

/**
 * Mock implementation of findAllVersions
 * Returns all cached versions of a tool
 */
export const findAllVersions = jest.fn((toolName: string, arch?: string): string[] => {
  const versions = mockCachedTools.get(toolName);
  if (versions) {
    return Array.from(versions.keys());
  }
  return [];
});

/**
 * Reset all mocks and clear mock state
 * Call this in beforeEach or afterEach hooks
 */
export function resetMocks() {
  extractZip.mockClear();
  extractTar.mockClear();
  extract7z.mockClear();
  downloadTool.mockClear();
  cacheDir.mockClear();
  cacheFile.mockClear();
  find.mockClear();
  findAllVersions.mockClear();
  
  mockExtractedPaths.clear();
  mockCachedTools.clear();
  mockDownloadedFiles.clear();
}

/**
 * Get the extracted path for a given file (for testing assertions)
 */
export function getExtractedPath(file: string): string | undefined {
  return mockExtractedPaths.get(file);
}

/**
 * Get the downloaded path for a given URL (for testing assertions)
 */
export function getDownloadedPath(url: string): string | undefined {
  return mockDownloadedFiles.get(url);
}

/**
 * Manually set a cached tool (useful for testing cache hits)
 */
export function setCachedTool(toolName: string, version: string, path: string): void {
  if (!mockCachedTools.has(toolName)) {
    mockCachedTools.set(toolName, new Map());
  }
  mockCachedTools.get(toolName)!.set(version, path);
}
