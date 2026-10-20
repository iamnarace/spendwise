export type TransactionType = 'income' | 'expense';

export type ExpenseCategory =
  | 'Housing & Utilities'
  | 'Groceries & Dining'
  | 'Transport & Transit'
  | 'Health & Wellness'
  | 'Subscriptions & Tech'
  | 'Leisure & Culture'
  | 'Salary & Freelance'
  | 'Investments & Other';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  category: ExpenseCategory;
  type: TransactionType;
  amount: number; // positive dollar value
  notes?: string;
}

export type CategoryBudgetMap = Record<ExpenseCategory, number>;

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Housing & Utilities',
  'Groceries & Dining',
  'Transport & Transit',
  'Health & Wellness',
  'Subscriptions & Tech',
  'Leisure & Culture',
];

export const INCOME_CATEGORIES: ExpenseCategory[] = [
  'Salary & Freelance',
  'Investments & Other',
];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'Housing & Utilities': '#059669',
  'Groceries & Dining': '#0284c7',
  'Transport & Transit': '#d97706',
  'Health & Wellness': '#7c3aed',
  'Subscriptions & Tech': '#e11d48',
  'Leisure & Culture': '#0d9488',
  'Salary & Freelance': '#16a34a',
  'Investments & Other': '#2563eb',
};

export const DEFAULT_BUDGETS: CategoryBudgetMap = {
  'Housing & Utilities': 1850,
  'Groceries & Dining': 650,
  'Transport & Transit': 320,
  'Health & Wellness': 250,
  'Subscriptions & Tech': 180,
  'Leisure & Culture': 300,
  'Salary & Freelance': 0,
  'Investments & Other': 0,
};

export const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-101',
    date: '2026-10-01',
    description: 'Monthly Engineering Salary',
    category: 'Salary & Freelance',
    type: 'income',
    amount: 5400.0,
    notes: 'Direct deposit',
  },
  {
    id: 'tx-102',
    date: '2026-10-02',
    description: 'Apartment Rent & Water',
    category: 'Housing & Utilities',
    type: 'expense',
    amount: 1620.0,
    notes: 'October lease installment',
  },
  {
    id: 'tx-103',
    date: '2026-10-04',
    description: 'Fresh Market Weekly Groceries',
    category: 'Groceries & Dining',
    type: 'expense',
    amount: 164.5,
  },
  {
    id: 'tx-104',
    date: '2026-10-06',
    description: 'Metro Rail Monthly Pass',
    category: 'Transport & Transit',
    type: 'expense',
    amount: 148.0,
  },
  {
    id: 'tx-105',
    date: '2026-10-08',
    description: 'Cloud Hosting & Dev Tooling',
    category: 'Subscriptions & Tech',
    type: 'expense',
    amount: 68.0,
  },
  {
    id: 'tx-106',
    date: '2026-10-10',
    description: 'Open-Source Documentation Grant',
    category: 'Salary & Freelance',
    type: 'income',
    amount: 650.0,
  },
  {
    id: 'tx-107',
    date: '2026-10-12',
    description: 'Electricity & Fiber Internet',
    category: 'Housing & Utilities',
    type: 'expense',
    amount: 175.0,
  },
  {
    id: 'tx-108',
    date: '2026-10-14',
    description: 'Dental Checkup & Pharmacy',
    category: 'Health & Wellness',
    type: 'expense',
    amount: 145.0,
  },
  {
    id: 'tx-109',
    date: '2026-10-16',
    description: 'Neighbourhood Bistro Dinner & Groceries',
    category: 'Groceries & Dining',
    type: 'expense',
    amount: 218.25,
  },
  {
    id: 'tx-110',
    date: '2026-10-18',
    description: 'Weekend Museum & Bookshop',
    category: 'Leisure & Culture',
    type: 'expense',
    amount: 84.0,
  },
];

export interface FilterCriteria {
  month?: string; // YYYY-MM or 'ALL'
  category?: ExpenseCategory | 'ALL';
  type?: TransactionType | 'ALL';
  searchQuery?: string;
}

export function filterTransactions(
  transactions: Transaction[],
  criteria: FilterCriteria
): Transaction[] {
  return transactions
    .filter((tx) => {
      if (criteria.month && criteria.month !== 'ALL') {
        if (!tx.date.startsWith(criteria.month)) return false;
      }
      if (criteria.category && criteria.category !== 'ALL') {
        if (tx.category !== criteria.category) return false;
      }
      if (criteria.type && criteria.type !== 'ALL') {
        if (tx.type !== criteria.type) return false;
      }
      if (criteria.searchQuery && criteria.searchQuery.trim() !== '') {
        const q = criteria.searchQuery.toLowerCase();
        const inDesc = tx.description.toLowerCase().includes(q);
        const inCat = tx.category.toLowerCase().includes(q);
        const inNotes = (tx.notes ?? '').toLowerCase().includes(q);
        if (!inDesc && !inCat && !inNotes) return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface LedgerMetrics {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRatePercent: number;
  categoryTotals: Array<{
    category: ExpenseCategory;
    spent: number;
    budget: number;
    utilizationPercent: number;
    shareOfSpendingPercent: number;
    color: string;
  }>;
}

export function computeLedgerMetrics(
  transactions: Transaction[],
  budgets: CategoryBudgetMap
): LedgerMetrics {
  let totalIncome = 0;
  let totalExpense = 0;
  const spentMap: Record<string, number> = {};

  for (const cat of EXPENSE_CATEGORIES) {
    spentMap[cat] = 0;
  }

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
      spentMap[tx.category] = (spentMap[tx.category] ?? 0) + tx.amount;
    }
  }

  const netBalance = totalIncome - totalExpense;
  const savingsRatePercent =
    totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10 : 0;

  const categoryTotals = EXPENSE_CATEGORIES.map((category) => {
    const spent = Math.round((spentMap[category] ?? 0) * 100) / 100;
    const budget = budgets[category] ?? 0;
    const utilizationPercent =
      budget > 0 ? Math.round((spent / budget) * 1000) / 10 : 0;
    const shareOfSpendingPercent =
      totalExpense > 0 ? Math.round((spent / totalExpense) * 1000) / 10 : 0;
    return {
      category,
      spent,
      budget,
      utilizationPercent,
      shareOfSpendingPercent,
      color: CATEGORY_COLORS[category],
    };
  });

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    netBalance: Math.round(netBalance * 100) / 100,
    savingsRatePercent,
    categoryTotals,
  };
}

/**
 * Formats currency amount in USD/AUD style ($1,234.50).
 */
export function formatCurrency(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}$${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generates an RFC 4180 compliant CSV string from a transaction array.
 */
export function exportTransactionsToCsv(transactions: Transaction[]): string {
  const escapeCell = (val: string | number | undefined): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = ['ID', 'Date', 'Type', 'Category', 'Description', 'Amount', 'Notes'];
  const rows = transactions.map((tx) =>
    [
      escapeCell(tx.id),
      escapeCell(tx.date),
      escapeCell(tx.type),
      escapeCell(tx.category),
      escapeCell(tx.description),
      escapeCell(tx.amount.toFixed(2)),
      escapeCell(tx.notes ?? ''),
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
