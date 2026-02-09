/**
 * Unit tests for index.ts - Main entry point tests
 * Tests the main workflow including parallel tool setup on macOS
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import * as core from '@actions/core';
import * as toolSetup from '../../src/tool_setup';
import { main } from '../../src/index';

// Mock @actions/core
jest.mock('@actions/core');
const mockedCore = core as jest.Mocked<typeof core>;

// Mock @actions/cache
jest.mock('@actions/cache', () => ({
    isFeatureAvailable: jest.fn(() => true)
}));

// Mock tool_setup module
jest.mock('../../src/tool_setup', () => ({
    setupTool: jest.fn(),
    SMCTL: 'smctl',
    SMTOOLS: 'smtools',
    SMPKCS11: 'smpkcs11',
    SMCTK: 'smctk',
    SCD: 'scd'
}));

// Mock smctl_signing module
jest.mock('../../src/smctl_signing', () => ({
    simplifiedSign: jest.fn()
}));

describe('index.ts - Main Entry Point', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default input values
        mockedCore.getBooleanInput.mockImplementation((name: string) => {
            if (name === 'use-github-caching-service') return false;
            if (name === 'simple-signing-mode') return false;
            return false;
        });
        
        // Mock setupTool to resolve immediately
        (toolSetup.setupTool as any).mockResolvedValue('/mock/path/to/tool');
    });

    describe('macOS Platform - Parallel Tool Setup', () => {
        
        beforeEach(() => {
            // Mock platform as macOS
            Object.defineProperty(core.platform, 'platform', {
                value: 'darwin',
                writable: true,
                configurable: true
            });
        });

        test('should call setupTool for all 4 macOS tools', async () => {
            await main();
            
            // Should be called 4 times for macOS tools
            expect(toolSetup.setupTool).toHaveBeenCalledTimes(4);
            expect(toolSetup.setupTool).toHaveBeenCalledWith('smctl');
            expect(toolSetup.setupTool).toHaveBeenCalledWith('smctk');
            expect(toolSetup.setupTool).toHaveBeenCalledWith('smpkcs11');
            expect(toolSetup.setupTool).toHaveBeenCalledWith('scd');
        });

        test('should execute setupTool calls in parallel (Promise.all)', async () => {
            const callOrder: string[] = [];
            let resolveSmctl: () => void;
            let resolveSmctk: () => void;
            let resolveSmPkcs11: () => void;
            let resolveScd: () => void;

            // Mock setupTool with delays to verify parallel execution
            (toolSetup.setupTool as any).mockImplementation((toolName: string) => {
                callOrder.push(`${toolName}-start`);
                
                return new Promise<string>((resolve) => {
                    if (toolName === 'smctl') {
                        resolveSmctl = () => {
                            callOrder.push('smctl-end');
                            resolve('/mock/smctl');
                        };
                    } else if (toolName === 'smctk') {
                        resolveSmctk = () => {
                            callOrder.push('smctk-end');
                            resolve('/mock/smctk');
                        };
                    } else if (toolName === 'smpkcs11') {
                        resolveSmPkcs11 = () => {
                            callOrder.push('smpkcs11-end');
                            resolve('/mock/smpkcs11');
                        };
                    } else if (toolName === 'scd') {
                        resolveScd = () => {
                            callOrder.push('scd-end');
                            resolve('/mock/scd');
                        };
                    }
                });
            });

            const mainPromise = main();

            // Wait a tick for all promises to start
            await new Promise(resolve => setImmediate(resolve));

            // All 4 tools should have started
            expect(callOrder).toHaveLength(4);
            expect(callOrder).toContain('smctl-start');
            expect(callOrder).toContain('smctk-start');
            expect(callOrder).toContain('smpkcs11-start');
            expect(callOrder).toContain('scd-start');

            // Resolve in different order to prove parallelism
            resolveScd!();
            await new Promise(resolve => setImmediate(resolve));
            
            resolveSmPkcs11!();
            await new Promise(resolve => setImmediate(resolve));
            
            resolveSmctl!();
            await new Promise(resolve => setImmediate(resolve));
            
            resolveSmctk!();

            await mainPromise;

            // All should be complete
            expect(callOrder).toHaveLength(8);
            expect(callOrder.slice(0, 4)).toEqual([
                'smctl-start',
                'smctk-start',
                'smpkcs11-start',
                'scd-start'
            ]);
            
            // End order should match resolution order (scd, smpkcs11, smctl, smctk)
            // This proves they ran in parallel, not sequentially
            expect(callOrder.slice(4)).toEqual([
                'scd-end',
                'smpkcs11-end',
                'smctl-end',
                'smctk-end'
            ]);
        });

        test('should log info message about parallel download', async () => {
            await main();
            
            expect(mockedCore.info).toHaveBeenCalledWith(
                'Downloading and installing 4 macOS tools in parallel...'
            );
            expect(mockedCore.info).toHaveBeenCalledWith(
                'All macOS tools installed successfully'
            );
        });

        test('should fail fast if any tool setup fails in parallel', async () => {
            const setupError = new Error('SMCTL download failed');
            
            (toolSetup.setupTool as any).mockImplementation((toolName: string) => {
                if (toolName === 'smctl') {
                    return Promise.reject(setupError);
                }
                return new Promise(resolve => setTimeout(() => resolve(`/mock/${toolName}`), 100));
            });

            await expect(main()).rejects.toThrow('SMCTL download failed');
            
            // All 4 should have been called (Promise.all starts them all)
            expect(toolSetup.setupTool).toHaveBeenCalledTimes(4);
        });

        test('should handle multiple failures and report the first one', async () => {
            const firstError = new Error('SMCTL failed');
            const secondError = new Error('SMCTK failed');
            
            (toolSetup.setupTool as any).mockImplementation((toolName: string) => {
                if (toolName === 'smctl') {
                    return Promise.reject(firstError);
                }
                if (toolName === 'smctk') {
                    // Delay the second error
                    return new Promise((_, reject) => setTimeout(() => reject(secondError), 50));
                }
                return Promise.resolve(`/mock/${toolName}`);
            });

            // Promise.all rejects with the first rejection
            await expect(main()).rejects.toThrow('SMCTL failed');
        });
    });

    describe('Windows Platform - Sequential Setup', () => {
        
        beforeEach(() => {
            Object.defineProperty(core.platform, 'platform', {
                value: 'win32',
                writable: true,
                configurable: true
            });
        });

        test('should call setupTool once for SMTOOLS on Windows', async () => {
            await main();
            
            expect(toolSetup.setupTool).toHaveBeenCalledTimes(1);
            expect(toolSetup.setupTool).toHaveBeenCalledWith('smtools');
        });
    });

    describe('Linux Platform - Sequential Setup', () => {
        
        beforeEach(() => {
            Object.defineProperty(core.platform, 'platform', {
                value: 'linux',
                writable: true,
                configurable: true
            });
        });

        test('should call setupTool once for SMTOOLS on Linux', async () => {
            await main();
            
            expect(toolSetup.setupTool).toHaveBeenCalledTimes(1);
            expect(toolSetup.setupTool).toHaveBeenCalledWith('smtools');
        });
    });

    describe('Simple Signing Mode', () => {
        
        beforeEach(() => {
            mockedCore.getBooleanInput.mockImplementation((name: string) => {
                if (name === 'simple-signing-mode') return true;
                return false;
            });
        });

        test('should only setup SMCTL in simple-signing mode', async () => {
            await main();
            
            expect(toolSetup.setupTool).toHaveBeenCalledTimes(1);
            expect(toolSetup.setupTool).toHaveBeenCalledWith('smctl');
        });
    });
});
