import { describe, it, expect } from 'vitest';
import { detectColumns, parseCSV, normalizeDate, parseAmount, mapRows } from './csvParser.js';

describe('detectColumns', () => {
  it('maps BNP headers', () => {
    const headers = ['Nº de séquence', 'Date d\'exécution', 'Date valeur', 'Montant', 'Devise du compte'];
    const mapping = detectColumns(headers);
    expect(mapping.sequence_number).toBe(0);
    expect(mapping.execution_date).toBe(1);
    expect(mapping.value_date).toBe(2);
    expect(mapping.amount).toBe(3);
    expect(mapping.currency).toBe(4);
  });

  it('maps Belfius headers', () => {
    const headers = ['Compte', 'Date de comptabilisation', 'Numéro d\'extrait', 'Montant', 'Devise'];
    const mapping = detectColumns(headers);
    expect(mapping.account_number).toBe(0);
    expect(mapping.accounting_date).toBe(1);
    expect(mapping.extract_number).toBe(2);
    expect(mapping.amount).toBe(3);
    expect(mapping.currency).toBe(4);
  });

  it('ignores unknown headers', () => {
    const headers = ['Unknown Column', 'Montant'];
    const mapping = detectColumns(headers);
    expect(mapping['unknown_column']).toBeUndefined();
    expect(mapping.amount).toBe(1);
  });
});

describe('parseCSV', () => {
  it('parses semicolon-separated CSV', () => {
    const text = 'A;B;C\n1;2;3\n4;5;6';
    const result = parseCSV(text);
    expect(result.headers).toEqual(['A', 'B', 'C']);
    expect(result.rows).toEqual([['1', '2', '3'], ['4', '5', '6']]);
  });

  it('parses comma-separated CSV', () => {
    const text = 'A,B,C\n1,2,3';
    const result = parseCSV(text);
    expect(result.headers).toEqual(['A', 'B', 'C']);
    expect(result.rows).toEqual([['1', '2', '3']]);
  });

  it('handles quoted fields with delimiters inside', () => {
    const text = '"Name, Full";Amount\n"Doe, John";100';
    const result = parseCSV(text);
    expect(result.headers).toEqual(['Name, Full', 'Amount']);
    expect(result.rows).toEqual([['Doe, John', '100']]);
  });

  it('respects skipLines', () => {
    const text = 'SKIP1\nSKIP2\nA;B\n1;2';
    const result = parseCSV(text, 2);
    expect(result.headers).toEqual(['A', 'B']);
    expect(result.rows).toEqual([['1', '2']]);
  });

  it('returns empty when skipLines exceeds line count', () => {
    const result = parseCSV('A;B\n1;2', 10);
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });
});

describe('normalizeDate', () => {
  it('converts DD-MM-YY', () => {
    expect(normalizeDate('31-12-25')).toBe('2025-12-31');
  });

  it('converts DD/MM/YYYY', () => {
    expect(normalizeDate('31/12/2025')).toBe('2025-12-31');
  });

  it('handles single digit day/month', () => {
    expect(normalizeDate('1-1-25')).toBe('2025-01-01');
  });

  it('returns empty for null', () => {
    expect(normalizeDate(null)).toBe('');
    expect(normalizeDate('')).toBe('');
  });
});

describe('parseAmount', () => {
  it('parses European format with comma decimal', () => {
    expect(parseAmount('-5532,58')).toBe(-5532.58);
  });

  it('parses standard format', () => {
    expect(parseAmount('100.50')).toBe(100.50);
  });

  it('handles spaces', () => {
    expect(parseAmount('1 000,50')).toBe(1000.50);
  });

  it('returns 0 for invalid', () => {
    expect(parseAmount('abc')).toBe(0);
    expect(parseAmount(null)).toBe(0);
  });
});

describe('mapRows', () => {
  it('maps rows according to columnMapping', () => {
    const rows = [['31-12-25', '-5532,58', 'ENOFUNTANAMANNA']];
    const mapping = { execution_date: 0, amount: 1, counterparty_name: 2 };
    const result = mapRows(rows, mapping);
    expect(result[0].execution_date).toBe('2025-12-31');
    expect(result[0].amount).toBe(-5532.58);
    expect(result[0].counterparty_name).toBe('ENOFUNTANAMANNA');
  });

  it('filters rows with no data', () => {
    const rows = [['', '', '']];
    const mapping = { execution_date: 0, amount: 1 };
    const result = mapRows(rows, mapping);
    expect(result).toEqual([]);
  });
});
