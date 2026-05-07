import { describe, it, expect } from 'vitest';
import { ColumnMappingSchema } from './column-mapping.js';

describe('ColumnMappingSchema', () => {
  it('parses a valid column mapping', () => {
    const input = {
      mapping: [
        { header: 'Date', field: 'execution_date' },
        { header: 'Montant', field: 'amount' },
      ],
    };
    const result = ColumnMappingSchema.parse(input);
    expect(result).toEqual(input);
  });

  it('rejects non-string values in mapping', () => {
    const input = {
      mapping: [
        { header: 'Date', field: 123 },
      ],
    };
    expect(() => ColumnMappingSchema.parse(input)).toThrow();
  });

  it('accepts empty mapping', () => {
    const input = { mapping: [] };
    const result = ColumnMappingSchema.parse(input);
    expect(result).toEqual(input);
  });
});
