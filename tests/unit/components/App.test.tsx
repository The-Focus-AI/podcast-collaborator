import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { AppUI } from '../../../src/components/App.js';

describe('AppUI component', () => {
  it('should render welcome message', () => {
    const { lastFrame } = render(<AppUI />);
    expect(lastFrame()).toContain('Welcome to Podcast Collaborator');
  });
}); 