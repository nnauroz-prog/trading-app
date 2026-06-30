import { describe, it, expect, afterEach } from 'vitest';
import { thesportsdbKey, isUsingTestKey, thesportsdbBase } from '@/lib/sport/sportsdb-config';

const ORIGINAL = process.env.THESPORTSDB_KEY;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.THESPORTSDB_KEY;
  else process.env.THESPORTSDB_KEY = ORIGINAL;
});

describe('sportsdb-config', () => {
  it('faellt ohne Env-Var auf den Gratis-Test-Key "3" zurueck', () => {
    delete process.env.THESPORTSDB_KEY;
    expect(thesportsdbKey()).toBe('3');
    expect(isUsingTestKey()).toBe(true);
  });

  it('leerer/whitespace-Key zaehlt als kein Key', () => {
    process.env.THESPORTSDB_KEY = '   ';
    expect(thesportsdbKey()).toBe('3');
    expect(isUsingTestKey()).toBe(true);
  });

  it('nutzt einen gesetzten Premium-Key', () => {
    process.env.THESPORTSDB_KEY = '987654';
    expect(thesportsdbKey()).toBe('987654');
    expect(isUsingTestKey()).toBe(false);
  });

  it('baut die Basis-URL mit dem aktiven Key', () => {
    process.env.THESPORTSDB_KEY = 'abc';
    expect(thesportsdbBase()).toBe('https://www.thesportsdb.com/api/v1/json/abc');
    delete process.env.THESPORTSDB_KEY;
    expect(thesportsdbBase()).toBe('https://www.thesportsdb.com/api/v1/json/3');
  });
});
