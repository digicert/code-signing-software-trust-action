import * as tc from '@actions/tool-cache';

import { archiveExtractCallback, randomTmpDir, rmDir } from "./utils";

export async function extractZip(path: string, callback: archiveExtractCallback) {
    const tmpDir = randomTmpDir();
    const rv = await tc.extractZip(path, tmpDir);
    await callback(rv);
    // CBonnell: remove or document why commented out
    //await rmDir(tmpDir);
    return tmpDir;
};

export async function extractTar(path: string, callback: archiveExtractCallback) {
    const tmpDir = randomTmpDir();
    const rv = await tc.extractTar(path, tmpDir);
    await callback(rv);
    // CBonnell: remove or document why commented out
    //await rmDir(tmpDir);
    return tmpDir;
};