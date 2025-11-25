import * as core from '@actions/core';
import * as cache from '@actions/cache';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import * as fs from 'fs/promises';
import * as path from 'path';

import { extractDmg } from './macos_dmg_setup';
import { archiveExtractCallback, isSelfHosted, toolCacheDir } from './utils';
import { installMsi } from './windows_msi_setup';
import { wrapInDirectory } from './file_noop_setup';
import { extractTar, extractZip } from './zip_setup';
import { walk } from './directory_walk_recursive';
import { setupLibraries } from './windows_library_setup';
import { chmod } from './add_execute_permission';

export const SMCTL = "smctl";
export const SMTOOLS = "smtools";
export const SMPKCS11 = "smpkcs11";
export const SMCTK = "smctk";
export const SCD = "ssm-scd";

const VERSION = core.getInput('cache-version', { required: true });

const enum LibExtension {
    win32 = ".dll",
    linux = ".so",
    darwin = ".dylib",
};

const enum ToolType {
    LIBRARY = "LIBRARY",
    EXECUTABLE = "EXECUTABLE",
    ARCHIVE = "ARCHIVE",
};

const enum ArchiveType {
    NONE = "FILE",
    DMG = "DMG",
    MSI = "MSI",
    TAR = "TAR",
    ZIP = "ZIP",
};

type ToolMetadata = {
    readonly name: string;
    readonly fName: string;
    readonly dlName: string;
    readonly toolType: ToolType;
    readonly archived: boolean;
    readonly archiveType: ArchiveType;
    readonly explodedDirectoryName?: string;
    readonly versionFlag?: string;
    readonly executePermissionRequired?: boolean;
    initialized?: boolean;
    toolPath?: string;
    cacheHitSetup?: (toolPath: string) => void;
    needPKCS11Config?: boolean;
    createSymlink?: (toolPath: string) => Promise<void>;
};

const smctlValues = {
    name: SMCTL,
    fName: SMCTL,
    initialized: false,
    toolType: ToolType.EXECUTABLE,
    versionFlag: "-v",
    archived: false,
    archiveType: ArchiveType.NONE,
};

const smctlMacValues = {
    ...smctlValues,
    archived: true,
    archiveType: ArchiveType.DMG,
    fName: 'smctl-mac-x64',
    dlName: 'smctl-mac-x64.dmg',
    async createSymlink(toolPath: string) {
        const sourcePath = path.join(toolPath, 'smctl-mac-x64');
        const targetPath = path.join(toolPath, SMCTL);

        // Remove existing symlink/file if it exists
        try {
            await fs.rm(targetPath, { force: true });
            core.info(`Removed existing file at ${targetPath}`);
        } catch {
            // Ignore errors - file might not exist
        }

        core.info(`Creating symlink: ${targetPath} -> ${sourcePath}`);
        try {
            await fs.symlink(sourcePath, targetPath);
        } catch (error) {
            core.warning(`Failed to create symlink: ${error}`);
        }
    },
}

const scdMacValues: ToolMetadata = {
    name: SCD,
    initialized: false,
    archived: true,
    archiveType: ArchiveType.DMG,
    fName: 'ssm-scd-x64',
    dlName: 'ssm-scd-x64.dmg',
    toolType: ToolType.EXECUTABLE,
    versionFlag: "-v",
};

const smctkMacValues: ToolMetadata = {
    name: SMCTK,
    initialized: false,
    archived: true,
    archiveType: ArchiveType.ZIP,
    fName: 'smctk-apple-any',
    dlName: 'DigiCert SSM Signing Clients.zip',
    toolType: ToolType.ARCHIVE,
};

const smpkcs11Values = {
    name: SMPKCS11,
    initialized: false,
    toolType: ToolType.LIBRARY,
    archived: false,
    archiveType: ArchiveType.NONE,
};

const smpkcs11MacValues = {
    ...smpkcs11Values,
    archived: true,
    archiveType: ArchiveType.DMG,
    fName: 'smpkcs11.dylib',
    dlName: 'smpkcs11.dylib.dmg',
    needPKCS11Config: true,
};

const smctlWindowsX64 = "smctl-win32-x64";
const smctlLinuxX64 = "smctl-linux-x64";
const smctlMacX64 = "smctl-darwin-x64";
const smctlMacArm64 = "smctl-darwin-arm64";

const smpkcs11MacX64 = "smpkcs11-darwin-x64";
const smpkcs11MacArm64 = "smpkcs11-darwin-arm64";

const smctkMacX64 = "smctk-darwin-x64";
const smctkMacArm64 = "smctk-darwin-arm64";
const scdMacX64 = "ssm-scd-darwin-x64";
const scdMacArm64 = "ssm-scd-darwin-arm64";

const smtoolsWindowsBundle = "smtools-win32-x64";
const smtoolsLinuxBundle = "smtools-linux-x64";

