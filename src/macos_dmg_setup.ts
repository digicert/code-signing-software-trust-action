import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as path from 'path';
import { archiveExtractCallback, randomDirName, rmDir, tmpDir } from './utils';

export async function extractDmg(dmgFile: string, callback: archiveExtractCallback) {
    const volume = path.join('/Volumes', randomDirName());
    core.info(`Mounting DMG file ${dmgFile} to volume ${volume}`)
    await exec.getExecOutput(
        "hdiutil", 
        ["attach", dmgFile, "-mountpoint", volume]
    );

    await callback(volume);

    return volume;
}