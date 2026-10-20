# Changelog

## [1.0.1] - 2026-10-20

### Changed
- **CSV Formula Injection Mitigation:** Neutralized dangerous spreadsheet prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`, `|`, including leading whitespace) in `sanitizeCsvCell` and `exportTransactionsToCsv` while preserving genuine numeric values and RFC 4180 quote/comma/newline escaping.
- **Dynamic Month Selector:** Replaced hardcoded month options with months derived dynamically from stored transactions (`getAvailableMonths`) sorted newest-first across any year/month range.
- **Build & Test Tooling:** Upgraded Vite to v6 and Vitest to v4 with expanded CSV injection and dynamic month regression tests.

## [1.0.0] - 2026-10-20

### Added
- **Cashflow Dashboard:** Monthly income, expense, net cashflow, and savings rate KPI cards.
- **Interactive SVG Donut & Budget Utilization Bars:** Visual category breakdown and real-time budget health indicators.
- **Monthly Category Budget Configurator:** Customize monthly spending caps across 6 core expense categories.
- **Filterable Transaction Ledger:** Filter by month, category, or keyword search, and export filtered records to RFC 4180 CSV.
- **Resettable Demonstration Mode:** Preloaded October 2026 realistic ledger with one-click reset or full clear.
