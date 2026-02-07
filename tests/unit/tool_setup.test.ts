/**
 * Unit tests for tool_setup.ts
 * Tests tool constants and basic functionality
 */

import { describe, it, expect } from '@jest/globals';

// Import constants to test
import { SMCTL, SMTOOLS, SMPKCS11, SMCTK, SCD } from '../../src/tool_setup';

describe('tool_setup', () => {
  describe('Tool Name Constants', () => {
    it('should export SMCTL constant', () => {
      expect(SMCTL).toBe('smctl');
      expect(typeof SMCTL).toBe('string');
    });

    it('should export SMTOOLS constant', () => {
      expect(SMTOOLS).toBe('smtools');
      expect(typeof SMTOOLS).toBe('string');
    });

    it('should export SMPKCS11 constant', () => {
      expect(SMPKCS11).toBe('smpkcs11');
      expect(typeof SMPKCS11).toBe('string');
    });

    it('should export SMCTK constant', () => {
      expect(SMCTK).toBe('smctk');
      expect(typeof SMCTK).toBe('string');
    });

    it('should export SCD constant', () => {
      expect(SCD).toBe('ssm-scd');
      expect(typeof SCD).toBe('string');
    });

    it('should have unique tool names', () => {
      const tools = [SMCTL, SMTOOLS, SMPKCS11, SMCTK, SCD];
      const uniqueTools = new Set(tools);
      
      expect(uniqueTools.size).toBe(tools.length);
    });

    it('should use lowercase names', () => {
      const tools = [SMCTL, SMTOOLS, SMPKCS11, SMCTK, SCD];
      
      tools.forEach(tool => {
        expect(tool).toBe(tool.toLowerCase());
      });
    });

    it('should not have spaces in tool names', () => {
      const tools = [SMCTL, SMTOOLS, SMPKCS11, SMCTK, SCD];
      
      tools.forEach(tool => {
        expect(tool).not.toContain(' ');
      });
    });
  });
});
