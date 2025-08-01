import * as core from '@actions/core';
import * as fs from 'fs/promises';
import path from 'path';

export async function chmod(toolPath: string) {
    core.info(`Adding +x permission to files present @ ${toolPath}`);
    const files = await fs.readdir(toolPath);
    for (const file of files) {
        const filePath = path.join(toolPath, file);
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
            // 0o755 => rwxr-xr-x (+x for owner, group, others)
            await fs.chmod(filePath, 0o755);
            core.debug(`Added +x permission to: ${filePath}`);
        }
    }
}