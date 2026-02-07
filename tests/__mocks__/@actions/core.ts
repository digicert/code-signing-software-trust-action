/**
 * Mock for @actions/core module
 * Used in tests to avoid actual GitHub Actions API calls
 */

export const mockInputs = new Map<string, string>([
  ['cache-version', '1.0.0'],
  ['digicert-cdn', 'https://cdn.digicert.com'],
]);
export const mockOutputs = new Map<string, string>();
export const mockSecrets = new Map<string, string>();
export const mockVariables = new Map<string, string>();
export const mockPaths: string[] = [];
export const mockFailures: string[] = [];

// Alias for easier access in tests
export const addedPaths = mockPaths;

export const getInput = jest.fn((name: string, options?: { required?: boolean }): string => {
  const value = mockInputs.get(name) || '';
  if (options?.required && !value) {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  return value;
});

export const getBooleanInput = jest.fn((name: string, options?: { required?: boolean }): boolean => {
  const value = getInput(name, options);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return false;
});

export const getMultilineInput = jest.fn((name: string, options?: { required?: boolean }): string[] => {
  const value = getInput(name, options);
  return value ? value.split('\n').map(s => s.trim()).filter(s => s) : [];
});

export const setOutput = jest.fn((name: string, value: any): void => {
  mockOutputs.set(name, value);
});

export const setFailed = jest.fn((message: string | Error): void => {
  mockFailures.push(typeof message === 'string' ? message : message.message);
});

export const setSecret = jest.fn((secret: string): void => {
  mockSecrets.set(secret, secret);
});

export const exportVariable = jest.fn((name: string, val: any): void => {
  mockVariables.set(name, String(val));
});

export const addPath = jest.fn((inputPath: string): void => {
  mockPaths.push(inputPath);
});

export const info = jest.fn((message: string): void => {
  // console.log(`[INFO] ${message}`);
});

export const warning = jest.fn((message: string | Error): void => {
  // console.warn(`[WARN] ${typeof message === 'string' ? message : message.message}`);
});

export const error = jest.fn((message: string | Error): void => {
  // console.error(`[ERROR] ${typeof message === 'string' ? message : message.message}`);
});

export const debug = jest.fn((message: string): void => {
  // console.debug(`[DEBUG] ${message}`);
});

export const notice = jest.fn((message: string): void => {
  // console.log(`[NOTICE] ${message}`);
});

export const startGroup = jest.fn((name: string): void => {
  // console.log(`::group::${name}`);
});

export const endGroup = jest.fn((): void => {
  // console.log('::endgroup::');
});

export const saveState = jest.fn((name: string, value: any): void => {
  // Save state for post-action cleanup
});

export const getState = jest.fn((name: string): string => {
  return '';
});

// Mock platform object
export const platform = {
  platform: process.platform,
  arch: process.arch,
};

// Reset function for use between tests
export const resetMocks = (): void => {
  mockInputs.clear();
  mockOutputs.clear();
  mockSecrets.clear();
  mockVariables.clear();
  mockPaths.length = 0;
  mockFailures.length = 0;
  
  jest.clearAllMocks();
};

export default {
  getInput,
  getBooleanInput,
  getMultilineInput,
  setOutput,
  setFailed,
  setSecret,
  exportVariable,
  addPath,
  info,
  warning,
  error,
  debug,
  notice,
  startGroup,
  endGroup,
  saveState,
  getState,
  platform,
};