const staticToolDefintions = new Map<string, ToolMetadata>([
    [smctlWindowsX64, { ...smctlValues, dlName: "smctl.exe", fName: "smctl.exe" }],
    [smctlLinuxX64, { ...smctlValues, dlName: "smctl", executePermissionRequired: true }],
    [smctlMacX64, { ...smctlMacValues }],
    [smctlMacArm64, { ...smctlMacValues }],
    [smpkcs11MacX64, { ...smpkcs11MacValues }],
    [smpkcs11MacArm64, { ...smpkcs11MacValues }],
    [smctkMacX64, { ...smctkMacValues }],
    [smctkMacArm64, { ...smctkMacValues }],
    [scdMacX64, { ...scdMacValues }],
    [scdMacArm64, { ...scdMacValues }],

    [smtoolsWindowsBundle, {
        name: smtoolsWindowsBundle,
        archived: true,
        archiveType: ArchiveType.MSI,
        toolType: ToolType.ARCHIVE,
        dlName: "smtools-windows-x64.msi",
        fName: "smtools-windows-x64.msi",
        cacheHitSetup(toolPath) {
            setupLibraries(toolPath);
        },
        needPKCS11Config: true,
    }],
    [smtoolsLinuxBundle, {
        name: smtoolsLinuxBundle,
        archived: true,
        archiveType: ArchiveType.TAR,
        toolType: ToolType.ARCHIVE,
        explodedDirectoryName: smtoolsLinuxBundle,
        dlName: "smtools-linux-x64.tar.gz",
        fName: "smtools-linux-x64.tar.gz",
        executePermissionRequired: true,
        needPKCS11Config: true,
    }],
]);

async function writePKCS11ConfigFile(toolPath: string) {
    var cfgPath = path.join(toolPath, 'pkc11Properties.cfg');
    core.info(`Setting up PKCS#11 configuration file @ ${cfgPath}`);

    const exists = await fs.access(cfgPath).then(rv => {
        return true;
    }).catch(reason => {
        return false;
    });

    if (!exists) {
        var libraryPath = "";
        switch (core.platform.platform) {
            case 'win32':
                libraryPath = path.join(toolPath, `${SMPKCS11}.dll`);
                break;
            case 'linux':
                libraryPath = path.join(toolPath, `${SMPKCS11}.so`);
                break;
            case 'darwin':
                libraryPath = path.join(toolPath, `${SMPKCS11}.dylib`);
                break;
        }
        const cfg = `
            name="DigiCert Software Trust Manager"
            library=${libraryPath}
            slotListIndex=0
        `;

        await fs.writeFile(cfgPath, cfg, { flush: true });
    }
    if (core.platform.isWindows) {
        cfgPath = cfgPath.replaceAll('\\', '\\\\');
    }
    core.setOutput('PKCS11_CONFIG', cfgPath);
    return cfgPath;
};

function qulifiedToolName(name: string, os?: string, arch?: string): string {
    return `${name}-${os || core.platform.platform}-${arch || core.platform.arch}`;
};

function downloadUrl(tool: ToolMetadata) {
    const cdn = core.getInput('digicert-cdn', { required: true });
    return `${cdn}/${tool.dlName}`;
};

async function postDownload(tool: ToolMetadata, downlodedFilePath: string, callback: archiveExtractCallback) {
    core.info(`Setting the ${tool.archiveType} file ${downlodedFilePath}`);
    var outputDir: Promise<string>;
    return await new Promise<string>(resolve => {
        if (!tool.archived) {
            outputDir = wrapInDirectory(downlodedFilePath, tool.fName, callback);
        } else if (tool.archiveType === ArchiveType.DMG) {
            outputDir = extractDmg(downlodedFilePath, callback);
        } else if (tool.archiveType === ArchiveType.MSI) {
            outputDir = installMsi(downlodedFilePath, callback)
        } else if (tool.archiveType === ArchiveType.ZIP) {
            outputDir = extractZip(downlodedFilePath, callback);
        } else if (tool.archiveType === ArchiveType.TAR) {
            outputDir = extractTar(downlodedFilePath, callback);
        };
        resolve(outputDir);
    });
};

