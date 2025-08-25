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

    // CBonnell: this commented-out code should be removed, or a comment added explaining why it's commented out
    // core.info(`Unmounting volume ${volume}`)
    // await exec.getExecOutput(
    //     "hdiutil", 
    //     ["detach", volume]
    // ).then(rv => {
    //     rmDir(tmpDir);
    // }).catch(reason => {
    //     core.warning(`Failed to unmount volume ${volume}`);
    // });
    return volume;
}