// app.js — Expense Tracker
// Modules: Store, Validator, render functions, Controller

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'et_transactions';
const CURRENCY_SYMBOL = '$';
const CATEGORIES = ['Food', 'Transport', 'Fun'];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
let _transactions = [];
let _insertionIndex = 0;

const Store = {
  /** Returns a shallow copy of the transaction array. */
  getAll() {
    return [..._transactions];
  },

  /**
   * Appends a transaction and immediately persists to localStorage.
   * @param {Transaction} tx
   */
  add(tx) {
    tx.index = _insertionIndex++;
    _transactions.push(tx);
    Store.persist();
  },

  /**
   * Removes the transaction with the given id and immediately persists.
   * @param {string} id
   */
  delete(id) {
    _transactions = _transactions.filter(t => t.id !== id);
    Store.persist();
  },

  /**
   * Reads and validates transactions from localStorage.
   * @returns {{ ok: boolean, error?: Error }}
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        _transactions = [];
        return { ok: true };
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        _transactions = [];
        return { ok: false, error: new Error('Stored data is not an array') };
      }
      // Validate each item has required Transaction shape
      for (const item of parsed) {
        if (
          typeof item.id !== 'string' ||
          typeof item.name !== 'string' ||
          typeof item.amount !== 'number' ||
          typeof item.category !== 'string' ||
          typeof item.timestamp !== 'number' ||
          typeof item.index !== 'number'
        ) {
          _transactions = [];
          return { ok: false, error: new Error('Stored data contains invalid Transaction shape') };
        }
      }
      _transactions = parsed;
      // Re-sync _insertionIndex so new transactions get unique indices
      if (parsed.length > 0) {
        _insertionIndex = Math.max(...parsed.map(t => t.index)) + 1;
      }
      return { ok: true };
    } catch (error) {
      _transactions = [];
      return { ok: false, error };
    }
  },

  /**
   * Serialises current transactions to localStorage.
   * @returns {{ ok: boolean, error?: Error }}
   */
  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_transactions));
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  },

  /**
   * Returns the sum of all transaction amounts.
   * @returns {number}
   */
  total() {
    return _transactions.reduce((sum, t) => sum + t.amount, 0);
  },

  /**
   * Returns a Map of category → summed amount.
   * @returns {Map<string, number>}
   */
  byCategory() {
    const map = new Map();
    for (const t of _transactions) {
      const key = t.category || 'Uncategorized';
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    return map;
  },
};

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------
const Validator = {
  /**
   * Validates all form fields in a single pass.
   * @param {string} name
   * @param {string|number} amount
   * @param {string} category
   * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
   */
  validateForm(name, amount, category) {
    const errors = {};

    if (!name || String(name).trim() === '') {
      errors.name = 'Item name is required.';
    }

    const numericAmount = Number(amount);
    if (amount === '' || amount === null || amount === undefined || !isFinite(numericAmount) || numericAmount <= 0) {
      errors.amount = 'Amount must be a positive number.';
    }

    if (!CATEGORIES.includes(category)) {
      errors.category = 'Please select a valid category (Food, Transport, or Fun).';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  },
};

// ---------------------------------------------------------------------------
// Export for testing (ES module)
// ---------------------------------------------------------------------------
export { Store, Validator, STORAGE_KEY, CURRENCY_SYMBOL, CATEGORIES };
