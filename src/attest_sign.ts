import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SMCTL } from './tool_setup';
import { isValidStr } from './utils';

/**
 * Create an in-toto DSSE attestation by signing evidence with an STM keypair.
 * This operation requires network access to the STM backend.
 */
export async function attestSign(toolPath?: string) {
    const input = core.getInput('attestation-input');
    const keypairAlias = core.getInput('keypair-alias');

    if (!(isValidStr(input) && isValidStr(keypairAlias))) {
        core.info(`Set attestation-input and keypair-alias to create attestation.`);
        return;
    }

    core.info(`Creating attestation from evidence file: ${input}`);

    // Validate input file exists
    try {
        await fs.access(input);
    } catch (error) {
        throw new Error(`Cannot read attestation input file: ${input}`);
    }

    // Build smctl attest sign command
    const args = ['attest', 'sign', '--input', input, '--keypair-alias', keypairAlias];

    // Optional: predicate type (auto-detect if not provided)
    const attestType = core.getInput('attest-type');
    if (isValidStr(attestType)) {
        args.push('--type', attestType);
    }

    // Optional: subject name
    const subjectName = core.getInput('attest-subject-name');
    if (isValidStr(subjectName)) {
        args.push('--subject-name', subjectName);
    }

    // Optional: subject digest
    const subjectDigest = core.getInput('attest-subject-digest');
    if (isValidStr(subjectDigest)) {
        args.push('--subject-digest', subjectDigest);
    }

    // Optional: output file path
    let outputFile = core.getInput('attest-output');
    if (!isValidStr(outputFile)) {
        outputFile = 'attestation.json';
    }
    args.push('--output', outputFile);

    const tool = toolPath || SMCTL;
    try {
        core.info(`Executing: ${tool} ${args.join(' ')}`);
        await exec.getExecOutput(tool, args);

        // Verify output file exists
        let attestationContent: string;
        try {
            attestationContent = await fs.readFile(outputFile, 'utf-8');
        } catch (error) {
            throw new Error(`Failed to read attestation output: ${outputFile}`);
        }

        // Parse to extract metadata
        const attestation = JSON.parse(attestationContent);
        const predicateType = attestation.predicateType || 'unknown';
        const subjectInfo = attestation.subjects?.[0] || {};
        const signatureInfo = attestation.signatures?.[0] || {};

        // Set GitHub Action outputs
        core.setOutput('attestation-file', outputFile);
        core.setOutput('attestation-content', attestationContent);
        core.setOutput('predicate-type', predicateType);
        core.setOutput('subject-name', subjectInfo.name || 'unknown');
        core.setOutput('subject-digest', subjectInfo.digest?.sha256 || 'unknown');
        core.setOutput('signature-keyid', signatureInfo.keyid || 'unknown');

        core.info(`✅ Attestation created successfully: ${outputFile}`);
    } catch (error) {
        throw new Error(`Attestation signing failed: ${(error as Error).message}`);
    }
}
