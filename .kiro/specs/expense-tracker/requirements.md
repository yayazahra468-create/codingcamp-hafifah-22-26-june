# Requirements Document

## Introduction

A client-side expense tracker web application built with HTML, CSS, and Vanilla JavaScript. The app allows users to log expenses by name, amount, and category; view a scrollable transaction list; see a running total balance; and visualize spending by category through a pie chart. All data is persisted client-side via the browser's LocalStorage API. No backend server or build tools are required.

## Glossary

- **App**: The expense tracker web application as a whole.
- **Transaction**: A single expense entry consisting of an item name, an amount, and a category.
- **Transaction_List**: The scrollable UI component that displays all saved transactions.
- **Input_Form**: The HTML form used to create a new Transaction.
- **Balance_Display**: The UI component at the top of the page showing the sum of all transaction amounts.
- **Pie_Chart**: The visual chart component that shows spending distribution grouped by category.
- **Category**: One of three predefined labels assigned to a Transaction: Food, Transport, or Fun.
- **Storage**: The browser's LocalStorage API used to persist transaction data client-side.
- **Validator**: The client-side input validation logic applied before a Transaction is saved.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form with an item name, amount, and category and submit it, so that a new expense is recorded in my tracker.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name, a numeric field for amount, and a dropdown selector for Category with options Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled and a valid positive numeric amount, THE App SHALL create a new Transaction and add it to the Transaction_List.
3. WHEN the user submits the Input_Form with one or more empty fields, THE Validator SHALL prevent submission and display an inline error message identifying the missing field(s).
4. WHEN the user submits the Input_Form with a non-positive or non-numeric amount, THE Validator SHALL prevent submission and display an inline error message stating that the amount must be a positive number.
5. WHEN a Transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty/unselected state.
6. WHEN the Validator rejects a submission due to invalid or missing input, THE Input_Form SHALL preserve all field values entered by the user so they can correct them without re-entering data.
7. WHEN the user submits the Input_Form, THE Validator SHALL evaluate all fields simultaneously and display all applicable error messages in a single pass, not one at a time per resubmission.

---

### Requirement 2: Persist Transactions Across Sessions

**User Story:** As a user, I want my transactions to be saved automatically, so that my expense history is available when I reopen the app.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE Storage SHALL save the updated transaction list to LocalStorage within 100 milliseconds of the add operation completing.
2. WHEN a Transaction is deleted, THE Storage SHALL save the updated transaction list to LocalStorage within 100 milliseconds of the delete operation completing.
3. WHEN the App initializes, THE App SHALL load all previously saved transactions from LocalStorage and render them in the Transaction_List.
4. IF LocalStorage is unavailable OR LocalStorage returns data that cannot be parsed as a valid JSON array of Transaction objects, THEN THE App SHALL initialize with an empty transaction list and display the same non-blocking banner message visible without scrolling for at least 5 seconds, regardless of whether any transactions exist in memory from a previous session.
5. IF the App loads transactions from Storage but the Transaction_List fails to render, THEN THE App SHALL retain the loaded data in memory and attempt to re-render the Transaction_List on the next add, delete, or page-focus event.

---

### Requirement 3: Display the Transaction List

