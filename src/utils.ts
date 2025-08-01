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
export const toolCacheDir = process.env['RUNNER_TOOL_CACHE'];
export const isSelfHosted =  
    (process.env['RUNNER_ENVIRONMENT'] !== 'github-hosted') && 
    (process.env['AGENT_ISSELFHOSTED'] === '1' || process.env['AGENT_ISSELFHOSTED'] === undefined);

export const randomFileName = (): string => `F_${crypto.randomUUID()}`;
export const randomDirName  = (): string => `D_${crypto.randomUUID()}`;

export const randomTmpDir = (): string => path.join(tmpDir, randomDirName());

export async function rmDir(path: string) {
    await fs.rm(path, {force: true, recursive: true}).catch(reason => {
        core.warning(`Failed to remove ${path}. Reason: ${reason}`);
    });
};

export const runnerType = isSelfHosted ? RunnerType.SELF_HOSTED : RunnerType.GITHUB_RUNNER;

export const cacheDirPathFor = (name: string): string | any => {
    return !toolCacheDir ? toolCacheDir : path.join(toolCacheDir, name);
}

export const isValidStr = (val: string): boolean => val.trim().length > 0 ? true : false;
