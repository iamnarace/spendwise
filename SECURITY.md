# Security & Privacy Policy

## Local-Only Financial Data Storage

**SpendWise** is built with a strict local-first privacy model:

- **No Cloud Sync or Bank Credentials:** SpendWise never requests banking credentials and does not transmit financial records over the network.
- **Browser LocalStorage Persistence:** Transactions and category budgets are stored in `window.localStorage` (`spendwise_transactions_v1` and `spendwise_budgets_v1`).
- **Backups via CSV:** Because browser storage is tied to your local browser profile, users should periodically export their ledger using the **Export CSV** button.

## Reporting a Vulnerability

Please report security issues via GitHub Issues on `https://github.com/iamnarace/spendwise`.
