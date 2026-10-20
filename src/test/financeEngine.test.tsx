import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  DEMO_TRANSACTIONS,
  DEFAULT_BUDGETS,
  filterTransactions,
  computeLedgerMetrics,
  formatCurrency,
  exportTransactionsToCsv,
  sanitizeCsvCell,
  getAvailableMonths,
  formatMonthLabel,
} from '../utils/financeEngine';
import App from '../App';

describe('SpendWise Personal Finance Engine & UI Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('computes income, expenses, net balance, and savings rate accurately', () => {
    const metrics = computeLedgerMetrics(DEMO_TRANSACTIONS, DEFAULT_BUDGETS);
    expect(metrics.totalIncome).toBe(6050);
    expect(metrics.totalExpense).toBe(2622.75);
    expect(metrics.netBalance).toBe(3427.25);
    expect(metrics.savingsRatePercent).toBeGreaterThan(50);
  });

  it('filters transactions by month, category, and search query', () => {
    const housingOnly = filterTransactions(DEMO_TRANSACTIONS, {
      category: 'Housing & Utilities',
    });
    expect(housingOnly).toHaveLength(2);

    const searchResult = filterTransactions(DEMO_TRANSACTIONS, {
      searchQuery: 'dental',
    });
    expect(searchResult).toHaveLength(1);
    expect(searchResult[0].description).toContain('Dental');
  });

  it('formats currency values and escapes RFC 4180 CSV fields properly', () => {
    expect(formatCurrency(1250.5)).toBe('$1,250.50');
    expect(formatCurrency(-42.1)).toBe('-$42.10');

    const csv = exportTransactionsToCsv([
      {
        id: 'tx-1',
        date: '2026-10-01',
        type: 'expense',
        category: 'Groceries & Dining',
        description: 'Coffee, Bakery & "Special" Roast',
        amount: 18.5,
      },
    ]);
    expect(csv).toContain('"Coffee, Bakery & ""Special"" Roast"');
    expect(csv).toContain('18.50');
  });

  it('neutralizes CSV formula injection prefixes (=, +, -, @, tab, CR) while preserving valid CSV escaping', () => {
    expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
    expect(sanitizeCsvCell('+cmd|\' /C calc\'!A0')).toBe("'+cmd|' /C calc'!A0");
    expect(sanitizeCsvCell('-2+3+cmd|\' /C calc\'!A0')).toBe("'-2+3+cmd|' /C calc'!A0");
    expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
    expect(sanitizeCsvCell('\t=1+1')).toBe("'\t=1+1");
    expect(sanitizeCsvCell('\r=1+1')).toBe('"\'\r=1+1"');
    expect(sanitizeCsvCell('  =1+1')).toBe("'  =1+1");

    // Combined formula prefix + RFC 4180 comma & quotes
    expect(
      sanitizeCsvCell('=HYPERLINK("http://evil.example","Click, Me")')
    ).toBe('"\'=HYPERLINK(""http://evil.example"",""Click, Me"")"');

    // Full CSV export regression test with malicious description & notes
    const csv = exportTransactionsToCsv([
      {
        id: 'tx-attack',
        date: '2026-10-15',
        type: 'expense',
        category: 'Subscriptions & Tech',
        description: '=1+1',
        amount: 99.95,
        notes: '@SUM(1,2)',
      },
    ]);
    const lines = csv.split('\n');
    expect(lines[1]).toContain(",'=1+1,99.95,\"'@SUM(1,2)\"");
  });

  it('derives sorted available months dynamically from transactions across date ranges', () => {
    const multiMonthTxs = [
      { ...DEMO_TRANSACTIONS[0], id: 'm1', date: '2025-12-15' },
      { ...DEMO_TRANSACTIONS[1], id: 'm2', date: '2026-11-02' },
      { ...DEMO_TRANSACTIONS[2], id: 'm3', date: '2026-03-19' },
      { ...DEMO_TRANSACTIONS[3], id: 'm4', date: '2026-11-20' },
    ];
    expect(getAvailableMonths(multiMonthTxs)).toEqual([
      '2026-11',
      '2026-03',
      '2025-12',
    ]);
    expect(formatMonthLabel('2026-11')).toBe('Nov 2026');
    expect(formatMonthLabel('2025-12')).toBe('Dec 2025');
    expect(getAvailableMonths([], '2026-10')).toEqual(['2026-10']);
  });

  it('renders the SpendWise dashboard, dynamically updates month options when adding a new month transaction, and switches to Monthly Budgets', () => {
    render(<App />);
    expect(screen.getByText('SpendWise')).toBeInTheDocument();
    expect(
      screen.getByText(/Spending Breakdown & Budget Health/i)
    ).toBeInTheDocument();

    const monthSelect = screen.getByLabelText(/Filter by month/i) as HTMLSelectElement;
    expect(monthSelect.value).toBe('2026-10');
    expect(screen.queryByRole('option', { name: 'Nov 2026' })).not.toBeInTheDocument();

    const amountInput = screen.getByLabelText(/Amount \(\$\)/i);
    const dateInput = screen.getByLabelText(/^Date$/i);
    const descInput = screen.getByLabelText(/Description \/ Merchant/i);
    fireEvent.change(amountInput, { target: { value: '45.00' } });
    fireEvent.change(dateInput, { target: { value: '2026-11-12' } });
    fireEvent.change(descInput, { target: { value: 'City Bookshop' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Transaction to Ledger/i }));

    // Month dropdown now dynamically includes Nov 2026 and selects it
    expect(screen.getByRole('option', { name: 'Nov 2026' })).toBeInTheDocument();
    expect(monthSelect.value).toBe('2026-11');
    expect(screen.getByText('City Bookshop')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Monthly Budgets/i }));
    expect(
      screen.getByText(/Monthly Category Budget Targets/i)
    ).toBeInTheDocument();
  });
});
