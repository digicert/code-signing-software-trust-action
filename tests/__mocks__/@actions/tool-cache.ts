/**
 * Mock implementation of @actions/tool-cache
 * Used for testing tool download, extraction, and caching functionality
 */

// Mock state storage
const mockExtractedPaths = new Map<string, string>();
const mockCachedTools = new Map<string, Map<string, string>>(); // toolName -> version -> path
const mockDownloadedFiles = new Map<string, string>();

// Export state for test assertions
export const extractedPaths = mockExtractedPaths;
export const cachedTools = mockCachedTools;
export const downloadedFiles = mockDownloadedFiles;

/**
 * Mock implementation of extractZip
 * Simulates extracting a ZIP archive to a destination directory
 * Creates actual directory structure
 */
export const extractZip = jest.fn(async (file: string, dest?: string): Promise<string> => {
  const fs = require('fs/promises');
  const os = require('os');
  const path = require('path');
  
  const extractPath = dest || path.join(os.tmpdir(), `mock-extract-${Date.now()}-${path.basename(file, '.zip')}`);
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
  
  const extractPath = dest || path.join(os.tmpdir(), `mock-extract-${Date.now()}-${path.basename(file, '.tar.gz')}`);
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
  
  const extractPath = dest || path.join(os.tmpdir(), `mock-extract-${Date.now()}-${path.basename(file, '.7z')}`);
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
  const fileName = url.split('/').pop() || 'download';
  const downloadPath = dest || path.join(tmpDir, `mock-download-${Date.now()}-${fileName}`);
  
  // Create parent directory if needed
  const parentDir = path.dirname(downloadPath);
  await fs.mkdir(parentDir, { recursive: true }).catch(() => {});
  
  // Create empty file (or small mock content)
  await fs.writeFile(downloadPath, `Mock content for ${url}`, 'utf-8');
  
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
  
  const cachePath = path.join(os.tmpdir(), `mock-cache-${tool}-${version}-${Date.now()}`);
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
  
  const cachePath = path.join(os.tmpdir(), `mock-cache-${tool}-${version}-${Date.now()}`);
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
