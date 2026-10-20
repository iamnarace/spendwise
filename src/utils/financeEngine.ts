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

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Derives sorted unique YYYY-MM month strings (newest first) from available transactions.
 */
export function getAvailableMonths(
  transactions: Transaction[],
  fallbackMonth?: string
): string[] {
  const monthSet = new Set<string>();
  for (const tx of transactions) {
    if (typeof tx.date === 'string' && /^\d{4}-\d{2}/.test(tx.date)) {
      monthSet.add(tx.date.slice(0, 7));
    }
  }
  if (
    monthSet.size === 0 &&
    fallbackMonth &&
    /^\d{4}-\d{2}$/.test(fallbackMonth)
  ) {
    monthSet.add(fallbackMonth);
  }
  return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
}

/**
 * Formats a YYYY-MM month key into a human-readable label (e.g. "2026-10" -> "Oct 2026").
 */
export function formatMonthLabel(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey;
  const year = match[1];
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return monthKey;
  return `${MONTH_SHORT_NAMES[monthIndex]} ${year}`;
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

const DANGEROUS_CSV_PREFIX_REGEX = /^[\s]*[=+\-@\t\r|]/;

/**
 * Neutralizes spreadsheet formula injection prefixes (=, +, -, @, tab, CR, pipe, including after leading whitespace)
 * and applies RFC 4180 CSV quoting while preserving genuine numeric values.
 */
export function sanitizeCsvCell(
  val: string | number | undefined,
  options?: { isNumericField?: boolean }
): string {
  const isNumeric =
    options?.isNumericField ?? (typeof val === 'number' && Number.isFinite(val));
  const raw = String(val ?? '');
  const neutralized =
    !isNumeric && DANGEROUS_CSV_PREFIX_REGEX.test(raw)
      ? `'${raw}`
      : raw;

  if (
    neutralized.includes(',') ||
    neutralized.includes('"') ||
    neutralized.includes('\n') ||
    neutralized.includes('\r')
  ) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

/**
 * Generates an RFC 4180 compliant, formula-injection-safe CSV string from a transaction array.
 */
export function exportTransactionsToCsv(transactions: Transaction[]): string {
  const headers = ['ID', 'Date', 'Type', 'Category', 'Description', 'Amount', 'Notes'];
  const rows = transactions.map((tx) =>
    [
      sanitizeCsvCell(tx.id),
      sanitizeCsvCell(tx.date),
      sanitizeCsvCell(tx.type),
      sanitizeCsvCell(tx.category),
      sanitizeCsvCell(tx.description),
      sanitizeCsvCell(tx.amount.toFixed(2), { isNumericField: true }),
      sanitizeCsvCell(tx.notes ?? ''),
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
