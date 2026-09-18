import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as fs from 'fs/promises';
import { SMCTL } from './tool_setup';
import { isValidStr } from './utils';

/**
 * Decode and display DSSE attestation structure without verification.
 * This is a fully offline operation (no network calls, no credentials needed).
 */
export async function attestInspect(toolPath?: string) {
    const attestationFile = core.getInput('attestation-file');

    if (!isValidStr(attestationFile)) {
        core.info(`Set attestation-file to inspect attestation.`);
        return;
    }

    core.info(`Inspecting attestation: ${attestationFile}`);

    // Validate attestation file exists
    try {
        await fs.access(attestationFile);
    } catch (error) {
        throw new Error(`Cannot read attestation file: ${attestationFile}`);
    }

    // Build smctl attest inspect command
    const args = ['attest', 'inspect', '--attestation-file', attestationFile];

    // Capture output
    let capturedOutput = '';
    const tool = toolPath || SMCTL;

    try {
        core.info(`Executing: ${tool} ${args.join(' ')}`);
        const result = await exec.getExecOutput(tool, args, {
            silent: true, // Don't log output to console, we'll handle it
            ignoreReturnCode: false,
        });

        capturedOutput = result.stdout;

        if (!capturedOutput) {
            throw new Error('No output from attest inspect command');
        }

        // Parse output JSON
        let inspectionResult: any;
        try {
            inspectionResult = JSON.parse(capturedOutput);
        } catch (error) {
            throw new Error(`Failed to parse attestation inspection output: ${(error as Error).message}`);
        }

        // Extract metadata
        const predicateType = inspectionResult.predicateType || 'unknown';
        const statementType = inspectionResult.statementType || 'https://in-toto.io/Statement/v1';
        const subjectInfo = inspectionResult.subjects?.[0] || {};
        const signatureInfo = inspectionResult.signatures?.[0] || {};

        // Handle output file and formatting
        const outputFormat = core.getInput('attest-output-format') || 'json';
        let outputContent: string;

        if (outputFormat === 'text') {
            outputContent = formatAsText(inspectionResult);
        } else if (outputFormat === 'summary') {
            outputContent = formatAsSummary(inspectionResult);
        } else {
            // Default: json
            outputContent = JSON.stringify(inspectionResult, null, 2);
        }

        // Write to output file if specified
        const outputFile = core.getInput('attest-output');
        if (isValidStr(outputFile)) {
            try {
                await fs.writeFile(outputFile, outputContent, 'utf-8');
                core.info(`Inspection output written to: ${outputFile}`);
            } catch (error) {
                throw new Error(`Failed to write output file: ${(error as Error).message}`);
            }
        } else {
            // Print to console
            core.info(`\n${outputContent}\n`);
        }

        // Set GitHub Action outputs
        core.setOutput('attestation-content', capturedOutput);
        core.setOutput('predicate-type', predicateType);
        core.setOutput('subject-name', subjectInfo.name || 'unknown');
        core.setOutput('subject-digest', subjectInfo.digest?.sha256 || 'unknown');
        core.setOutput('signature-keyid', signatureInfo.keyid || 'unknown');

        core.info(`✅ Attestation inspection completed successfully`);
    } catch (error) {
        throw new Error(`Attestation inspection failed: ${(error as Error).message}`);
    }
}

/**
 * Format inspection result as human-readable text
 */
function formatAsText(result: any): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('                  ATTESTATION INSPECTION                     ');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');

    lines.push(`📋 Statement Type:     ${result.statementType}`);
    lines.push(`📦 Payload Type:       ${result.payloadType}`);
    lines.push('');

    lines.push('🎯 SUBJECT');
    if (result.subjects && result.subjects.length > 0) {
        result.subjects.forEach((subject: any, index: number) => {
            lines.push(`   [${index}] Name:   ${subject.name}`);
            lines.push(`       Digest:  ${subject.digest.sha256}`);
        });
    } else {
        lines.push('   (none)');
    }
    lines.push('');

    lines.push('📋 PREDICATE');
    lines.push(`   Type:  ${result.predicateType}`);
    if (result.predicate) {
        const predicateKeys = Object.keys(result.predicate).slice(0, 3);
        predicateKeys.forEach((key: string) => {
            const value = result.predicate[key];
            const displayValue = typeof value === 'string' ? value : JSON.stringify(value).slice(0, 50);
            lines.push(`   ${key}: ${displayValue}`);
        });
        if (Object.keys(result.predicate).length > 3) {
            lines.push(`   ... and ${Object.keys(result.predicate).length - 3} more fields`);
        }
    }
    lines.push('');

    lines.push('🔐 SIGNATURE');
    if (result.signatures && result.signatures.length > 0) {
        result.signatures.forEach((sig: any, index: number) => {
            lines.push(`   [${index}] KeyID:     ${sig.keyid}`);
            lines.push(`       Algorithm: ${sig.algorithm}`);
            if (sig.sig) {
                lines.push(`       Sig:       ${sig.sig.slice(0, 32)}...`);
            }
        });
    } else {
        lines.push('   (none)');
    }
    lines.push('');

    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
}

/**
 * Format inspection result as summary (key fields only)
 */
function formatAsSummary(result: any): string {
    const subject = result.subjects?.[0] || {};
    const signature = result.signatures?.[0] || {};

    return [
        `Predicate Type:     ${result.predicateType}`,
        `Subject Name:       ${subject.name}`,
        `Subject Digest:     ${subject.digest?.sha256}`,
        `Signature KeyID:    ${signature.keyid}`,
        `Algorithm:          ${signature.algorithm}`,
    ].join('\n');
}
