import { describe, it, expect } from 'vitest';
import { renderColumnMappingPrompt, DEFAULT_COLUMN_MAPPING_PROMPT } from './template.js';

describe('renderColumnMappingPrompt', () => {
  it('uses default template when none provided', () => {
    const result = renderColumnMappingPrompt(null, ['Date', 'Amount']);
    expect(result).toContain('Date');
    expect(result).toContain('Amount');
  });

  it('renders header list with dashes', () => {
    const template = 'Headers:{{#context.headers}}\n- {{.}}{{/context.headers}}';
    const result = renderColumnMappingPrompt(template, ['Col1', 'Col2']);
    expect(result).toBe('Headers:\n- Col1\n- Col2');
  });

  it('renders single header', () => {
    const result = renderColumnMappingPrompt(null, ['Date']);
    expect(result).toContain('- Date');
  });

  it('handles empty headers array', () => {
    const template = '{{#context.headers}}item{{/context.headers}}done';
    const result = renderColumnMappingPrompt(template, []);
    expect(result).toBe('done');
  });

  it('includes mapping structure in default template', () => {
    const result = renderColumnMappingPrompt(null, ['Test']);
    expect(result).toContain('Mappe chaque en-tête');
    expect(result).toContain('Test');
  });
});
