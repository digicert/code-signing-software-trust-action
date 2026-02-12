/**
 * Tests for smctl_signing.ts - Comprehensive command building tests
 * Tests all possible parameter combinations for the simplifiedSign function
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { simplifiedSign } from '../../src/smctl_signing';
import { 
    mockInputs,
    resetMocks as resetCoreMocks 
} from '../__mocks__/@actions/core';
import { getExecOutput, resetMocks as resetExecMocks } from '../__mocks__/@actions/exec';

describe('smctl_signing.ts - Simplified Sign Command Tests', () => {
    beforeEach(() => {
        resetCoreMocks();
        resetExecMocks();
        jest.clearAllMocks();
        // Clear all inputs
        mockInputs.clear();
    });

    afterEach(() => {
        resetCoreMocks();
        resetExecMocks();
    });

    describe('Required Parameters', () => {
        test('should not execute when input is missing', async () => {
            mockInputs.set('keypair-alias', 'my-keypair');

            await simplifiedSign('/path/to/smctl');

            // Should not call exec
            expect(getExecOutput).not.toHaveBeenCalled();
        });

        test('should not execute when keypair-alias is missing', async () => {
            mockInputs.set('input', '/path/to/file.exe');

            await simplifiedSign('/path/to/smctl');

            // Should not call exec
            expect(getExecOutput).not.toHaveBeenCalled();
        });

        test('should not execute when both input and keypair-alias are missing', async () => {
            await simplifiedSign('/path/to/smctl');

            // Should not call exec
            expect(getExecOutput).not.toHaveBeenCalled();
        });

        test('should not execute when input is empty string', async () => {
            mockInputs.set('input', '');
            mockInputs.set('keypair-alias', 'my-keypair');

            await simplifiedSign('/path/to/smctl');

            // Should not call exec
            expect(getExecOutput).not.toHaveBeenCalled();
        });

        test('should not execute when keypair-alias is empty string', async () => {
            mockInputs.set('input', '/path/to/file.exe');
            mockInputs.set('keypair-alias', '');

            await simplifiedSign('/path/to/smctl');

            // Should not call exec
            expect(getExecOutput).not.toHaveBeenCalled();
        });
    });

    describe('Basic Command Building', () => {
        test('should build command with only required parameters (all defaults)', async () => {
            mockInputs.set('input', '/path/to/file.exe');
            mockInputs.set('keypair-alias', 'my-keypair');
            mockInputs.set('timestamp', 'true');
            mockInputs.set('zero-exit-code-on-failure', 'false');
            mockInputs.set('fail-fast', 'false');
            mockInputs.set('unsigned', 'false');
            mockInputs.set('bulk-sign-mode', 'false');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({
                exitCode: 0,
                stdout: 'Success',
                stderr: ''
            });

            await simplifiedSign('/path/to/smctl');

            expect(getExecOutput).toHaveBeenCalledWith('/path/to/smctl', [
                'sign',
                '--simple',
                '--input',
                '/path/to/file.exe',
                '--keypair-alias',
                'my-keypair',
                '--exit-non-zero-on-fail'
            ]);
        });

        test('should use SMCTL constant when toolPath not provided', async () => {
            mockInputs.set('input', 'file.dll');
            mockInputs.set('keypair-alias', 'test-key');
            mockInputs.set('timestamp', 'true');
            mockInputs.set('zero-exit-code-on-failure', 'false');
            mockInputs.set('fail-fast', 'false');
            mockInputs.set('unsigned', 'false');
            mockInputs.set('bulk-sign-mode', 'false');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({
                exitCode: 0,
                stdout: '',
                stderr: ''
            });

            await simplifiedSign();

            expect(getExecOutput).toHaveBeenCalled();
            const call = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0];
            expect(call[0]).toBe('smctl');
        });
    });

    describe('Timestamp Parameter Combinations', () => {
        test('should not add timestamp flag when timestamp=true (default)', async () => {
            mockInputs.set('input', 'app.exe');
            mockInputs.set('keypair-alias', 'key1');
            mockInputs.set('timestamp', 'true');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/usr/bin/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).not.toContain('--timestamp=false');
        });

        test('should add --timestamp=false when timestamp=false', async () => {
            mockInputs.set('input', 'app.msi');
            mockInputs.set('keypair-alias', 'key2');
            mockInputs.set('timestamp', 'false');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/usr/bin/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('--timestamp=false');
        });
    });

    describe('Digest Algorithm Parameter', () => {
        test('should add digest algorithm when provided', async () => {
            mockInputs.set('input', 'binary.exe');
            mockInputs.set('keypair-alias', 'prod-key');
            mockInputs.set('digest-alg', 'SHA-256');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/opt/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('--digalg');
            expect(args).toContain('SHA-256');
            expect(args.indexOf('--digalg')).toBe(args.indexOf('SHA-256') - 1);
        });

        test('should support SHA-512 digest algorithm', async () => {
            mockInputs.set('input', 'app.dll');
            mockInputs.set('keypair-alias', 'cert-key');
            mockInputs.set('digest-alg', 'SHA-512');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/bin/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('--digalg');
            expect(args).toContain('SHA-512');
        });

        test('should not add digest algorithm when not provided', async () => {
            mockInputs.set('input', 'file.exe');
            mockInputs.set('keypair-alias', 'key');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).not.toContain('--digalg');
        });
    });

    describe('Zero Exit Code Parameter', () => {
        test('should add exit flag when zero-exit-code-on-failure=false (default)', async () => {
            mockInputs.set('input', 'test.exe');
            mockInputs.set('keypair-alias', 'test-key');
            mockInputs.set('zero-exit-code-on-failure', 'false');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/path/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('--exit-non-zero-on-fail');
        });

        test('should not add --exit-non-zero-on-fail when zero-exit-code-on-failure=true', async () => {
            mockInputs.set('input', 'app.exe');
            mockInputs.set('keypair-alias', 'my-key');
            mockInputs.set('zero-exit-code-on-failure', 'true');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).not.toContain('--exit-non-zero-on-fail');
        });
    });

    describe('Fail Fast Parameter', () => {
        test('should not add fail-fast flag when fail-fast=false (default)', async () => {
            mockInputs.set('input', '/dir/files');
            mockInputs.set('keypair-alias', 'dir-key');
            mockInputs.set('fail-fast', 'false');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).not.toContain('--failfast');
        });

        test('should add --failfast when fail-fast=true', async () => {
            mockInputs.set('input', '/directory');
            mockInputs.set('keypair-alias', 'batch-key');
            mockInputs.set('fail-fast', 'true');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('--failfast');
        });
    });

    describe('Unsigned Parameter', () => {
        test('should not add unsigned flag when unsigned=false (default)', async () => {
            mockInputs.set('input', 'signed.exe');
            mockInputs.set('keypair-alias', 'key1');
            mockInputs.set('unsigned', 'false');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).not.toContain('--unsigned');
        });

        test('should add --unsigned when unsigned=true', async () => {
            mockInputs.set('input', 'unsigned-only.exe');
            mockInputs.set('keypair-alias', 'sign-key');
            mockInputs.set('unsigned', 'true');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('--unsigned');
        });
    });

    describe('Bulk Sign Mode Parameter', () => {
        test('should not add bulk flag when bulk-sign-mode=false (default)', async () => {
            mockInputs.set('input', 'single.exe');
            mockInputs.set('keypair-alias', 'key');
            mockInputs.set('bulk-sign-mode', 'false');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).not.toContain('--bulk');
        });

        test('should add --bulk when bulk-sign-mode=true', async () => {
            mockInputs.set('input', '/path/to/files');
            mockInputs.set('keypair-alias', 'bulk-key');
            mockInputs.set('bulk-sign-mode', 'true');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('--bulk');
        });
    });

    describe('Complex Combinations', () => {
        test('should build command with all optional parameters enabled', async () => {
            mockInputs.set('input', '/batch/files');
            mockInputs.set('keypair-alias', 'production-key');
            mockInputs.set('digest-alg', 'SHA-512');
            mockInputs.set('timestamp', 'false');
            mockInputs.set('zero-exit-code-on-failure', 'true');
            mockInputs.set('fail-fast', 'true');
            mockInputs.set('unsigned', 'true');
            mockInputs.set('bulk-sign-mode', 'true');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/usr/local/bin/smctl');

            expect(getExecOutput).toHaveBeenCalledWith('/usr/local/bin/smctl', [
                'sign',
                '--simple',
                '--input',
                '/batch/files',
                '--keypair-alias',
                'production-key',
                '--timestamp=false',
                '--digalg',
                'SHA-512',
                '--failfast',
                '--unsigned',
                '--bulk'
            ]);
        });

        test('should build command with selective optional parameters', async () => {
            mockInputs.set('input', 'C:\\Windows\\app.exe');
            mockInputs.set('keypair-alias', 'windows-cert');
            mockInputs.set('digest-alg', 'SHA-256');
            mockInputs.set('timestamp', 'true');
            mockInputs.set('zero-exit-code-on-failure', 'false');
            mockInputs.set('fail-fast', 'true');
            mockInputs.set('unsigned', 'false');
            mockInputs.set('bulk-sign-mode', 'false');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('C:\\Tools\\smctl.exe');

            expect(getExecOutput).toHaveBeenCalledWith('C:\\Tools\\smctl.exe', [
                'sign',
                '--simple',
                '--input',
                'C:\\Windows\\app.exe',
                '--keypair-alias',
                'windows-cert',
                '--digalg',
                'SHA-256',
                '--exit-non-zero-on-fail',
                '--failfast'
            ]);
        });

        test('should handle directory path with spaces in input', async () => {
            mockInputs.set('input', '/path/with spaces/to/files');
            mockInputs.set('keypair-alias', 'space-key');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('/path/with spaces/to/files');
        });

        test('should handle keypair-alias with special characters', async () => {
            mockInputs.set('input', 'file.exe');
            mockInputs.set('keypair-alias', 'prod-key-2024_v1.0');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('prod-key-2024_v1.0');
        });
    });

    describe('Command Argument Order Verification', () => {
        test('should maintain correct argument order', async () => {
            mockInputs.set('input', 'test.exe');
            mockInputs.set('keypair-alias', 'key123');
            mockInputs.set('digest-alg', 'SHA-384');
            mockInputs.set('timestamp', 'false');
            mockInputs.set('zero-exit-code-on-failure', 'false');
            mockInputs.set('fail-fast', 'true');
            mockInputs.set('unsigned', 'true');
            mockInputs.set('bulk-sign-mode', 'true');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            
            // Verify order: sign, --simple, --input, <input>, --keypair-alias, <alias>, then optional flags
            expect(args[0]).toBe('sign');
            expect(args[1]).toBe('--simple');
            expect(args[2]).toBe('--input');
            expect(args[3]).toBe('test.exe');
            expect(args[4]).toBe('--keypair-alias');
            expect(args[5]).toBe('key123');
            
            // Optional flags should come after required ones
            expect(args.indexOf('--timestamp=false')).toBeGreaterThan(5);
            expect(args.indexOf('--digalg')).toBeGreaterThan(5);
            expect(args.indexOf('--failfast')).toBeGreaterThan(5);
            expect(args.indexOf('--unsigned')).toBeGreaterThan(5);
            expect(args.indexOf('--bulk')).toBeGreaterThan(5);
        });

        test('should place digest algorithm value immediately after --digalg flag', async () => {
            mockInputs.set('input', 'app.msi');
            mockInputs.set('keypair-alias', 'msi-key');
            mockInputs.set('digest-alg', 'SHA-256');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            const digalgIndex = args.indexOf('--digalg');
            expect(digalgIndex).toBeGreaterThan(-1);
            expect(args[digalgIndex + 1]).toBe('SHA-256');
        });
    });

    describe('Different File Types and Paths', () => {
        test('should handle .exe file', async () => {
            mockInputs.set('input', 'application.exe');
            mockInputs.set('keypair-alias', 'exe-key');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('application.exe');
        });

        test('should handle .dll file', async () => {
            mockInputs.set('input', 'library.dll');
            mockInputs.set('keypair-alias', 'dll-key');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('library.dll');
        });

        test('should handle .msi file', async () => {
            mockInputs.set('input', 'installer.msi');
            mockInputs.set('keypair-alias', 'installer-key');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('installer.msi');
        });

        test('should handle directory path', async () => {
            mockInputs.set('input', '/path/to/directory');
            mockInputs.set('keypair-alias', 'batch-key');
            mockInputs.set('bulk-sign-mode', 'true');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('/path/to/directory');
            expect(args).toContain('--bulk');
        });

        test('should handle Windows-style path', async () => {
            mockInputs.set('input', 'C:\\Program Files\\MyApp\\app.exe');
            mockInputs.set('keypair-alias', 'windows-key');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('C:\\smctl\\smctl.exe');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('C:\\Program Files\\MyApp\\app.exe');
        });

        test('should handle relative path', async () => {
            mockInputs.set('input', './build/output.exe');
            mockInputs.set('keypair-alias', 'relative-key');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('./build/output.exe');
        });
    });

    describe('Edge Cases', () => {
        test('should handle very long file paths', async () => {
            const longPath = '/very/long/path/'.repeat(20) + 'file.exe';
            mockInputs.set('input', longPath);
            mockInputs.set('keypair-alias', 'long-path-key');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain(longPath);
        });

        test('should handle keypair-alias with hyphens and underscores', async () => {
            mockInputs.set('input', 'app.exe');
            mockInputs.set('keypair-alias', 'my-prod_key-2024_final');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            expect(args).toContain('my-prod_key-2024_final');
        });

        test('should handle all boolean flags set to default values', async () => {
            mockInputs.set('input', 'minimal.exe');
            mockInputs.set('keypair-alias', 'minimal-key');
            mockInputs.set('timestamp', 'true');
            mockInputs.set('zero-exit-code-on-failure', 'false');
            mockInputs.set('fail-fast', 'false');
            mockInputs.set('unsigned', 'false');
            mockInputs.set('bulk-sign-mode', 'false');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/smctl');

            const args = (getExecOutput as jest.Mock<typeof getExecOutput>).mock.calls[0][1];
            
            // Should only have required args and exit-non-zero flag
            expect(args).toEqual([
                'sign',
                '--simple',
                '--input',
                'minimal.exe',
                '--keypair-alias',
                'minimal-key',
                '--exit-non-zero-on-fail'
            ]);
        });

        test('should handle execution when smctl returns non-zero exit code', async () => {
            mockInputs.set('input', 'failing.exe');
            mockInputs.set('keypair-alias', 'fail-key');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({
                exitCode: 1,
                stdout: '',
                stderr: 'Signing failed'
            });

            // Should not throw, just execute
            await simplifiedSign('/smctl');

            expect(getExecOutput).toHaveBeenCalled();
        });
    });

    describe('Real-World Scenarios', () => {
        test('should build command for production single file signing', async () => {
            mockInputs.set('input', 'MyApplication.exe');
            mockInputs.set('keypair-alias', 'production-certificate-2024');
            mockInputs.set('digest-alg', 'SHA-256');
            mockInputs.set('timestamp', 'true');
            mockInputs.set('zero-exit-code-on-failure', 'false');
            mockInputs.set('fail-fast', 'false');
            mockInputs.set('unsigned', 'false');
            mockInputs.set('bulk-sign-mode', 'false');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: 'Signed successfully', stderr: '' });

            await simplifiedSign('/opt/digicert/smctl');

            expect(getExecOutput).toHaveBeenCalledWith('/opt/digicert/smctl', [
                'sign',
                '--simple',
                '--input',
                'MyApplication.exe',
                '--keypair-alias',
                'production-certificate-2024',
                '--digalg',
                'SHA-256',
                '--exit-non-zero-on-fail'
            ]);
        });

        test('should build command for batch signing unsigned files only', async () => {
            mockInputs.set('input', '/release/binaries');
            mockInputs.set('keypair-alias', 'batch-cert');
            mockInputs.set('digest-alg', 'SHA-512');
            mockInputs.set('timestamp', 'true');
            mockInputs.set('zero-exit-code-on-failure', 'false');
            mockInputs.set('fail-fast', 'false');
            mockInputs.set('unsigned', 'true');
            mockInputs.set('bulk-sign-mode', 'true');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/usr/bin/smctl');

            expect(getExecOutput).toHaveBeenCalledWith('/usr/bin/smctl', [
                'sign',
                '--simple',
                '--input',
                '/release/binaries',
                '--keypair-alias',
                'batch-cert',
                '--digalg',
                'SHA-512',
                '--exit-non-zero-on-fail',
                '--unsigned',
                '--bulk'
            ]);
        });

        test('should build command for CI/CD pipeline with fail-fast enabled', async () => {
            mockInputs.set('input', './dist');
            mockInputs.set('keypair-alias', 'ci-signing-key');
            mockInputs.set('timestamp', 'true');
            mockInputs.set('zero-exit-code-on-failure', 'false');
            mockInputs.set('fail-fast', 'true');
            mockInputs.set('unsigned', 'false');
            mockInputs.set('bulk-sign-mode', 'true');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('smctl');

            expect(getExecOutput).toHaveBeenCalledWith('smctl', [
                'sign',
                '--simple',
                '--input',
                './dist',
                '--keypair-alias',
                'ci-signing-key',
                '--exit-non-zero-on-fail',
                '--failfast',
                '--bulk'
            ]);
        });

        test('should build command for development signing without timestamp', async () => {
            mockInputs.set('input', 'dev-build.exe');
            mockInputs.set('keypair-alias', 'dev-cert');
            mockInputs.set('timestamp', 'false');
            mockInputs.set('zero-exit-code-on-failure', 'true');
            mockInputs.set('fail-fast', 'false');
            mockInputs.set('unsigned', 'false');
            mockInputs.set('bulk-sign-mode', 'false');

            (getExecOutput as jest.Mock<typeof getExecOutput>).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await simplifiedSign('/dev/tools/smctl');

            expect(getExecOutput).toHaveBeenCalledWith('/dev/tools/smctl', [
                'sign',
                '--simple',
                '--input',
                'dev-build.exe',
                '--keypair-alias',
                'dev-cert',
                '--timestamp=false'
            ]);
        });
    });
});
