# Design Document — Expense Tracker

## Overview

The Expense Tracker is a fully client-side single-page web application implemented in plain HTML, CSS, and Vanilla JavaScript. There is no build pipeline, no framework, and no backend. All state lives in memory during the session and is persisted to the browser's `localStorage` API so it survives page reloads.

The app lets users:
- Log expense transactions (name + amount + category).
- See a running total balance.
- Browse a reverse-chronological transaction list and delete individual items.
- Visualize category spending through a canvas-drawn pie chart.

Because the entire application ships as a single `index.html` file (with optional companion `.css`/`.js` files or inline `<style>` / `<script>` blocks), it works identically whether served over HTTP/HTTPS or opened directly via `file://`.

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| No framework | Vanilla JS + DOM APIs | Zero tooling overhead; works `file://` with no CORS complications |
| Chart rendering | HTML5 `<canvas>` + 2D context | No external library needed; works in all target browsers |
| Persistence | `localStorage` JSON | Synchronous, well-supported, sufficient for small datasets |
| Module pattern | IIFE / ES module `<script type="module">` | Avoids global namespace pollution without a bundler |
| Currency symbol | Configurable constant (`CURRENCY_SYMBOL`) | Single change-point; defaults to `$` |

---

## Architecture

The app follows a lightweight **MVC-like** structure where:

- **Model** — a pure in-memory array of `Transaction` objects managed by a `Store` module.
- **View** — a set of render functions that read from the store and write directly to the DOM; they are side-effect-only and never mutate state.
- **Controller** — event listeners wired in an `init()` function that call model operations then trigger view re-renders.

There is no virtual DOM and no reactive binding framework. Re-renders are full sub-tree replacements for the transaction list, and targeted updates for the balance and chart.

```
┌─────────────────────────────────────────────────────┐
│                     index.html                      │
│                                                     │
│  ┌──────────┐   events   ┌──────────────────────┐   │
│  │  DOM /   │◄──────────►│    Controller        │   │
│  │  View    │            │  (event listeners,   │   │
│  │ (render  │            │   init, validate)    │   │
│  │  fns)    │            └──────────┬───────────┘   │
│  └──────────┘                       │ calls         │
│       ▲                    ┌────────▼──────────┐    │
│       │ reads              │      Store        │    │
│       └────────────────────│  (transactions[]) │    │
│                            └────────┬──────────┘    │
│                                     │ JSON           │
│                            ┌────────▼──────────┐    │
│                            │   localStorage    │    │
│                            └───────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### File Layout

```
expense-tracker/
├── index.html        ← markup + wires <link> and <script>
├── style.css         ← all visual styling
└── app.js            ← Store, Validator, Controller, render functions
```

All three files can also be collapsed into a single `index.html` using inline `<style>` and `<script>` tags if a single-file distribution is preferred.

---

## Components and Interfaces

### 1. Store

The central state container. Exposes a simple imperative API; all functions are synchronous.

```js
// Internal state
let _transactions = [];            // Transaction[]
const STORAGE_KEY = 'et_transactions';
const CURRENCY_SYMBOL = '$';

// Public API
Store.getAll()          → Transaction[]  // Returns a shallow copy
Store.add(tx)           → void           // Appends, then persists
Store.delete(id)        → void           // Removes by id, then persists
Store.load()            → { ok: boolean, error?: Error }
                                         // Reads localStorage; returns status
Store.persist()         → { ok: boolean, error?: Error }
                                         // Writes localStorage; returns status
Store.total()           → number         // Sum of all amounts
Store.byCategory()      → Map<string, number>
                                         // Category → summed amount
```

`Store.load()` is called once during `init()`. If `localStorage` is unavailable or the stored value is not a valid JSON array of Transaction-shaped objects, it returns `{ ok: false }`, leaves `_transactions` as `[]`, and the controller shows the storage-unavailable banner.

### 2. Validator

Pure functions; no side effects; no DOM access.

```js
Validator.validateForm(name, amount, category)
  → { valid: boolean, errors: { name?: string, amount?: string, category?: string } }
```

Validation rules applied simultaneously in a single pass (satisfies Req 1.7):

| Field | Rules |
|---|---|
| `name` | Non-empty after trimming |
| `amount` | Parseable as a finite number AND > 0 |
| `category` | One of `['Food', 'Transport', 'Fun']` |

### 3. Controller (init + event handlers)

Wired in `init()` which runs on `DOMContentLoaded`.

```js
init()
  - Store.load()        → if !ok: showStorageBanner()
  - renderAll()

