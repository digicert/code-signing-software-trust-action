# Testing Guide

## Overview

This directory contains the test suite for the `code-signing-software-trust-action` GitHub Action. We use a three-layer testing strategy:

1. **Unit Tests** (`tests/unit/`) - Fast, isolated tests for individual functions
2. **Integration Tests** (`tests/integration/`) - Tests with mocked external dependencies
3. **E2E Tests** (`.github/workflows/e2e-*.yml`) - Full workflow tests on real GitHub runners

## Prerequisites

First, install the testing dependencies:

```bash
npm install --save-dev jest @types/jest ts-jest @jest/globals nock @types/nock
```

## Running Tests

### Run all tests
```bash
npm test
```

### Watch mode (auto-rerun on file changes)
```bash
npm run test:watch
```

### With coverage report
```bash
npm run test:coverage
```

### Run only unit tests
```bash
npm run test:unit
```

### Run only integration tests
```bash
npm run test:integration
```

### Run specific test file
```bash
npm test -- utils.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="randomFileName"
```

## Test Structure

```
tests/
├── unit/               # Pure unit tests (no external dependencies)
│   ├── utils.test.ts          # Tests for utility functions
│   ├── tool_setup.test.ts     # Tests for tool setup logic
│   └── file_operations.test.ts # Tests for file operations
├── integration/        # Integration tests (mocked external deps)
│   ├── cdn_download.test.ts   # CDN download with mocked HTTP
│   └── windows_registry.test.ts # Windows registry setup tests
├── fixtures/           # Test data and sample files
│   ├── sample-files/
│   └── mock-responses/
├── __mocks__/          # Manual mocks for modules
│   └── @actions/
│       └── core.ts    # Mock for GitHub Actions core API
└── README.md          # This file
```

## Writing Tests

### Unit Test Example

```typescript
import { myFunction } from '../../src/my-module';

describe('myFunction', () => {
  it('should do something specific', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(() => myFunction('')).toThrow('Invalid input');
  });
});
```

### Integration Test with Mocked HTTP

```typescript
import nock from 'nock';
import { downloadFromCDN } from '../../src/downloader';

describe('CDN Download', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  it('should download file from CDN', async () => {
    nock('https://cdn.example.com')
      .get('/file.zip')
      .reply(200, Buffer.from('fake content'));

    const result = await downloadFromCDN('file.zip');
    expect(result).toBeDefined();
  });
});
```

### Using Mocked @actions/core

```typescript
import * as core from '@actions/core';
import { mockInputs, resetMocks } from '../__mocks__/@actions/core';

// Tell Jest to use our mock
jest.mock('@actions/core');

describe('Action Logic', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should read input values', () => {
    // Setup mock inputs
    mockInputs.set('my-input', 'test-value');

    // Your test code that calls core.getInput()
    const value = core.getInput('my-input');
    expect(value).toBe('test-value');
  });
});
```

## Platform-Specific Tests

Some tests only make sense on certain platforms. Use conditional logic to skip them:

```typescript
it('should set execute permissions on Linux/Mac', async () => {
  if (process.platform === 'win32') {
    return; // Skip on Windows
  }

  // Test Unix-specific functionality
  await chmod(filePath);
  const stats = await fs.stat(filePath);
  expect(stats.mode & 0o111).toBeGreaterThan(0);
});
```

## Async Tests

Always use `async/await` for asynchronous tests:

```typescript
it('should download file asynchronously', async () => {
  const result = await downloadFile('test.zip');
  expect(result).toBeDefined();
});
```

## Test Cleanup

Always clean up resources in `afterEach` or `afterAll`:

```typescript
describe('File Operations', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createSecureTempDir();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should create files in temp directory', async () => {
    // Test code using tempDir
  });
});
```

## Coverage

We aim for:
- **60% coverage minimum** (enforced in CI)
- **80% coverage target** for critical paths
- **100% coverage** for security-sensitive code (e.g., temp file creation, registry operations)

View coverage report:
```bash
npm run test:coverage
# Open coverage/index.html in browser for detailed report
```

## Common Issues

### Issue: `Cannot find name 'describe'` or `Cannot find name 'it'`

**Solution**: Make sure Jest types are installed:
```bash
npm install --save-dev @types/jest
```

### Issue: Tests timeout

**Solution**: Increase timeout for slow operations:
```typescript
it('should complete slow operation', async () => {
  // Test code
}, 30000); // 30 second timeout
```

Or globally in `jest.config.js`:
```javascript
testTimeout: 30000
```

### Issue: Module not found errors

**Solution**: Check that your `jest.config.js` has correct `roots` and `moduleNameMapper` settings.

### Issue: Mocks not working

**Solution**: Make sure you call `jest.mock()` BEFORE importing the module:
```typescript
jest.mock('@actions/core');  // Must be at top, before imports
import * as core from '@actions/core';
```

## Best Practices

1. **One assertion per test** - Makes failures easier to diagnose
2. **Descriptive test names** - Use "should [expected behavior]" format
3. **Arrange-Act-Assert pattern**:
   ```typescript
   it('should do something', () => {
     // Arrange: Setup
     const input = 'test';
     
     // Act: Execute
     const result = myFunction(input);
     
     // Assert: Verify
     expect(result).toBe('expected');
   });
   ```
4. **Test both happy path and error cases**
5. **Keep tests independent** - No test should depend on another
6. **Use beforeEach/afterEach** for setup/cleanup
7. **Mock external dependencies** - Don't make real HTTP calls or file system changes outside temp directories

## Continuous Integration

Tests run automatically on:
- Every pull request
- Every push to main branch
- Nightly schedule (for E2E tests)

See `.github/workflows/` for CI configuration.

## Contributing

When adding new code:
1. Write tests FIRST (TDD approach recommended)
2. Ensure all tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Add tests to cover new code paths
5. Update this README if adding new test patterns or tools

## Questions?

If you have questions about testing:
1. Check existing tests for examples
2. Review Jest documentation: https://jestjs.io/
3. Ask in pull request comments
4. Consult the TODO_CI_CD_AND_TESTING.md document

Happy testing! 🧪
