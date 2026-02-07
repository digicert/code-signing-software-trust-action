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