handleFormSubmit(event)
  - event.preventDefault()
  - read form values
  - Validator.validateForm(...)
  - if errors: showFormErrors(errors); return   // preserves field values (Req 1.6)
  - Store.add(tx)
  - clearFormErrors()
  - resetForm()
  - renderAll()

handleDeleteClick(id)
  - snapshot = Store.getAll()        // keep for rollback
  - Store.delete(id)
  - result = Store.persist()
  - if !result.ok:
      Store._transactions = snapshot  // restore
      showDeleteError()
      renderAll()
      return
  - renderAll()

handlePageFocus()                     // window 'focus' event (Req 2.5)
  - if Store.getAll() not empty but list DOM is empty: renderAll()
```

### 4. View / Render Functions

All render functions take no arguments — they read from `Store` directly.

```js
renderAll()
  → renderTransactionList()
  → renderBalance()
  → renderPieChart()

renderTransactionList()
  - Reads Store.getAll()
  - Sorts reverse-chronological (by timestamp desc, then index desc)
  - Replaces innerHTML of #transaction-list container
  - If empty: renders placeholder text (Req 3.3)

renderBalance()
  - Reads Store.total()
  - Updates #balance text node: `${CURRENCY_SYMBOL}${total.toFixed(2)}`
  - #balance is aria-live="polite" (Req 8.3)

renderPieChart()
  - Reads Store.byCategory()
  - If empty or all-zero: draws no-data message on canvas + keeps legend (Req 6.4–6.6)
  - Otherwise: draws segments with assigned category colors, draws legend

showFormErrors(errors)
  - Injects <span class="error"> adjacent to each invalid field
  - Does NOT clear valid field values (Req 1.6)

clearFormErrors()
  - Removes all .error spans

showStorageBanner()
  - Creates a fixed/sticky banner element, auto-removes after 5s (Req 2.4)

showDeleteError()
  - Displays inline error near the transaction list
```

### 5. Pie Chart Renderer

Drawn on a `<canvas>` element using the 2D Canvas API. No third-party charting library.

Algorithm:
1. Compute `total = sum of all category amounts`.
2. For each category with amount > 0, compute `slice_angle = (amount / total) * 2π`.
3. Draw arc segments using `ctx.arc()`, cycling through the pre-defined color palette.
4. Draw an HTML legend below (or beside) the canvas, pairing color swatches with category names.
5. If total is 0 or `byCategory()` is empty: clear canvas, draw centered "No data available" text; legend remains.

Category color palette (fixed, unique):

| Category | Color |
|---|---|
| Food | `#FF6384` |
| Transport | `#36A2EB` |
| Fun | `#FFCE56` |
| Uncategorized | `#9966FF` |

---

## Data Models

### Transaction

```js
/**
 * @typedef {Object} Transaction
 * @property {string}  id         - Unique ID: crypto.randomUUID() or Date.now() + Math.random() fallback
 * @property {string}  name       - Trimmed, non-empty item name
 * @property {number}  amount     - Positive finite number (stored as JS number)
 * @property {string}  category   - 'Food' | 'Transport' | 'Fun'
 * @property {number}  timestamp  - Date.now() at creation time (ms since epoch)
 * @property {number}  index      - Insertion index (monotonically increasing counter)
 */
```

**Sort order** (Req 3.4): sort descending by `timestamp`, break ties by descending `index`.

**Persistence format** (localStorage key `et_transactions`): JSON-serialized array of Transaction objects. Example:

```json
[
  {
    "id": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    "name": "Coffee",
    "amount": 4.5,
    "category": "Food",
    "timestamp": 1718000000000,
    "index": 0
  }
]
```

### Validation Rules (as data)

```js
const CATEGORIES = ['Food', 'Transport', 'Fun'];
const CURRENCY_SYMBOL = '$';
const STORAGE_KEY = 'et_transactions';
const STORAGE_TIMEOUT_MS = 100;      // Req 2.1 / 2.2 — persist within 100ms
const CHART_UPDATE_MS = 300;         // Req 6.2 / 6.3 — chart update within 300ms
```

---

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid submission adds to list

*For any* valid transaction (non-empty name, positive numeric amount, recognized category), adding it via `Store.add()` must result in the transaction being present in `Store.getAll()` and the total length increasing by exactly one.

