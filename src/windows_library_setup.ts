import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs/promises';
import path from 'path';
import { SMCTL } from './tool_setup';
import { randomFileName, tmpDir } from './utils';

export async function setupLibraries(smtoolsPath: string) {
    const cspRegistryCommands = `
        @echo off
        @REM For ssmcsp-x86
        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /f
        if %errorlevel% neq 0 (
            echo Failed to create DigiCert Software Trust Manager CSP registry key for x86
            exit /b %errorlevel%
        )

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /v "SigInFile" /t REG_DWORD /d 0 /f
        if %errorlevel% neq 0 (
            echo Failed to set SigInFile for DigiCert Software Trust Manager CSP x86
            exit /b %errorlevel%
        )

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /v "Type" /t REG_DWORD /d 1 /f
        if %errorlevel% neq 0 (
            echo Failed to set Type for DigiCert Software Trust Manager CSP x86
            exit /b %errorlevel%
        )

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /v "Image Path" /t REG_SZ /d "ssmcsp.dll" /f
        if %errorlevel% neq 0 (
            echo Failed to set Image Path for DigiCert Software Trust Manager CSP x86
            exit /b %errorlevel%
        )

        @REM For ssmcsp-x64
        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /f
        if %errorlevel% neq 0 (
            echo Failed to create DigiCert Software Trust Manager CSP registry key for x64
            exit /b %errorlevel%
        )

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /v "SigInFile" /t REG_DWORD /d 0 /f
        if %errorlevel% neq 0 (
            echo Failed to set SigInFile for DigiCert Software Trust Manager CSP x64
            exit /b %errorlevel%
        )

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /v "Type" /t REG_DWORD /d 1 /f
        if %errorlevel% neq 0 (
            echo Failed to set Type for DigiCert Software Trust Manager CSP x64
            exit /b %errorlevel%
        )

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Software Trust Manager CSP" /v "Image Path" /t REG_SZ /d "ssmcsp.dll" /f
        if %errorlevel% neq 0 (
            echo Failed to set Image Path for DigiCert Software Trust Manager CSP x64
            exit /b %errorlevel%
        )

        @REM For ssmcsp-x86
        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /f
        if %errorlevel% neq 0 (
            echo Failed to create DigiCert Secure Software Manager CSP registry key for x86
            exit /b %errorlevel%
        )

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /v "SigInFile" /t REG_DWORD /d 0 /f
        if %errorlevel% neq 0 (
            echo Failed to set SigInFile for DigiCert Secure Software Manager CSP x86
            exit /b %errorlevel%
        )

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /v "Type" /t REG_DWORD /d 1 /f
        if %errorlevel% neq 0 (
            echo Failed to set Type for DigiCert Secure Software Manager CSP x86
            exit /b %errorlevel%
        )

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /v "Image Path" /t REG_SZ /d "ssmcsp.dll" /f
        if %errorlevel% neq 0 (
            echo Failed to set Image Path for DigiCert Secure Software Manager CSP x86
            exit /b %errorlevel%
        )

        @REM For ssmcsp-x64
        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /f
        if %errorlevel% neq 0 (
            echo Failed to create DigiCert Secure Software Manager CSP registry key for x64
            exit /b %errorlevel%
        )

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /v "SigInFile" /t REG_DWORD /d 0 /f
        if %errorlevel% neq 0 (
            echo Failed to set SigInFile for DigiCert Secure Software Manager CSP x64
            exit /b %errorlevel%
        )

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /v "Type" /t REG_DWORD /d 1 /f
        if %errorlevel% neq 0 (
            echo Failed to set Type for DigiCert Secure Software Manager CSP x64
            exit /b %errorlevel%
        )

        reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography\\Defaults\\Provider\\DigiCert Secure Software Manager CSP" /v "Image Path" /t REG_SZ /d "ssmcsp.dll" /f
        if %errorlevel% neq 0 (
            echo Failed to set Image Path for DigiCert Secure Software Manager CSP x64
            exit /b %errorlevel%
        )
    `;

    const batchFile = path.join(tmpDir, `${randomFileName()}.bat`);
    await fs.writeFile(batchFile, cspRegistryCommands, {flush: true});

    core.info(`Registering KSP and CSP on the system`);
    const smctl = path.join(smtoolsPath, SMCTL);

    await exec.getExecOutput(smctl, ["windows", "ksp", "register"]);

    const system32 = `${process.env['SystemRoot']}\\System32`;
    const sysWOW64 = `${process.env['SystemRoot']}\\SysWOW64`;

    await fs.copyFile(path.join(smtoolsPath, 'smksp-x64.dll'), path.join(system32, 'smksp.dll'));
    await fs.copyFile(path.join(smtoolsPath, 'smksp-x86.dll'), path.join(sysWOW64, 'smksp.dll'));

    await fs.copyFile(path.join(smtoolsPath, 'ssmcsp-x64.dll'), path.join(system32, 'ssmcsp.dll'));
    await fs.copyFile(path.join(smtoolsPath, 'ssmcsp-x86.dll'), path.join(sysWOW64, 'ssmcsp.dll'));

    try {
        const result = await exec.getExecOutput(batchFile, [], { ignoreReturnCode: true });
        if (result.exitCode !== 0) {
            core.error(`Batch file execution failed with exit code ${result.exitCode}`);
            core.error(`stdout: ${result.stdout}`);
            core.error(`stderr: ${result.stderr}`);
            throw new Error(`Failed to register CSP registry keys. Exit code: ${result.exitCode}`);
        }
        core.info('Successfully registered CSP registry keys');
    } catch (error) {
        throw error;
    } finally {
        await fs.rm(batchFile);
    }
};