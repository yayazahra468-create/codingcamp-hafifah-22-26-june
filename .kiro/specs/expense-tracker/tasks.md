# Implementation Plan: Expense Tracker

## Overview

Implement a fully client-side expense tracker as three files (`index.html`, `style.css`, `app.js`). The build follows the MVC-like architecture described in the design: a `Store` module for state and persistence, a `Validator` for input validation, render functions for the DOM view, and a `Controller` that wires events to state changes and re-renders. Testing uses Vitest for unit tests and fast-check for property-based tests.

## Tasks

- [~] 1. Set up project structure and test scaffolding
  - Create `index.html` with semantic landmark regions (`<header>`, `<main>`, `<section>`), the `Input_Form` (name text field, amount number field, category `<select>`, submit button), `#balance` live region (`aria-live="polite"`), `#transaction-list` container, and `<canvas>` for the pie chart with a legend container
  - Create empty `style.css` and `app.js` files; link both from `index.html`
  - Initialise a `package.json` and install `vitest` and `fast-check` as dev dependencies; add a `test` script using `vitest --run`
  - Create `app.test.js` (or `app.test.ts`) stub that imports the modules to be tested
  - _Requirements: 1.1, 8.1, 8.3_

- [-] 2. Implement the Store module
  - [-] 2.1 Implement `Store` in `app.js` with internal `_transactions` array, constants (`STORAGE_KEY`, `CURRENCY_SYMBOL`, monotonic `_insertionIndex`), and public methods: `getAll()`, `add(tx)`, `delete(id)`, `load()`, `persist()`, `total()`, `byCategory()`
    - `add()` must append the transaction and call `persist()` synchronously; `delete()` must remove by id and call `persist()` synchronously (satisfies 100 ms window per Req 2.1/2.2)
    - `load()` must wrap `localStorage` access and `JSON.parse` in `try/catch`; validate that the parsed value is an array of Transaction-shaped objects; return `{ ok: false }` on any failure and leave `_transactions` as `[]`
    - `persist()` must wrap `localStorage.setItem` in `try/catch` and return `{ ok, error? }`
    - `getAll()` returns a shallow copy; `total()` sums all amounts; `byCategory()` returns a `Map<string, number>`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.2, 5.1_

  - [-] 2.2 Write property test for Store — Property 6: Mutation immediately persists
    - **Property 6: Every mutation immediately persists to localStorage**
    - **Validates: Requirements 2.1, 2.2**
    - Mock `localStorage` with an in-memory object; after each `Store.add()` or `Store.delete()`, assert the parsed `localStorage` value reflects post-mutation state

  - [-] 2.4 Write unit tests for Store edge cases
    - Storage unavailable → `Store.load()` returns `{ ok: false }`, `_transactions` stays `[]`
    - Corrupt JSON → same outcome
    - Empty list → `Store.total()` returns 0; `Store.byCategory()` returns an empty Map
    - _Requirements: 2.4, 5.4_

- [ ] 3. Implement the Validator module
  - [~] 3.1 Implement `Validator.validateForm(name, amount, category)` in `app.js`
    - Evaluate all three fields in a single pass and return `{ valid, errors: { name?, amount?, category? } }`
    - `name`: non-empty after trim; `amount`: parseable as finite number AND > 0; `category`: one of `['Food', 'Transport', 'Fun']`
    - _Requirements: 1.3, 1.4, 1.7_

  - [~] 3.2 Write property test for Validator — Property 2: All errors reported simultaneously
    - **Property 2: Validator reports all field errors simultaneously**
    - **Validates: Requirements 1.3, 1.7**
    - Use `partialFormInputArb` (random combination of valid/invalid fields); assert that every invalid field has a corresponding error key in the returned `errors` object in a single call

  - [~] 3.3 Write property test for Validator — Property 3: Invalid amount always produces amount error
    - **Property 3: Invalid amount always produces amount error**
    - **Validates: Requirements 1.4**
    - Use `invalidAmountArb` (negatives, zero, NaN, Infinity, non-numeric strings); assert `errors.amount` is always set

