import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs/promises';
import path from 'path';
import { SMCTL } from './tool_setup';
import { randomFileName, tmpDir } from './utils';

export async function setupLibraries(smtoolsPath: string) {
    // CBonnell: consider adding error handling in the batch file
    // anshuman-mor: Delaying it for now, will relook into error handling later.
    const cspResitryCommands = `
        @REM For ssmcsp-x86
        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /f

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /v "SigInFile" /t REG_DWORD /d 0 /f

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /v "Type" /t REG_DWORD /d 1 /f

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /v "Image Path" /t REG_SZ /d "ssmcsp.dll" /f

        @REM For ssmcsp-x64
        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /f

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /v "SigInFile" /t REG_DWORD /d 0 /f

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /v "Type" /t REG_DWORD /d 1 /f

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /v "Image Path" /t REG_SZ /d "ssmcsp.dll" /f

        @REM For ssmcsp-x86
        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /f

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /v "SigInFile" /t REG_DWORD /d 0 /f

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /v "Type" /t REG_DWORD /d 1 /f

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /v "Image Path" /t REG_SZ /d "ssmcsp.dll" /f

        @REM For ssmcsp-x64
        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /f

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /v "SigInFile" /t REG_DWORD /d 0 /f

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /v "Type" /t REG_DWORD /d 1 /f

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /v "Image Path" /t REG_SZ /d "ssmcsp.dll" /f
    `;

    const batchFile = path.join(tmpDir, `${randomFileName()}.bat`);
    await fs.writeFile(batchFile, cspResitryCommands, {flush: true});

    core.info(`Registring KSP and CSP on the system`);
    const smctl = path.join(smtoolsPath, SMCTL);

    await exec.getExecOutput(smctl, ["windows", "ksp", "register"]);

    const system32 = `${process.env['SystemRoot']}\\System32`;
    const sysWOW64 = `${process.env['SystemRoot']}\\SysWOW64`;

    await fs.copyFile(path.join(smtoolsPath, 'smksp-x64.dll'), path.join(system32, 'smksp.dll'));
    await fs.copyFile(path.join(smtoolsPath, 'smksp-x86.dll'), path.join(sysWOW64, 'smksp.dll'));

    await fs.copyFile(path.join(smtoolsPath, 'ssmcsp-x64.dll'), path.join(system32, 'ssmcsp.dll'));
    await fs.copyFile(path.join(smtoolsPath, 'ssmcsp-x86.dll'), path.join(sysWOW64, 'ssmcsp.dll'));

    await exec.getExecOutput(batchFile);

    await fs.rm(batchFile);
};