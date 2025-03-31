#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { AppUI } from './components/App.js';
import { CommandRegistry } from './cli/CommandRegistry.js';
import { App } from './App.js';

async function main() {
  try {
    const registry = new CommandRegistry();
    const app = new App(registry);
    
    // Get all arguments after the script name, ignoring any '--' separator
    const args = process.argv
      .slice(2)
      .filter(arg => arg !== '--');

    const result = await app.run(args);

    if (!result.success) {
      // Handle both message and error properties
      const errorMessage = result.message || result.error || 'Command failed';
      console.error(errorMessage);
      process.exit(1);
    }

    // If we have output, render it with Ink
    if (result.output) {
      console.log(result.output);
    }

    // If we have a success message, show it
    if (result.message) {
      console.log(result.message);
    }

    // If no output and success, just exit
    if (!result.output && !result.message) {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 