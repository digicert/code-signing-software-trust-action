import * as core from '@actions/core';
import * as cache from '@actions/cache';

import { setupTool, SCD, SMCTK, SMCTL, SMPKCS11, SMTOOLS } from './tool_setup';
import { simplifiedSign } from './smctl_signing';
import { RunnerType, runnerType } from './utils';

const productName = "'DigiCert Software Trust Manager'";

export async function main() {
    core.info(`Platform caching service available: ${cache.isFeatureAvailable()}`);
    core.info(`Runner type: ${runnerType}`);
    if (runnerType === RunnerType.GITHUB_RUNNER && !core.getBooleanInput('use-github-caching-service')) {
        core.info(`ADD "use-github-caching-service: true" in your workflow for an optimized Software Trust Manager setup`);
    }
    const isSimpleSigning = core.getBooleanInput('simple-signing-mode');
    if (isSimpleSigning) {
        core.info(`Setting up ${productName} for simple-signing mode.`);
        const smctl = await setupTool(SMCTL);
        await simplifiedSign(smctl);
    } else {
        core.info(`Setting up ${productName} for existing third party tool based signing mode.`);
        switch(core.platform.platform) {
            case 'win32':
                await setupTool(SMTOOLS);
                break;
            case 'linux':
                await setupTool(SMTOOLS);
                break;
            case 'darwin':
                // Parallel tool setup for macOS - all 4 tools are independent
                core.info('Downloading and installing 4 macOS tools in parallel...');
                await Promise.all([
                    setupTool(SMCTL),
                    setupTool(SMCTK),
                    setupTool(SMPKCS11),
                    setupTool(SCD)
                ]);
                core.info('All macOS tools installed successfully');
                break;
        };
    }
};

main().catch((reason) =>
    core.setFailed(reason)
);