**Validates: Requirements 1.2**

---

### Property 2: Validator reports all field errors simultaneously

*For any* combination of field values where one or more fields are empty, non-positive, or non-numeric, `Validator.validateForm()` must return error entries for *every* invalid field in a single call — never only a subset of the applicable errors.

**Validates: Requirements 1.3, 1.7**

---

### Property 3: Invalid amount always produces amount error

*For any* value that is non-numeric, zero, negative, `NaN`, or `Infinity`, `Validator.validateForm()` must return an `amount` error, regardless of the values of the other fields.

**Validates: Requirements 1.4**

---

### Property 4: Successful add resets form fields

*For any* valid transaction added through the form submission handler, all form fields (name, amount, category) must be reset to their default empty/unselected values after the operation completes.

**Validates: Requirements 1.5**

---

### Property 5: Rejected submission preserves field values

*For any* form submission that is rejected by the Validator, the values in each form field must remain identical to the values that were present at the time of the rejected submission.

**Validates: Requirements 1.6**

---

### Property 6: Every mutation immediately persists to localStorage

*For any* transaction added via `Store.add()` or deleted via `Store.delete()`, calling `localStorage.getItem(STORAGE_KEY)` immediately afterwards (same synchronous execution context) must return a JSON string whose parsed array reflects the post-mutation state.

**Validates: Requirements 2.1, 2.2**

---

### Property 7: Load round-trip preserves all transactions

*For any* non-empty array of valid Transaction objects written to `localStorage` under the storage key, calling `Store.load()` must return `{ ok: true }` and make `Store.getAll()` return an array containing all the same transactions (same ids, names, amounts, categories, timestamps, indices).

**Validates: Requirements 2.3**

---

### Property 8: Transaction list renders correct formatted fields

*For any* transaction, the rendered list item HTML must contain:
- the transaction's `name` string verbatim,
- the `amount` formatted as `${CURRENCY_SYMBOL}${amount.toFixed(2)}`,
- the `category` label (or "Uncategorized" if absent).

**Validates: Requirements 3.1, 3.5**

---

### Property 9: Transaction list is sorted reverse-chronologically

*For any* array of transactions with varying `timestamp` and `index` values, after rendering, the order of displayed items must be strictly descending by `timestamp`; among transactions sharing the same `timestamp`, order must be strictly descending by `index`.

**Validates: Requirements 3.4**

---

### Property 10: Every transaction entry has a delete control

*For any* non-empty set of transactions, every rendered list item must contain a delete control element (button or equivalent interactive element).

**Validates: Requirements 4.1**

---

### Property 11: Deletion removes transaction from state and storage

*For any* transaction currently in `Store.getAll()`, after calling `Store.delete(id)`, the transaction must be absent from both `Store.getAll()` and from the parsed contents of `localStorage.getItem(STORAGE_KEY)`.

**Validates: Requirements 4.2**

---

### Property 12: Balance always equals sum of current transactions

*For any* set of transactions in the store, `Store.total()` must equal the arithmetic sum of all `amount` values, and the rendered balance text must equal `${CURRENCY_SYMBOL}${Store.total().toFixed(2)}`.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

---

### Property 13: Pie chart segments are proportional and uniquely colored

*For any* non-empty mapping of categories to summed amounts, the computed arc angle for each category segment must equal `(categoryAmount / totalAmount) * 2π` (within floating-point tolerance), and no two distinct categories may share the same color value.

**Validates: Requirements 6.1**

---

### Property 14: Chart legend is always visible

*For any* application state — whether the transaction list is empty or non-empty — the legend element must be present and visible in the DOM.

**Validates: Requirements 6.7**

---

## Error Handling

### Storage Unavailable or Corrupt (Req 2.4)

`Store.load()` wraps the `localStorage` access in a `try/catch`. Two failure modes are handled identically:
1. `localStorage.getItem()` throws (storage blocked/unavailable).
2. `JSON.parse()` throws, or the result is not an array, or array items fail the Transaction shape check.

In both cases `Store.load()` returns `{ ok: false }`, `_transactions` stays `[]`, and the controller calls `showStorageBanner()` which renders a fixed-position, non-blocking banner that auto-removes after 5 seconds via `setTimeout`.

### Persist Failures (Req 2.1, 2.2, 4.5)