- [~] 4. Checkpoint — Ensure Store and Validator tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement render functions
  - [~] 5.1 Implement `renderTransactionList()` in `app.js`
    - Read `Store.getAll()`, sort descending by `timestamp` then descending by `index`
    - Replace `innerHTML` of `#transaction-list`; if empty render placeholder text (Req 3.3)
    - Each list item displays name, `${CURRENCY_SYMBOL}${amount.toFixed(2)}`, category label (or "Uncategorized" if absent), and a delete button with `data-id` attribute
    - Delete button must be keyboard-accessible (`type="button"`) and focusable (Req 8.3, 4.1)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 8.3_

  - [~] 5.2 Write property test for render — Property 8: Rendered fields are correctly formatted
    - **Property 8: Transaction list renders correct formatted fields**
    - **Validates: Requirements 3.1, 3.5**
    - Use `validTransactionArb`; after `renderTransactionList()`, assert the generated HTML contains the verbatim name, the correctly formatted amount, and the category label

  - [~] 5.3 Write property test for render — Property 9: List is sorted reverse-chronologically
    - **Property 9: Transaction list is sorted reverse-chronologically**
    - **Validates: Requirements 3.4**
    - Use `fc.array(validTransactionArb)` with varied timestamps and indices; after rendering, assert displayed order is strictly descendinag by timestamp, ties broken by descending index

  - [~] 5.4 Write property test for render — Property 10: Every transaction entry has a delete control
    - **Property 10: Every transaction entry has a delete control**
    - **Validates: Requirements 4.1**
    - Use `fc.array(validTransactionArb, { minLength: 1 })`; assert every rendered list item contains a button element

  - [~] 5.5 Implement `renderBalance()` in `app.js`
    - Read `Store.total()` and update the `#balance` text node to `${CURRENCY_SYMBOL}${total.toFixed(2)}`
    - `#balance` must carry `aria-live="polite"` in the HTML markup (Req 8.3)
    - _Requirements: 5.1, 5.4, 8.3_

  - [~] 5.6 Write property test for render — Property 12: Balance always equals sum of current transactions
    - **Property 12: Balance always equals sum of current transactions**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - Use `fc.array(validTransactionArb)`; load transactions into Store, call `renderBalance()`, assert rendered text equals `${CURRENCY_SYMBOL}${Store.total().toFixed(2)}`

- [ ] 6. Implement the Pie Chart renderer
  - [~] 6.1 Implement `renderPieChart()` in `app.js`
    - Read `Store.byCategory()`; if empty or all-zero: clear canvas, draw centered "No data available" text; keep legend visible (Req 6.4–6.6)
    - Otherwise: compute `slice_angle = (amount / total) * 2π` for each category and draw arcs using the Canvas 2D API with the fixed color palette (`Food: #FF6384`, `Transport: #36A2EB`, `Fun: #FFCE56`, `Uncategorized: #9966FF`)
    - Draw/update the HTML legend below the canvas, pairing color swatches with category names (Req 6.7)
    - Legend must remain visible in all states (Req 6.7)
    - Pie chart canvas must have an `aria-label` attribute listing category data (Req 8.3)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.3_

  - [~] 6.2 Write property test for chart — Property 13: Segments proportional and uniquely colored
    - **Property 13: Pie chart segments are proportional and uniquely colored**
    - **Validates: Requirements 6.1**
    - Use `categoryAmountMapArb`; assert computed arc angles equal `(amount / total) * 2π` within floating-point tolerance and that all used color values are distinct

  - [~] 6.3 Write property test for chart — Property 14: Legend always visible
    - **Property 14: Chart legend is always visible**
    - **Validates: Requirements 6.7**
    - Use `fc.array(validTransactionArb)` including the empty case; assert the legend DOM element is present and not hidden after each `renderPieChart()` call

