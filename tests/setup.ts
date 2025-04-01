import { expect, vi, beforeEach } from 'vitest';
import '@testing-library/react';

// Mock process.env
process.env = {
  ...process.env,
  DEBUG: '1', // Enable debug logging in tests
};

// Add custom matchers
expect.extend({
  toBeCalledWithMatch(received, ...expected) {
    const pass = vi.mocked(received).mock.calls.some((call: unknown[]) =>
      expected.every((arg, i) => {
        if (typeof arg === 'object' && arg !== null) {
          return expect.objectContaining(arg).asymmetricMatch(call[i]);
        }
        return arg === call[i];
      })
    );

    return {
      pass,
      message: () =>
        `expected ${this.utils.printReceived(received)} ${
          pass ? 'not ' : ''
        }to be called with arguments matching ${this.utils.printExpected(expected)}`,
    };
  },
});

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
}); 