`Store.persist()` wraps `localStorage.setItem()` in a `try/catch` and returns `{ ok, error? }`. On failure:
- `handleDeleteClick` re-applies the pre-delete snapshot to `_transactions`, calls `renderAll()`, and calls `showDeleteError()`.
- `Store.add()` — per requirements, there is no rollback mandate on add failures; the transaction remains in memory and the user is not blocked (silent degradation). This is documented in code comments.

### Render Failure Recovery (Req 2.5)

If `renderTransactionList()` throws (e.g., a detached DOM node), the controller catches the error and schedules a re-render on the next `window focus` event via `handlePageFocus()`. In-memory `_transactions` is never cleared on a render failure.

### Delete Runtime Errors (Req 4.5)

The entire `handleDeleteClick` body is wrapped in a `try/catch`. Any unexpected runtime error triggers the same rollback + `showDeleteError()` path as a storage failure.

### Form Validation Display

`showFormErrors()` inserts `<span class="field-error" role="alert">` elements adjacent to each invalid field. `role="alert"` causes screen readers to announce errors immediately (supports Req 8.3 accessibility).

---

## Testing Strategy

### Unit Tests (example-based)

Use a lightweight test runner — **Vitest** or plain `assert`-style tests runnable with Node.js without a bundler. Mock `localStorage` with a simple in-memory object.

Specific examples to cover:

| Test | What it verifies |
|---|---|
| Form renders with expected fields | Req 1.1 (structure check) |
| Submit with all valid fields → transaction in list | Req 1.2 (concrete example) |
| Storage unavailable → empty list + banner | Req 2.4 edge case |
| Render failure → data retained, re-renders on focus | Req 2.5 edge case |
| Empty list → placeholder text visible | Req 3.3 edge case |
| Transaction without category → "Uncategorized" label | Req 3.5 edge case |
| Delete → storage failure → rollback | Req 4.5 edge case |
| Empty list → balance shows $0.00 | Req 5.4 edge case |
| Empty data → pie chart shows no-data text | Req 6.4 edge case |
| Zero-amount transactions → no-data path | Req 6.5 edge case |
| Balance displayed with aria-live attribute | Req 8.3 structure check |

### Property-Based Tests

Use **fast-check** (works in Node.js, zero build tools required for test execution).

Minimum 100 iterations per property. Each test is tagged with a comment referencing the design property.

```js
// Feature: expense-tracker, Property 1: Valid submission adds to list
fc.assert(fc.property(validTransactionArb, tx => {
  const before = Store.getAll().length;
  Store.add(tx);
  return Store.getAll().length === before + 1
      && Store.getAll().some(t => t.id === tx.id);
}), { numRuns: 100 });
```

Properties to implement (one test per property):

| Test tag | Design Property | Arbitraries |
|---|---|---|
| Property 1 | Valid submission adds to list | `validTransactionArb` |
| Property 2 | Validator reports all errors simultaneously | `partialFormInputArb` (random empty/filled fields) |
| Property 3 | Invalid amount always errors | `invalidAmountArb` (negatives, zero, NaN, strings) |
| Property 4 | Successful add resets form | `validTransactionArb` + DOM form state |
| Property 5 | Rejected submission preserves field values | `invalidFormInputArb` |
| Property 6 | Mutation immediately persists | `validTransactionArb` + delete operations |
| Property 7 | Load round-trip preserves all transactions | `fc.array(validTransactionArb)` |
| Property 8 | Rendered fields are correctly formatted | `validTransactionArb` |
| Property 9 | List is reverse-chronological | `fc.array(validTransactionArb)` with varied timestamps |
| Property 10 | Every item has a delete control | `fc.array(validTransactionArb, { minLength: 1 })` |
| Property 11 | Delete removes from state and storage | `validTransactionArb` |
| Property 12 | Balance equals sum | `fc.array(validTransactionArb)` |
| Property 13 | Chart segments proportional + unique colors | `categoryAmountMapArb` |
| Property 14 | Legend always visible | `fc.array(validTransactionArb)` (including empty) |

### Integration / Smoke Tests

- Manual cross-browser testing in Chrome, Firefox, Edge, and Safari (Req 7.1).
- Manual `file://` protocol test (Req 7.2).
- Accessibility audit with axe DevTools or Lighthouse (Req 8.1, 8.4).
- Responsive layout check at 360px, 768px, 1280px, 1920px viewport widths (Req 8.2).
- Manual keyboard navigation walkthrough: Tab through form → submit → Tab to delete → activate (Req 8.3).
