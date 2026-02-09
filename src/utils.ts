import * as core from '@actions/core';
import * as fs from "fs/promises";
import * as crypto from 'crypto';
import { tmpdir } from "os";
import path from "path";

export enum RunnerType {
    GITHUB_RUNNER = "GITHUB_RUNNER",
    SELF_HOSTED = "SELF_HOSTED",
};

export type archiveExtractCallback = (dest: string) => Promise<void>;

export const tmpDir = process.env['RUNNER_TEMP'] ||  tmpdir();
export const isSelfHosted =  
    (process.env['RUNNER_ENVIRONMENT'] !== 'github-hosted') && 
    (process.env['AGENT_ISSELFHOSTED'] === '1' || process.env['AGENT_ISSELFHOSTED'] === undefined);

export const randomFileName = (): string => `F_${crypto.randomUUID()}`;
export const randomDirName  = (): string => `D_${crypto.randomUUID()}`;

export const randomTmpDir = (): string => path.join(tmpDir, randomDirName());

/**
 * Creates a secure temporary directory with restricted permissions.
 * This mitigates security risks associated with predictable temporary file creation
 * by using a cryptographically random UUID and setting restrictive permissions.
 * 
 * Addresses CWE-377: Insecure Temporary File
 * @see https://cwe.mitre.org/data/definitions/377.html
 * 
 * @param prefix - Optional prefix for the directory name (default: 'digicert-')
 * @returns Promise<string> - The absolute path to the created secure temporary directory
 * @throws Error if directory creation fails
 */
export const createSecureTempDir = async (prefix: string = 'digicert-'): Promise<string> => {
    const uniqueTempDir = path.join(tmpDir, `${prefix}${crypto.randomUUID()}`);
    await fs.mkdir(uniqueTempDir, { mode: 0o700, recursive: true });
    return uniqueTempDir;
};

export async function rmDir(path: string) {
    await fs.rm(path, {force: true, recursive: true}).catch(reason => {
        core.warning(`Failed to remove ${path}. Reason: ${reason}`);
    });
};

export const runnerType = isSelfHosted ? RunnerType.SELF_HOSTED : RunnerType.GITHUB_RUNNER;

export const cacheDirPathFor = (name: string): string | undefined => {
    const toolCacheDir = process.env['RUNNER_TOOL_CACHE'];
    return !toolCacheDir ? undefined : path.join(toolCacheDir, name);
}

export const isValidStr = (val: string): boolean => val.trim().length > 0 ? true : false;

/**
 * Calculate SHA-256 checksum of a file.
 * Used to verify integrity of downloaded binaries to prevent supply chain attacks.
 * 
 * @param filePath - Absolute path to the file to hash
 * @returns Promise<string> - The SHA-256 checksum in lowercase hexadecimal format
 * @throws Error if file cannot be read
 */
export async function calculateSHA256(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex').toLowerCase();
}

/**
 * Retry configuration for download operations.
 * Implements exponential backoff to handle transient network failures.
 */
export interface RetryConfig {
    /** Maximum number of retry attempts (default: 3) */
    maxAttempts?: number;
    /** Initial delay in milliseconds before first retry (default: 1000ms) */
    initialDelayMs?: number;
    /** Multiplier for exponential backoff (default: 2) */
    backoffMultiplier?: number;
    /** Maximum delay between retries in milliseconds (default: 30000ms = 30s) */
    maxDelayMs?: number;
}

/**
 * Executes an async operation with exponential backoff retry logic.
 * Useful for handling transient network failures during CDN downloads.
 * 
 * @param operation - Async function to execute (should be idempotent)
 * @param operationName - Human-readable name for logging
 * @param config - Retry configuration
 * @returns Promise<T> - Result of the operation
 * @throws Error - The last error encountered if all retries fail
 * 
 * @example
 * const result = await retryWithBackoff(
 *   async () => await tc.downloadTool(url),
 *   'Download smctl',
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: RetryConfig = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        initialDelayMs = 1000,
        backoffMultiplier = 2,
        maxDelayMs = 30000
    } = config;

    let lastError: Error | undefined;
    let delayMs = initialDelayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            core.debug(`[Attempt ${attempt}/${maxAttempts}] ${operationName}`);
            const result = await operation();
            
            if (attempt > 1) {
                core.info(`✓ ${operationName} succeeded on attempt ${attempt}/${maxAttempts}`);
            }
            
            return result;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            if (attempt < maxAttempts) {
                core.warning(
                    `⚠ ${operationName} failed (attempt ${attempt}/${maxAttempts}): ${lastError.message}`
                );
                core.info(`Retrying in ${delayMs}ms with exponential backoff...`);
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, delayMs));
                
                // Exponential backoff with cap
                delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
            } else {
                core.error(
                    `✗ ${operationName} failed after ${maxAttempts} attempts: ${lastError.message}`
                );
            }
        }
    }

    throw lastError || new Error(`${operationName} failed after ${maxAttempts} attempts`);
}
