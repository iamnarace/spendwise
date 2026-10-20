import { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
  PlusCircle,
  Download,
  RotateCcw,
  Trash2,
  Search,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Transaction,
  TransactionType,
  ExpenseCategory,
  CategoryBudgetMap,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  DEFAULT_BUDGETS,
  DEMO_TRANSACTIONS,
  filterTransactions,
  computeLedgerMetrics,
  formatCurrency,
  exportTransactionsToCsv,
  getAvailableMonths,
  formatMonthLabel,
} from './utils/financeEngine';

const STORAGE_TX_KEY = 'spendwise_transactions_v1';
const STORAGE_BUDGET_KEY = 'spendwise_budgets_v1';

export function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TX_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to demo transactions
    }
    return DEMO_TRANSACTIONS;
  });

  const [budgets, setBudgets] = useState<CategoryBudgetMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BUDGET_KEY);
      if (saved) return { ...DEFAULT_BUDGETS, ...JSON.parse(saved) };
    } catch {
      // Fallback
    }
    return DEFAULT_BUDGETS;
  });

  // View Tab
  const [activeView, setActiveView] = useState<'overview' | 'budgets'>('overview');

  // Derive available months dynamically from transactions
  const availableMonths = useMemo(
    () => getAvailableMonths(transactions),
    [transactions]
  );

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => getAvailableMonths(transactions)[0] ?? 'ALL'
  );
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<TransactionType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Keep selectedMonth valid when availableMonths changes
  useEffect(() => {
    if (selectedMonth !== 'ALL' && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0] ?? 'ALL');
    }
  }, [availableMonths, selectedMonth]);

  // New transaction form state
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [txDate, setTxDate] = useState<string>('2026-10-20');
  const [txDesc, setTxDesc] = useState<string>('');
  const [txCategory, setTxCategory] = useState<ExpenseCategory>('Groceries & Dining');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txNotes, setTxNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TX_KEY, JSON.stringify(transactions));
    } catch {
      // Ignore quota errors in restricted environments
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BUDGET_KEY, JSON.stringify(budgets));
    } catch {
      // Ignore quota errors
    }
  }, [budgets]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'budgets' || view === 'overview') {
      setActiveView(view);
    }
  }, []);

  const filteredTransactions = useMemo(
    () =>
      filterTransactions(transactions, {
        month: selectedMonth,
        category: selectedCategory,
        type: selectedType,
        searchQuery,
      }),
    [transactions, selectedMonth, selectedCategory, selectedType, searchQuery]
  );

  // Compute metrics for the selected month so budgets align with monthly spending
  const monthlyTransactions = useMemo(
    () =>
      filterTransactions(transactions, {
        month: selectedMonth,
        category: 'ALL',
        type: 'ALL',
      }),
    [transactions, selectedMonth]
  );

  const metrics = useMemo(
    () => computeLedgerMetrics(monthlyTransactions, budgets),
    [monthlyTransactions, budgets]
  );

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(txAmount);
    if (!txDesc.trim() || !Number.isFinite(numAmount) || numAmount <= 0) {
      setFeedback('Please enter a description and a valid positive amount.');
      return;
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      date: txDate || '2026-10-20',
      description: txDesc.trim(),
      category: txCategory,
      type: txType,
      amount: Math.round(numAmount * 100) / 100,
      notes: txNotes.trim() || undefined,
    };

    setTransactions((prev) => [newTx, ...prev]);
    const txMonth = newTx.date.slice(0, 7);
    if (selectedMonth !== 'ALL' && /^\d{4}-\d{2}$/.test(txMonth) && txMonth !== selectedMonth) {
      setSelectedMonth(txMonth);
    }
    setTxDesc('');
    setTxAmount('');
    setTxNotes('');
    setFeedback(`Recorded ${txType}: "${newTx.description}" (${formatCurrency(newTx.amount)}).`);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleResetDemo = () => {
    setTransactions(DEMO_TRANSACTIONS);
    setBudgets(DEFAULT_BUDGETS);
    setSelectedMonth('2026-10');
    setSelectedCategory('ALL');
    setSelectedType('ALL');
    setSearchQuery('');
    setFeedback('Restored October 2026 demonstration ledger and default category budgets.');
  };

  const handleClearAll = () => {
    setTransactions([]);
    setFeedback('Cleared all transactions from local browser storage.');
  };

  const handleExportCsv = () => {
    const csv = exportTransactionsToCsv(filteredTransactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpendWise-Ledger-${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback(`Exported ${filteredTransactions.length} transactions to CSV.`);
  };

  const totalMonthlyBudget = EXPENSE_CATEGORIES.reduce(
    (acc, cat) => acc + (budgets[cat] ?? 0),
    0
  );

  // Build SVG Donut segments for category breakdown
  const donutSegments = useMemo(() => {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return metrics.categoryTotals
      .filter((c) => c.spent > 0)
      .map((item) => {
        const pct = metrics.totalExpense > 0 ? item.spent / metrics.totalExpense : 0;
        const strokeDasharray = `${pct * circumference} ${circumference}`;
        const strokeDashoffset = -accumulatedPercent * circumference;
        accumulatedPercent += pct;
        return {
          ...item,
          radius,
          strokeDasharray,
          strokeDashoffset,
        };
      });
  }, [metrics]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
              <Wallet className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  SpendWise
                </h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Local-First Ledger
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Personal cashflow, monthly category budgets & visual expense analytics
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveView('overview')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'overview'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dashboard & Ledger
              </button>
              <button
                type="button"
                onClick={() => setActiveView('budgets')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'budgets'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Monthly Budgets
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
              Reset Demo Data
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredTransactions.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {feedback && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              {feedback}
            </span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="underline text-emerald-800 ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <section
          aria-label="Monthly financial summary"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Monthly Income</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="font-mono text-2xl font-bold text-slate-900 mt-2">
              {formatCurrency(metrics.totalIncome)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Period: {selectedMonth === 'ALL' ? 'All Time' : selectedMonth}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Monthly Expenses</span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <p className="font-mono text-2xl font-bold text-slate-900 mt-2">
              {formatCurrency(metrics.totalExpense)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Target Budget: {formatCurrency(totalMonthlyBudget)}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Net Cashflow</span>
              <Wallet className="w-4 h-4 text-emerald-700" />
            </div>
            <p
              className={`font-mono text-2xl font-bold mt-2 ${
                metrics.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {formatCurrency(metrics.netBalance)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Income minus recorded expenses
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Savings Rate</span>
              <PieChart className="w-4 h-4 text-sky-600" />
            </div>
            <p className="font-mono text-2xl font-bold text-slate-900 mt-2">
              {metrics.savingsRatePercent}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Of recorded gross monthly income
            </p>
          </div>
        </section>

        {activeView === 'budgets' ? (
          /* MONTHLY BUDGET CONFIGURATION VIEW */
          <section
            aria-labelledby="budgets-heading"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 id="budgets-heading" className="text-lg font-bold text-slate-900">
                  Monthly Category Budget Targets
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adjust monthly spending caps for each category. Utilization bars update automatically in real time.
                </p>
              </div>
              <div className="font-mono text-sm font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-lg border border-emerald-200">
                Total Monthly Cap: {formatCurrency(totalMonthlyBudget)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {metrics.categoryTotals.map((cat) => {
                const overBudget = cat.spent > cat.budget && cat.budget > 0;
                return (
                  <div
                    key={cat.category}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-semibold text-slate-900">
                          {cat.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`budget-${cat.category}`}
                          className="text-xs text-slate-500"
                        >
                          Cap ($):
                        </label>
                        <input
                          id={`budget-${cat.category}`}
                          type="number"
                          min={0}
                          step={25}
                          value={budgets[cat.category]}
                          onChange={(e) =>
                            setBudgets((prev) => ({
                              ...prev,
                              [cat.category]: Math.max(0, Number(e.target.value) || 0),
                            }))
                          }
                          className="w-24 px-2.5 py-1 font-mono text-xs rounded-lg border border-slate-300 bg-white text-right"
                        />
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          overBudget
                            ? 'bg-rose-600'
                            : cat.utilizationPercent > 85
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                        style={{
                          width: `${Math.min(100, cat.utilizationPercent)}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-xs font-mono text-slate-600">
                      <span>Spent: {formatCurrency(cat.spent)}</span>
                      <span className={overBudget ? 'text-rose-600 font-bold' : ''}>
                        {cat.utilizationPercent}% of {formatCurrency(cat.budget)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          /* OVERVIEW & LEDGER VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Analytics + Add Transaction Form */}
            <div className="lg:col-span-5 space-y-6">
              {/* Category Breakdown & Donut Chart */}
              <section
                aria-labelledby="analytics-heading"
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 id="analytics-heading" className="text-base font-bold text-slate-900">
                    Spending Breakdown & Budget Health
                  </h2>
                  <span className="text-xs font-mono text-slate-500">
                    {selectedMonth === 'ALL' ? 'All Months' : selectedMonth}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                  {/* SVG Donut Chart */}
                  <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                    <svg className="w-36 h-36 -rotate-90" viewBox="0 0 140 140">
                      <circle
                        cx="70"
                        cy="70"
                        r="58"
                        fill="transparent"
                        stroke="#e2e8f0"
                        strokeWidth="16"
                      />
                      {donutSegments.map((seg) => (
                        <circle
                          key={seg.category}
                          cx="70"
                          cy="70"
                          r={seg.radius}
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth="16"
                          strokeDasharray={seg.strokeDasharray}
                          strokeDashoffset={seg.strokeDashoffset}
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] uppercase font-mono text-slate-400">
                        Total Spent
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {formatCurrency(metrics.totalExpense)}
                      </span>
                    </div>
                  </div>

                  {/* Category utilization list */}
                  <div className="flex-1 w-full space-y-2.5">
                    {metrics.categoryTotals.map((item) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-slate-700 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.category}
                          </span>
                          <span className="font-mono text-slate-900 font-semibold">
                            {formatCurrency(item.spent)}{' '}
                            <span className="text-slate-400 font-normal">
                              / {formatCurrency(item.budget)}
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, item.utilizationPercent)}%`,
                              backgroundColor:
                                item.spent > item.budget && item.budget > 0
                                  ? '#e11d48'
                                  : item.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Record Transaction Form */}
              <section
                aria-labelledby="record-heading"
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs"
              >
                <h2
                  id="record-heading"
                  className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-700" />
                  Record Income or Expense
                </h2>

                <form onSubmit={handleAddTransaction} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTxType('expense');
                        setTxCategory('Groceries & Dining');
                      }}
                      className={`py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                        txType === 'expense'
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      Expense Outflow
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTxType('income');
                        setTxCategory('Salary & Freelance');
                      }}
                      className={`py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                        txType === 'income'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      Income Inflow
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="tx-amount"
                        className="block text-xs font-semibold text-slate-600 mb-1"
                      >
                        Amount ($)
                      </label>
                      <input
                        id="tx-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tx-date"
                        className="block text-xs font-semibold text-slate-600 mb-1"
                      >
                        Date
                      </label>
                      <input
                        id="tx-date"
                        type="date"
                        required
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="tx-category"
                      className="block text-xs font-semibold text-slate-600 mb-1"
                    >
                      Category
                    </label>
                    <select
                      id="tx-category"
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    >
                      {(txType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(
                        (cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="tx-desc"
                      className="block text-xs font-semibold text-slate-600 mb-1"
                    >
                      Description / Merchant
                    </label>
                    <input
                      id="tx-desc"
                      type="text"
                      required
                      value={txDesc}
                      onChange={(e) => setTxDesc(e.target.value)}
                      placeholder="e.g. Weekly Farmers Market"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-xs cursor-pointer"
                  >
                    Add Transaction to Ledger
                  </button>
                </form>
              </section>
            </div>

            {/* Right Column: Filterable Transaction History */}
            <section
              aria-labelledby="ledger-heading"
              className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 id="ledger-heading" className="text-base font-bold text-slate-900">
                      Transaction History ({filteredTransactions.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Filter by period, category, cashflow type, or merchant keyword
                    </p>
                  </div>
                  {transactions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear Ledger
                    </button>
                  )}
                </div>

                {/* Filters Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      aria-label="Search transactions"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search description or category..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <select
                      aria-label="Filter by month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                    >
                      {availableMonths.map((monthKey) => (
                        <option key={monthKey} value={monthKey}>
                          {formatMonthLabel(monthKey)}
                        </option>
                      ))}
                      <option value="ALL">All Dates</option>
                    </select>
                  </div>

                  <div>
                    <select
                      aria-label="Filter by category"
                      value={selectedCategory}
                      onChange={(e) =>
                        setSelectedCategory(e.target.value as ExpenseCategory | 'ALL')
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="ALL">All Categories</option>
                      {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transactions List */}
                {filteredTransactions.length === 0 ? (
                  <div className="py-14 text-center border border-dashed border-slate-200 rounded-xl">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">
                      No matching transactions found
                    </p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Adjust your search filters or click &ldquo;Reset Demo Data&rdquo; to restore sample entries.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetDemo}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white cursor-pointer"
                    >
                      Restore Demo Transactions
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-mono uppercase text-slate-400">
                          <th className="py-2 px-2">Date</th>
                          <th className="py-2 px-2">Description</th>
                          <th className="py-2 px-2">Category</th>
                          <th className="py-2 px-2 text-right">Amount</th>
                          <th className="py-2 px-1 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-2 font-mono text-slate-500 whitespace-nowrap">
                              {tx.date}
                            </td>
                            <td className="py-3 px-2 font-medium text-slate-900">
                              {tx.description}
                            </td>
                            <td className="py-3 px-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                                {tx.category}
                              </span>
                            </td>
                            <td
                              className={`py-3 px-2 font-mono font-bold text-right whitespace-nowrap ${
                                tx.type === 'income' ? 'text-emerald-700' : 'text-slate-900'
                              }`}
                            >
                              {tx.type === 'income' ? '+' : '-'}
                              {formatCurrency(tx.amount)}
                            </td>
                            <td className="py-3 px-1 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx.id)}
                                aria-label={`Delete ${tx.description}`}
                                className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Stored in browser localStorage (`spendwise_transactions_v1`)
                </span>
                <span>Not financial or tax advice</span>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <strong>Disclaimer & Storage Scope:</strong> SpendWise stores data exclusively in your local browser storage. Clearing browser site data removes local records unless exported via CSV. Figures are for personal budgeting only and do not constitute financial advice.
          </div>
          <div className="font-mono shrink-0">SpendWise v1.0 • MIT License</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
