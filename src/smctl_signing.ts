import * as exec from '@actions/exec';
import * as core from '@actions/core';
import { SMCTL } from './tool_setup';
import { isValidStr } from './utils';

export async function simplifiedSign(toolPath?: string) {
    const input = core.getInput('input');
    const keypairAlias = core.getInput('keypair-alias');
    if (!(isValidStr(input) && isValidStr(keypairAlias))) {
        core.info(`Set input and keypair-alias to do signing.`);
        return;
    }

    const digestAlg = core.getInput("digest-alg");
    const timsestamp = core.getBooleanInput('timestamp')
    const zeroExit = core.getBooleanInput('zero-exit-code-on-failure');
    const failFast = core.getBooleanInput("fail-fast");
    const unsigned = core.getBooleanInput("unsigned");
    const bulkSign = core.getBooleanInput("bulk-sign-mode");

    var args = ["sign", "--simple", "--input", input, "--keypair-alias", keypairAlias];
    if (!timsestamp) args.push("--timestamp=false")
    if (digestAlg) args.push("--digalg", digestAlg)
    if (!zeroExit) args.push("--exit-non-zero-on-fail")
    if (failFast) args.push("--failfast");
    if (unsigned) args.push("--unsigned")
    if (bulkSign) args.push("--bulk");

    const tool = toolPath || SMCTL;
    await exec.getExecOutput(tool, args)
}