import * as core from '@actions/core';
import * as cache from '@actions/cache';

import { setupTool, SCD, SMCTK, SMCTL, SMPKCS11, SMTOOLS } from './tool_setup';
import { simplifiedSign } from './smctl_signing';
import { attestSign } from './attest_sign';
import { attestInspect } from './attest_inspect';
import { attestVerify } from './attest_verify';
import { RunnerType, runnerType } from './utils';

const productName = "'DigiCert Software Trust Manager'";

export async function main() {
    core.info(`Platform caching service available: ${cache.isFeatureAvailable()}`);
    core.info(`Runner type: ${runnerType}`);
    if (runnerType === RunnerType.GITHUB_RUNNER && !core.getBooleanInput('use-github-caching-service')) {
        core.info(`ADD "use-github-caching-service: true" in your workflow for an optimized Software Trust Manager setup`);
    }

    // Check for attestation modes first (these have priority as they're more specific)
    const isAttestSign = core.getBooleanInput('attest-sign-mode');
    const isAttestInspect = core.getBooleanInput('attest-inspect-mode');
    const isAttestVerify = core.getBooleanInput('attest-verify-mode');

    if (isAttestSign || isAttestInspect || isAttestVerify) {
        core.info(`Setting up ${productName} for attestation mode.`);
        const smctl = await setupTool(SMCTL);

        if (isAttestSign) {
            core.info('Attestation Mode: Creating attestation (attest-sign)');
            await attestSign(smctl);
        } else if (isAttestInspect) {
            core.info('Attestation Mode: Inspecting attestation (attest-inspect)');
            await attestInspect(smctl);
        } else if (isAttestVerify) {
            core.info('Attestation Mode: Verifying attestation (attest-verify)');
            await attestVerify(smctl);
        }
        return;
    }

    // Original signing logic
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