async function cachedSetup(tool: ToolMetadata) {
    var toolPath: string;
    core.info(`Looking for all installed and cached versions of ${tool.name}`)
    tc.findAllVersions(tool.name).forEach(rv => {
        core.info(`\tFound ${rv}`);
    });
    const toolDownloadUrl = downloadUrl(tool);
    var version = VERSION;
    const useBinarySha256Checksum = core.getBooleanInput('use-binary-sha256-checksum', { required: false });
    if (useBinarySha256Checksum) {
        core.info(`Using sha256 checksum file for determining the version of ${tool.name}`);
        const sha256ChecksumUrl = `${toolDownloadUrl}.sha256`;
        version = await tc.downloadTool(sha256ChecksumUrl).then(async rv => {
            core.info(`Downloaded sha256 checksum file from ${sha256ChecksumUrl}`);
            const content = await fs.readFile(rv, { encoding: 'utf-8' });
            const checksum = content.split(' ')[0].trim();
            core.info(`Using sha256 checksum ${checksum} as version for ${tool.name}`);
            return `0.0.0-${checksum}`;
        }).catch(reason => {
            core.warning(`Failed to download sha256 checksum file from ${sha256ChecksumUrl}, reason: ${reason}`);
            core.warning(`Falling back to use cache-version: ${VERSION} as version for ${tool.name}`);
            return VERSION;
        });
    }
    core.info(`Required cached version of ${tool.name} for this run is ${version}`)

    toolPath = tc.find(tool.name, version);
    if (toolPath) {
        core.info(`${tool.name} found in cache @ ${toolPath}`);
    } else {
        core.info(`${tool.name} NOT found in cache, downloading from ${toolDownloadUrl}`)
        const downloadedPath = await tc.downloadTool(toolDownloadUrl).then(rv => {
            core.info(`${tool.name} downloaded @ ${rv}`);
            return rv;
        });

        const outputDir = await postDownload(tool, downloadedPath, async (postPath: string) => {
            core.info(`Performing post download activities for ${postPath}`);
        });

        const cachePath = tool.archived && tool.explodedDirectoryName ?
            path.join(outputDir, tool.explodedDirectoryName!) : outputDir;
        core.info(`Caching ${tool.name}@${version} from ${cachePath}`);
        toolPath = await tc.cacheDir(cachePath, tool.name, version).then(rv => {
            core.info(`${tool.name} cached @ ${rv}`);
            return rv;
        });

        if (tool.executePermissionRequired) {
            await chmod(toolPath);
        }
    }

    if (tool.createSymlink) {
        await tool.createSymlink(toolPath);
    }

    if (tool.needPKCS11Config) {
        await writePKCS11ConfigFile(toolPath);
    }

    await walk(toolPath).then(rv => {
        core.debug(`---`);
        core.debug(`Contents of: ${toolPath}`);
        core.debug(`---`);
        rv.forEach(it => core.debug(it));
        core.debug(`---`);
    });

    return await new Promise<string>(resolveMe => {
        if (tool.toolType != ToolType.LIBRARY) {
            core.info(`Adding ${toolPath} to PATH`);
            core.addPath(toolPath);
        }
        resolveMe(toolPath);
    });
};

async function setupToolInternal(name: string) {
    const tk = qulifiedToolName(name);
    const tm = staticToolDefintions.get(tk)!;
    core.info(`Setting up ${tk}`)
    const toolPath = await cachedSetup(tm).then(tp => {
        tm.toolPath = tm.toolType === ToolType.EXECUTABLE ? path.join(tp, tm.fName) : tp;
        return tm.toolPath;
    });

    if (tm.toolType === ToolType.EXECUTABLE && tm.versionFlag) {
        core.info(`Checking actual version of ${tm.name}`);
        await exec.getExecOutput(toolPath, [tm.versionFlag])
            .catch(reason => core.warning(`failed to check: ${reason}`))
    }
    return toolPath;
};

export async function setupTool(name: string) {
    const tk = qulifiedToolName(name);
    const toolMetadata = staticToolDefintions.get(tk);
    if (!toolMetadata) {
        core.warning(`${tk} is not supported`);
        return;
    }

    const tm = toolMetadata!
    const tryGithubCache = !isSelfHosted && cache.isFeatureAvailable() && core.getBooleanInput('use-github-caching-service');
    var cacheHit: string | undefined;
    const p = core.platform;
    const cacheKey = `${name}-${core.getInput('cache-version')}-${p.platform}-${p.arch}`;
    const cachePath = toolCacheDir ? path.join(toolCacheDir, tm.name) : undefined;

    if (tryGithubCache && cachePath) {
        core.info(`Trying to restore cache for ${cacheKey} @ ${cachePath}`);
        await cache.restoreCache([cachePath], cacheKey).then(resolve => {
            cacheHit = resolve;
        }).catch(reason => {
            core.warning(`Error in restoring cache: ${reason}`);
        })
    };

    return await setupToolInternal(name).then(rv => {
        if (tryGithubCache && cachePath) {
            // If it's Github cache hit, then no files in System32 and SysWOW64 and no entry in registry,
            // So do the cache hit activity here.
            if (cacheHit && tm.cacheHitSetup) {
                tm.cacheHitSetup!(rv);
            }
            if (!cacheHit) {
                core.info(`It was a cache miss for ${cacheKey}, saving it now`);
                cache.saveCache([cachePath], cacheKey).then(rv => {
                    core.info(`Cache saved successfully, cacheId is ${rv}`);
                }).catch(error => {
                    core.warning(`Error in saving cache: ${error}`)
                })
            }
        };
        return rv;
    });
};