- [ ] 7. Implement the Controller and wire everything together
  - [~] 7.1 Implement `init()` in `app.js`, called on `DOMContentLoaded`
    - Call `Store.load()`; if `!ok`, call `showStorageBanner()` (auto-removes after 5 s via `setTimeout`)
    - Call `renderAll()` (`renderTransactionList()` + `renderBalance()` + `renderPieChart()`)
    - Attach `handleFormSubmit` to the form's `submit` event
    - Attach `handleDeleteClick` via event delegation on `#transaction-list`
    - Attach `handlePageFocus` to `window` `focus` event
    - _Requirements: 2.3, 2.4, 2.5_

  - [~] 7.2 Implement `handleFormSubmit(event)` in `app.js`
    - `event.preventDefault()`; read all field values; call `Validator.validateForm()`
    - On errors: call `showFormErrors(errors)` (insert `<span class="field-error" role="alert">` adjacent to each invalid field; do NOT clear valid field values); return
    - On success: call `Store.add(tx)` (tx includes `id` via `crypto.randomUUID()` or fallback, `timestamp: Date.now()`, incremented `index`); call `clearFormErrors()`; call `resetForm()`; call `renderAll()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [~] 7.3 Write property test for Controller — Property 1: Valid submission adds to list
    - **Property 1: Valid submission adds to list**
    - **Validates: Requirements 1.2**
    - Use `validTransactionArb`; call `Store.add(tx)`, assert `Store.getAll().length === before + 1` and the transaction is present by id

  - [~] 7.4 Write property test for Controller — Property 4: Successful add resets form fields
    - **Property 4: Successful add resets form fields**
    - **Validates: Requirements 1.5**
    - Use `validTransactionArb` + DOM form state; after a valid `handleFormSubmit`, assert all form fields are at their default empty/unselected values

  - [~] 7.5 Write property test for Controller — Property 5: Rejected submission preserves field values
    - **Property 5: Rejected submission preserves field values**
    - **Validates: Requirements 1.6**
    - Use `invalidFormInputArb`; after a rejected `handleFormSubmit`, assert every form field value is identical to the value present at the time of submission

  - [~] 7.6 Implement `handleDeleteClick(id)` in `app.js`
    - Take a snapshot of `Store.getAll()` before deletion
    - Wrap entire function body in `try/catch`
    - Call `Store.delete(id)`; if `Store.persist()` returns `!ok` or an exception is caught: restore `_transactions` from snapshot, call `showDeleteError()`, call `renderAll()`, return
    - On success: call `renderAll()`
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [~] 7.7 Write property test for Controller — Property 11: Deletion removes from state and storage
    - **Property 11: Deletion removes transaction from state and storage**
    - **Validates: Requirements 4.2**
    - Use `validTransactionArb`; after `Store.delete(id)`, assert transaction is absent from `Store.getAll()` and from the parsed `localStorage` value

  - [~] 7.8 Implement `handlePageFocus()` in `app.js`
    - If `Store.getAll().length > 0` and `#transaction-list` DOM is empty: call `renderAll()`
    - _Requirements: 2.5_

- [~] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Apply styling and accessibility polish
  - [~] 9.1 Write `style.css` with the full visual theme
    - Distinct heading levels `h1`–`h3` for typographic hierarchy
    - Color contrast ≥ 4.5:1 for normal text (WCAG 2.1 AA)
    - Responsive layout: no horizontal scroll or overflow from 360 px to 1920 px (CSS Flexbox/Grid; `max-width` + `padding`)
    - Visible focus indicators with ≥ 3:1 contrast against adjacent colors (WCAG 2.1 AA SC 1.4.11) for all interactive controls
    - Style `#transaction-list` as a vertically scrollable container (`overflow-y: auto`) when content overflows
    - _Requirements: 8.1, 8.2, 8.4_

  - [~] 9.2 Verify keyboard and screen-reader accessibility attributes in `index.html` and `app.js`
    - `#balance` has `aria-live="polite"`
    - Form error spans have `role="alert"`
    - Canvas has `aria-label` updated by `renderPieChart()` with current category data
    - Delete buttons have accessible labels (`aria-label` or visible text)
    - Tab order through form fields, submit button, and delete controls follows DOM order
    - _Requirements: 8.3_

- [~] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 4, 8, and 10 ensure incremental validation
- Property tests use fast-check; unit tests use Vitest; both run via `npm test` (`vitest --run`)
- Mock `localStorage` in tests using a simple in-memory object assigned to `global.localStorage`
- The entire app can be distributed as a single `index.html` by inlining `<style>` and `<script>` tags

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3"] },
    { "id": 3, "tasks": ["5.1", "5.5", "6.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "5.6", "6.2", "6.3"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.6", "7.8"] },
    { "id": 6, "tasks": ["7.3", "7.4", "7.5", "7.7"] },
    { "id": 7, "tasks": ["9.1", "9.2"] }
  ]
}
```
