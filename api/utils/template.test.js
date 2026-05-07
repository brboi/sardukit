import { describe, it, expect } from 'vitest';
import { renderPrompt, renderColumnMappingPrompt, DEFAULT_PROMPT_TEMPLATE, DEFAULT_COLUMN_MAPPING_PROMPT } from './template.js';

describe('renderPrompt', () => {
  it('uses default template when none provided', () => {
    const context = { transactions: ['test1'], categories: ['Food'], tags: [] };
    const result = renderPrompt(null, context);
    expect(result).toContain('test1');
    expect(result).toContain('Food');
  });

  it('renders transaction list', () => {
    const template = 'Items:{{#context.transactions}}\n- {{.}}{{/context.transactions}}';
    const context = { transactions: ['Amazon', 'Uber'] };
    const result = renderPrompt(template, context);
    expect(result).toBe('Items:\n- Amazon\n- Uber');
  });

  it('renders categories with commas', () => {
    const template = 'Cats: {{#context.categories}}{{.}}, {{/context.categories}}';
    const context = { categories: ['Food', 'Transport'] };
    const result = renderPrompt(template, context);
    expect(result).toBe('Cats: Food, Transport, ');
  });

  it('renders tags', () => {
    const template = 'Tags: {{#context.tags}}{{.}}, {{/context.tags}}';
    const context = { tags: ['ecommerce', 'transport'] };
    const result = renderPrompt(template, context);
    expect(result).toBe('Tags: ecommerce, transport, ');
  });

  it('handles empty arrays gracefully', () => {
    const template = '{{#context.transactions}}item{{/context.transactions}}done';
    const context = { transactions: [] };
    const result = renderPrompt(template, context);
    expect(result).toBe('done');
  });

  it('includes all sections in default template', () => {
    const context = { transactions: ['desc1'], categories: ['Cat1'], tags: ['tag1'] };
    const result = renderPrompt(null, context);
    expect(result).toContain('desc1');
    expect(result).toContain('Cat1');
    expect(result).toContain('tag1');
    expect(result).toContain('Suggère UNE règle');
  });
});

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
