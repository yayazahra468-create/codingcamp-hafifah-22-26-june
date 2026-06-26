// app.test.js — Expense Tracker tests
// Covers: Store (Properties 6, 7) and Store edge-case unit tests

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { Store, STORAGE_KEY } from './app.js';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------
function makeLocalStorageMock() {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

// ---------------------------------------------------------------------------
// Arbitrary: valid Transaction object
// ---------------------------------------------------------------------------
const validTransactionArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1 }).map(s => s.trim()).filter(s => s.length > 0),
  amount: fc.float({ min: 0.01, max: 1_000_000, noNaN: true }).filter(n => isFinite(n) && n > 0),
  category: fc.constantFrom('Food', 'Transport', 'Fun'),
  timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  index: fc.nat(),
});

// ---------------------------------------------------------------------------
// Helper: reset Store internals between tests by reloading from a fresh mock
// ---------------------------------------------------------------------------
function resetStore(localStorageMock) {
  global.localStorage = localStorageMock;
  localStorageMock.clear();
  // Force _transactions to [] by loading from empty localStorage
  Store.load();
}

// ---------------------------------------------------------------------------
// Subtask 2.2 — Property 6: Every mutation immediately persists to localStorage
// Feature: expense-tracker, Property 6: Every mutation immediately persists to localStorage
// ---------------------------------------------------------------------------
describe('Property 6: Every mutation immediately persists to localStorage', () => {
  let lsMock;

  beforeEach(() => {
    lsMock = makeLocalStorageMock();
    resetStore(lsMock);
  });

  it('persists after Store.add() and Store.delete()', () => {
    // Validates: Requirements 2.1, 2.2
    fc.assert(
      fc.property(validTransactionArb, (tx) => {
        resetStore(lsMock);

        // add
        Store.add(tx);
        const afterAdd = JSON.parse(lsMock.getItem(STORAGE_KEY));
        if (!Array.isArray(afterAdd) || !afterAdd.some(t => t.id === tx.id)) {
          return false;
        }

        // delete
        Store.delete(tx.id);
        const afterDelete = JSON.parse(lsMock.getItem(STORAGE_KEY));
        if (!Array.isArray(afterDelete) || afterDelete.some(t => t.id === tx.id)) {
          return false;
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Subtask 2.3 — Property 7: Load round-trip preserves all transactions
// Feature: expense-tracker, Property 7: Load round-trip preserves all transactions
// ---------------------------------------------------------------------------
describe('Property 7: Load round-trip preserves all transactions', () => {
  let lsMock;

  beforeEach(() => {
    lsMock = makeLocalStorageMock();
    global.localStorage = lsMock;
  });

  it('Store.load() returns all stored transactions intact', () => {
    // Validates: Requirement 2.3
    fc.assert(
      fc.property(fc.array(validTransactionArb), (transactions) => {
        lsMock.clear();
        // Write array directly to localStorage
        lsMock.setItem(STORAGE_KEY, JSON.stringify(transactions));

        const result = Store.load();
        if (!result.ok) return false;

        const loaded = Store.getAll();
        if (loaded.length !== transactions.length) return false;

        // Every original transaction must be present with identical fields
        return transactions.every(orig =>
          loaded.some(
            t =>
              t.id === orig.id &&
              t.name === orig.name &&
              t.amount === orig.amount &&
              t.category === orig.category &&
              t.timestamp === orig.timestamp &&
              t.index === orig.index
          )
        );
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Subtask 2.4 — Unit tests for Store edge cases
// ---------------------------------------------------------------------------
describe('Store edge cases', () => {
  let lsMock;

  beforeEach(() => {
    lsMock = makeLocalStorageMock();
    resetStore(lsMock);
  });

  it('Storage unavailable — load() returns { ok: false } and getAll() returns []', () => {
    // Validates: Requirement 2.4
    const throwingMock = {
      ...lsMock,
      getItem: () => { throw new Error('Storage unavailable'); },
    };
    global.localStorage = throwingMock;

    const result = Store.load();
    expect(result.ok).toBe(false);
    expect(Store.getAll()).toEqual([]);
  });

  it('Corrupt JSON — load() returns { ok: false } and getAll() returns []', () => {
    // Validates: Requirement 2.4
    lsMock.setItem(STORAGE_KEY, 'not valid json{{{');
    global.localStorage = lsMock;

    const result = Store.load();
    expect(result.ok).toBe(false);
    expect(Store.getAll()).toEqual([]);
  });

  it('Empty list — total() returns 0', () => {
    // Validates: Requirement 5.4
    expect(Store.total()).toBe(0);
  });

  it('Empty list — byCategory() returns an empty Map', () => {
    // Validates: Requirement 5.4
    const map = Store.byCategory();
    expect(map instanceof Map).toBe(true);
    expect(map.size).toBe(0);
  });
});
