import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as path from 'path';
import { archiveExtractCallback, randomDirName, rmDir, tmpDir } from './utils';

export async function extractDmg(dmgFile: string, callback: archiveExtractCallback) {
    const volume = path.join('/Volumes', randomDirName());
    core.info(`Mounting DMG file ${dmgFile} to volume ${volume}`)
    
    let mounted = false;
    try {
        await exec.getExecOutput(
            "hdiutil", 
            ["attach", dmgFile, "-mountpoint", volume]
        );
        mounted = true;

        await callback(volume);

        return volume;
    } finally {
        // Always attempt to unmount, even if callback fails
        if (mounted) {
            try {
                core.info(`Unmounting DMG volume ${volume}`);
                await exec.getExecOutput("hdiutil", ["detach", volume], {
                    ignoreReturnCode: true // Don't fail if unmount has issues
                });
            } catch (err) {
                // Log warning but don't fail - volume might already be unmounted
                core.warning(`Failed to unmount DMG volume ${volume}: ${err}`);
            }
        }
    }
}