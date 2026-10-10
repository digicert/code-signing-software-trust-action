import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as fs from 'fs/promises';
import { SMCTL } from './tool_setup';
import { isValidStr } from './utils';

/**
 * Verify DSSE attestation signature against trust material (public key or certificate).
 * This is a fully offline operation (no network calls, no signing credentials needed).
 */
export async function attestVerify(toolPath?: string) {
    const attestationFile = core.getInput('attestation-file');
    const publicKey = core.getInput('attest-public-key');
    const certificate = core.getInput('attest-certificate');

    if (!isValidStr(attestationFile)) {
        core.info(`Set attestation-file to verify attestation.`);
        return;
    }

    // Ensure either public-key or certificate is provided (mutually exclusive)
    if (!isValidStr(publicKey) && !isValidStr(certificate)) {
        throw new Error('Either attest-public-key or attest-certificate must be provided for verification');
    }

    if (isValidStr(publicKey) && isValidStr(certificate)) {
        throw new Error('attest-public-key and attest-certificate are mutually exclusive');
    }

    core.info(`Verifying attestation: ${attestationFile}`);

    // Validate files exist
    try {
        await fs.access(attestationFile);
    } catch (error) {
        throw new Error(`Cannot read attestation file: ${attestationFile}`);
    }

    const trustMaterialFile = publicKey || certificate;
    const trustMaterialType = publicKey ? 'public key' : 'certificate';

    try {
        await fs.access(trustMaterialFile);
    } catch (error) {
        throw new Error(`Cannot read ${trustMaterialType} file: ${trustMaterialFile}`);
    }

    // Optional: validate CA bundle if certificate is provided
    const caBundle = core.getInput('attest-ca-bundle');
    if (isValidStr(caBundle) && isValidStr(certificate)) {
        try {
            await fs.access(caBundle);
        } catch (error) {
            throw new Error(`Cannot read CA bundle file: ${caBundle}`);
        }
    }

    // Build smctl attest verify command
    const args = ['attest', 'verify', '--attestation-file', attestationFile];

    if (isValidStr(publicKey)) {
        args.push('--public-key', publicKey);
    } else if (isValidStr(certificate)) {
        args.push('--certificate', certificate);

        // Add CA bundle if provided
        if (isValidStr(caBundle)) {
            args.push('--ca-bundle', caBundle);
        }
    }

    // Optional filters
    const predicateTypeFilter = core.getInput('attest-predicate-type-filter');
    if (isValidStr(predicateTypeFilter)) {
        args.push('--type', predicateTypeFilter);
    }

    const subjectDigestFilter = core.getInput('attest-subject-digest-filter');
    if (isValidStr(subjectDigestFilter)) {
        args.push('--subject-digest', subjectDigestFilter);
    }

    // Output format
    const outputFormat = core.getInput('attest-output-format') || 'json';
    args.push('--output', outputFormat);

    // Capture output
    let capturedOutput = '';
    const tool = toolPath || SMCTL;
    let verified = false;

    try {
        core.info(`Executing: ${tool} ${args.join(' ')}`);
        const result = await exec.getExecOutput(tool, args, {
            silent: true, // Don't log output to console, we'll handle it
            ignoreReturnCode: true, // Don't fail on non-zero exit, we'll check manually
        });

        capturedOutput = result.stdout;
        const exitCode = result.exitCode;

        // Parse verification result
        if (outputFormat === 'json') {
            if (!capturedOutput) {
                throw new Error('No output from attest verify command');
            }

            let verificationResult: any;
            try {
                verificationResult = JSON.parse(capturedOutput);
            } catch (error) {
                throw new Error(`Failed to parse attestation verification output: ${(error as Error).message}`);
            }

            // Determine verification status
            verified = verificationResult.verified === true || verificationResult.verified === 'true';

            // Extract metadata
            const predicateType = verificationResult.predicateType || 'unknown';
            const subjectInfo = verificationResult.subject || {};
            const signatureKeyid = verificationResult.signature?.keyid || verificationResult.keyid || 'unknown';
            const signer = verificationResult.signer || {};

            // Set outputs
            core.setOutput('verification-result', capturedOutput);
            core.setOutput('verified', verified.toString());
            core.setOutput('predicate-type', predicateType);
            core.setOutput('subject-name', subjectInfo.name || 'unknown');
            core.setOutput('subject-digest', subjectInfo.digest?.sha256 || 'unknown');
            core.setOutput('signature-keyid', signatureKeyid);

            // Log result
            if (verified) {
                core.info(`✅ Attestation signature verification PASSED`);
                if (signer.subject) {
                    core.info(`   Signer: ${signer.subject}`);
                }
            } else {
                core.warning(`❌ Attestation signature verification FAILED`);
            }
        } else {
            // Text format output
            core.info(`Verification Result:\n${capturedOutput}`);
            verified = capturedOutput.toLowerCase().includes('valid') && !capturedOutput.toLowerCase().includes('invalid');

            core.setOutput('verified', verified.toString());
            core.setOutput('verification-result', capturedOutput);
        }

        // Write to output file if specified
        const outputFile = core.getInput('attest-output');
        if (isValidStr(outputFile)) {
            try {
                await fs.writeFile(outputFile, capturedOutput, 'utf-8');
                core.info(`Verification output written to: ${outputFile}`);
            } catch (error) {
                throw new Error(`Failed to write output file: ${(error as Error).message}`);
            }
        }

        // Fail if not verified and fail-on-invalid is true
        const failOnInvalid = core.getBooleanInput('attest-fail-on-invalid');
        if (!verified && failOnInvalid) {
            throw new Error('Attestation signature verification failed');
        }

        core.info(`✅ Attestation verification completed`);
    } catch (error) {
        throw new Error(`Attestation verification failed: ${(error as Error).message}`);
    }
}
