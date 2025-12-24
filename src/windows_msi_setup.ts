import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs/promises';
import path from 'path';

import { archiveExtractCallback, randomFileName, randomTmpDir, rmDir } from './utils';

async function uninstallExistingMsi(msiPath: string): Promise<boolean> {
    core.info(`Attempting to uninstall any existing installation using ${msiPath}`);

    // Use the MSI file itself to uninstall any existing installation
    // If the product isn't installed, msiexec will return error 1605 which we can ignore
    return exec.getExecOutput(
        'msiexec',
        ['/x', msiPath, '/qn', '/norestart'],
        { ignoreReturnCode: true, silent: true }
    )
    .then(uninstallOutput => {
        if (uninstallOutput.exitCode === 0) {
            core.info(`Successfully uninstalled existing installation`);
            return true;
        }

        if (uninstallOutput.exitCode === 1605) {
            // Error 1605: This action is only valid for products that are currently installed
            core.info(`No existing installation found (exit code 1605)`);
            return false;
        }

        core.warning(`Uninstallation completed with exit code ${uninstallOutput.exitCode}`);
        return false;
    })
    .catch(error => {
        core.warning(`Error during uninstallation attempt: ${error}`);
        return false;
    });
}

export async function installMsi(src: string, callback: archiveExtractCallback) {
    // Try to uninstall any existing installation using the same MSI file
    await uninstallExistingMsi(src);

    const tmpDir = randomTmpDir();
    await fs.mkdir(tmpDir);
    const tmpInstallationLogFile = path.join(tmpDir, `${randomFileName()}.log`);

    core.info(`Installing ${src} @ ${tmpDir}`);

    return exec.getExecOutput(
        'msiexec',
        ['/i', src, '/qn', '/le', `${tmpInstallationLogFile}`, '/norestart', `INSTALLDIR=${tmpDir}`]
    )
    .then(async execOutput => {
        if (execOutput.exitCode !== 0) {
            const content = await fs.readFile(tmpInstallationLogFile, 'utf-8');
            throw new Error(`Installation of ${src} failed. ${content}`);
        }
        core.info(`Installation of ${src} completed successfully.`);
        await callback(tmpDir);
        return tmpDir;
    })
    .catch(async error => {
        // Try to read the log file for additional context
        try {
            const content = await fs.readFile(tmpInstallationLogFile, 'utf-8');
            throw new Error(`Installation of ${src} failed. ${content}`);
        } catch {
            throw new Error(`Installation of ${src} failed. ${error}`);
        }
    });
}