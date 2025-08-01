import * as fs from "fs/promises";
import { archiveExtractCallback, randomTmpDir } from "./utils";
import path from "path";

export async function wrapInDirectory(src: string, target: string, callback: archiveExtractCallback) {
    const tmpDir = randomTmpDir();
    await fs.mkdir(tmpDir);
    await fs.copyFile(src, path.join(tmpDir, target));
    await callback(tmpDir);
    return tmpDir;
}