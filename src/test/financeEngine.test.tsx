import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  DEMO_TRANSACTIONS,
  DEFAULT_BUDGETS,
  filterTransactions,
  computeLedgerMetrics,
  formatCurrency,
  exportTransactionsToCsv,
} from '../utils/financeEngine';
import App from '../App';

describe('SpendWise Personal Finance Engine & UI Tests', () => {
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

  it('renders the SpendWise dashboard, adds a transaction, and switches to Monthly Budgets', () => {
    render(<App />);
    expect(screen.getByText('SpendWise')).toBeInTheDocument();
    expect(
      screen.getByText(/Spending Breakdown & Budget Health/i)
    ).toBeInTheDocument();

    const amountInput = screen.getByLabelText(/Amount \(\$\)/i);
    const descInput = screen.getByLabelText(/Description \/ Merchant/i);
    fireEvent.change(amountInput, { target: { value: '45.00' } });
    fireEvent.change(descInput, { target: { value: 'City Bookshop' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Transaction to Ledger/i }));

    expect(screen.getByText('City Bookshop')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Monthly Budgets/i }));
    expect(
      screen.getByText(/Monthly Category Budget Targets/i)
    ).toBeInTheDocument();
  });
});
