import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs/promises';
import path from 'path';

import { archiveExtractCallback, randomFileName, randomTmpDir, rmDir } from './utils';

export async function installMsi(src: string, callback: archiveExtractCallback) {
    const tmpDir = randomTmpDir()
    await fs.mkdir(tmpDir);
    const tmpInstallationLogFile = path.join(tmpDir, `${randomFileName()}.log`);

    core.info(`Installing ${src} @ ${tmpDir}`);
    var failed = false;
    const execOutput = await exec.getExecOutput(
        'msiexec',
        ['/i', src, '/qn', '/le', `${tmpInstallationLogFile}`,'/norestart',`INSTALLDIR=${tmpDir}`, 'ALLUSERS=2', 'MSIINSTALLPERUSER=1']
    ).catch(reason => {
        failed = true;
    });

    if (failed || (execOutput && execOutput.exitCode != 0)) {
        const content: string = await fs.readFile(tmpInstallationLogFile, 'utf-8');
        throw new Error(`Installation of ${src} failed. ${content}`);
    }

    await callback(tmpDir);
    return tmpDir;
}