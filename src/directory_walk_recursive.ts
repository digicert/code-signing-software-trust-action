import * as fsp from 'fs/promises';
import * as path from 'path';

export async function walk(dirPath: string): Promise<string[]> {
    const results = [];
    try {
        const entries = await fsp.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                results.push(`[D]${entryPath}`);
                results.push(...await walk(entryPath));
            } else if (entry.isFile()) {
                results.push(`[F]${entryPath}`);
            }
        }
    } catch (err) {
        console.error(`Error reading directory ${dirPath}:`, err);
    }
    return results;
}