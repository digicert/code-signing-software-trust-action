/**
 * Mock implementation of @actions/exec
 * Used for testing command execution functionality
 */

// Mock state storage
const mockExecutedCommands: Array<{ command: string; args: string[]; output: string }> = [];

export const getExecOutput = jest.fn(async (commandLine: string, args?: string[], options?: any): Promise<any> => {
  const command = {
    command: commandLine,
    args: args || [],
    output: 'Mock execution output',
  };
  
  mockExecutedCommands.push(command);
  
  return {
    exitCode: 0,
    stdout: 'Mock stdout output',
    stderr: '',
  };
});

export const exec = jest.fn(async (commandLine: string, args?: string[], options?: any): Promise<number> => {
  const command = {
    command: commandLine,
    args: args || [],
    output: 'Mock execution',
  };
  
  mockExecutedCommands.push(command);
  
  return 0; // Success
});

/**
 * Reset all mocks and clear mock state
 */
export function resetMocks() {
  getExecOutput.mockClear();
  exec.mockClear();
  mockExecutedCommands.length = 0;
}

/**
 * Get all executed commands (for testing assertions)
 */
export function getExecutedCommands() {
  return [...mockExecutedCommands];
}

export default {
  getExecOutput,
  exec,
};