**User Story:** As a user, I want to see a scrollable list of all my recorded expenses, so that I can review what I have spent money on.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction with its item name, amount (formatted to two decimal places prefixed with the app's configured currency symbol), and Category label.
2. WHILE the Transaction_List contains more items than fit in the visible area, THE Transaction_List SHALL be vertically scrollable.
3. WHEN the Transaction_List is empty, THE App SHALL display a placeholder message indicating that no transactions have been recorded yet.
4. THE Transaction_List SHALL display transactions in reverse chronological order by insertion time, with the most recently added transaction at the top; transactions added in the same millisecond SHALL be ordered by descending insertion index.
5. IF a Transaction has no assigned Category, THEN THE Transaction_List SHALL display "Uncategorized" as the Category label for that Transaction.

---

### Requirement 4: Delete a Transaction

**User Story:** As a user, I want to remove an individual transaction from the list, so that I can correct mistakes or remove entries I no longer need.

#### Acceptance Criteria

1. THE Transaction_List SHALL render a delete control (button or icon) for each Transaction entry.
2. WHEN the user activates the delete control for a Transaction, THE App SHALL remove that Transaction from the Transaction_List and save the updated transaction list to Storage.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update immediately to reflect the new total.
4. WHEN a Transaction is deleted, THE Pie_Chart SHALL update immediately to reflect the new category distribution.
5. IF any failure occurs during the delete process (including Storage save failures and other runtime errors), THEN THE App SHALL restore the deleted Transaction to the Transaction_List and display an inline error message indicating the deletion could not be completed.

---

### Requirement 5: Display the Total Balance

**User Story:** As a user, I want to see the total amount I have spent at the top of the page, so that I can quickly understand my overall expenditure.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of the amounts of all Transactions, calculated directly from the current Transaction_List, formatted to two decimal places with a currency symbol.
2. WHEN a Transaction is added, THE Balance_Display SHALL update within one rendering cycle, without requiring additional user interaction; IF the update mechanism fails due to a rendering error or performance issue, THE Balance_Display MAY become temporarily inconsistent until the next successful render.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update within one rendering cycle, without requiring additional user interaction; IF the update mechanism fails due to a rendering error or performance issue, THE Balance_Display MAY become temporarily inconsistent until the next successful render.
4. IF the Transaction_List is empty, THEN THE Balance_Display SHALL display a total of $0.00.
5. WHEN the App initializes and loads transactions from Storage, THE Balance_Display SHALL reflect the sum of the loaded transactions before any user interaction occurs.

---

### Requirement 6: Visualize Spending by Category

**User Story:** As a user, I want to see a pie chart of my spending broken down by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL display one segment per Category that has at least one Transaction, sized proportionally to that Category's share of the total expenditure; each segment SHALL be assigned a unique, non-repeated color.
2. WHEN a Transaction is added, THE Pie_Chart SHALL update within 300 milliseconds to reflect the new category distribution.
3. WHEN a Transaction is deleted, THE Pie_Chart SHALL update within 300 milliseconds to reflect the new category distribution.
4. WHEN the Transaction_List is empty, THE Pie_Chart SHALL display a visible text message indicating no data is available, instead of an empty chart.
5. IF all Transactions have a zero amount or belong to categories not defined in the Glossary (Food, Transport, Fun), THEN THE Pie_Chart SHALL display the no-data text message rather than an incomplete or misleading chart.
6. WHEN all Transactions are deleted, THE Pie_Chart SHALL immediately replace the chart with the no-data text message without requiring any additional user interaction.
7. THE Pie_Chart SHALL include a legend that maps each unique color to its corresponding Category label; WHEN the Transaction_List is empty and the no-data message is displayed, THE legend SHALL remain visible.

---

### Requirement 7: Browser Compatibility

**User Story:** As a user, I want the app to work correctly in any modern browser, so that I am not restricted to a specific browser.

#### Acceptance Criteria

1. THE App SHALL support all features defined in Requirements 1–8 in the stable release of Chrome, Firefox, Edge, and Safari published within the last 24 months, without requiring browser-specific polyfills under normal HTTP/HTTPS serving.
2. THE App SHALL support all features defined in Requirements 1–8 when loaded via the file:// protocol directly from the filesystem, without requiring a backend server.
3. WHERE supporting all features via the file:// protocol requires specific polyfills, THE App SHALL bundle those polyfills inline in the HTML file.

---

### Requirement 8: Responsive and Accessible UI

**User Story:** As a user, I want a clean, readable interface that works on different screen sizes, so that I can use the app comfortably on a desktop or laptop.

#### Acceptance Criteria

1. THE App SHALL apply a consistent visual theme using distinct heading levels (h1–h3) for typographic hierarchy, sufficient color contrast (minimum 4.5:1 ratio for normal text per WCAG 2.1 AA), and landmark regions (header, main, section) to group related content.
2. THE App SHALL render without horizontal scrolling or layout overflow on viewport widths from 360px to 1920px.
3. THE Input_Form SHALL support Tab navigation through all fields in DOM order and Enter/Space to activate the submit button; THE Transaction_List SHALL support Tab navigation to each delete control and Enter/Space to activate it; THE Balance_Display SHALL be readable by screen readers as a live region; THE Pie_Chart SHALL be focusable and expose its category data as readable text (aria-label or equivalent).
4. WHILE any interactive control has keyboard focus, THE App SHALL display a visible focus indicator with a minimum contrast ratio of 3:1 against adjacent colors, per WCAG 2.1 AA success criterion 1.4.11.
