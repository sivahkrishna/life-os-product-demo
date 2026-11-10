import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { api } from "../lib/api";
import type { Account, Budget, FinanceSummary, Transaction } from "../types";
import Card, { CardHeader } from "../components/ui/Card";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal, { Field, inputClass } from "../components/ui/Modal";
import EmptyState, { ErrorBlock, LoadingBlock } from "../components/ui/EmptyState";

const CATEGORY_COLORS = ["#4338CA", "#0D9488", "#16A34A", "#D97706", "#DC2626", "#6B7280", "#7C3AED", "#0891B2"];

function currency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

type TxForm = {
  account_id: string;
  category: string;
  amount: string;
  type: Transaction["type"];
  date: string;
  note: string;
};

type AccountForm = { name: string; type: Account["type"]; balance: string };
type BudgetForm = { category: string; monthly_limit: string };

const todayISO = format(new Date(), "yyyy-MM-dd");

export default function FinancePage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [txPanel, setTxPanel] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txForm, setTxForm] = useState<TxForm>({
    account_id: "",
    category: "General",
    amount: "",
    type: "expense",
    date: todayISO,
    note: "",
  });

  const [accPanel, setAccPanel] = useState(false);
  const [editingAcc, setEditingAcc] = useState<Account | null>(null);
  const [accForm, setAccForm] = useState<AccountForm>({ name: "", type: "checking", balance: "0" });

  const [budgetPanel, setBudgetPanel] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetForm, setBudgetForm] = useState<BudgetForm>({ category: "", monthly_limit: "" });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "tx" | "acc" | "budget"; id: number } | null>(null);

  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, a, t, b] = await Promise.all([
        api.get<FinanceSummary>("/finance/summary"),
        api.get<Account[]>("/finance/accounts"),
        api.get<Transaction[]>("/finance/transactions"),
        api.get<Budget[]>("/finance/budgets").catch(() => ({ data: [] as Budget[] })),
      ]);
      setSummary(s.data);
      setAccounts(a.data);
      setTransactions(t.data);
      setBudgets(b.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not load your finances.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openTxCreate() {
    setEditingTx(null);
    setTxForm({
      account_id: accounts[0] ? String(accounts[0].id) : "",
      category: "General",
      amount: "",
      type: "expense",
      date: todayISO,
      note: "",
    });
    setFormError(null);
    setTxPanel(true);
  }

  function openTxEdit(t: Transaction) {
    setEditingTx(t);
    setTxForm({
      account_id: String(t.account_id),
      category: t.category,
      amount: String(t.amount),
      type: t.type,
      date: t.date,
      note: t.note ?? "",
    });
    setFormError(null);
    setTxPanel(true);
  }

  async function saveTx() {
    if (!txForm.account_id) {
      setFormError("Create an account first, then record transactions against it.");
      return;
    }
    const amount = Number(txForm.amount);
    if (!amount || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      account_id: Number(txForm.account_id),
      category: txForm.category.trim() || "General",
      amount,
      type: txForm.type,
      date: txForm.date,
      note: txForm.note.trim() || null,
    };
    try {
      if (editingTx) {
        const res = await api.put<Transaction>(`/finance/transactions/${editingTx.id}`, payload);
        setTransactions((prev) => prev.map((t) => (t.id === editingTx.id ? res.data : t)));
      } else {
        const res = await api.post<Transaction>("/finance/transactions", payload);
        setTransactions((prev) => [res.data, ...prev]);
      }
      setTxPanel(false);
      const s = await api.get<FinanceSummary>("/finance/summary");
      setSummary(s.data);
      const a = await api.get<Account[]>("/finance/accounts");
      setAccounts(a.data);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the transaction.");
    } finally {
      setSaving(false);
    }
  }

  function openAccCreate() {
    setEditingAcc(null);
    setAccForm({ name: "", type: "checking", balance: "0" });
    setFormError(null);
    setAccPanel(true);
  }

  function openAccEdit(a: Account) {
    setEditingAcc(a);
    setAccForm({ name: a.name, type: a.type, balance: String(a.balance) });
    setFormError(null);
    setAccPanel(true);
  }

  async function saveAcc() {
    if (!accForm.name.trim()) {
      setFormError("Give the account a name.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: accForm.name.trim(),
      type: accForm.type,
      balance: Number(accForm.balance) || 0,
    };
    try {
      if (editingAcc) {
        const res = await api.put<Account>(`/finance/accounts/${editingAcc.id}`, payload);
        setAccounts((prev) => prev.map((a) => (a.id === editingAcc.id ? res.data : a)));
      } else {
        const res = await api.post<Account>("/finance/accounts", payload);
        setAccounts((prev) => [...prev, res.data]);
      }
      setAccPanel(false);
      const s = await api.get<FinanceSummary>("/finance/summary");
      setSummary(s.data);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the account.");
    } finally {
      setSaving(false);
    }
  }

  function openBudgetCreate() {
    setEditingBudget(null);
    setBudgetForm({ category: "", monthly_limit: "" });
    setFormError(null);
    setBudgetPanel(true);
  }

  function openBudgetEdit(b: Budget) {
    setEditingBudget(b);
    setBudgetForm({ category: b.category, monthly_limit: String(b.monthly_limit) });
    setFormError(null);
    setBudgetPanel(true);
  }

  async function saveBudget() {
    if (!budgetForm.category.trim() || !Number(budgetForm.monthly_limit)) {
      setFormError("Enter a category and a monthly limit.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = { category: budgetForm.category.trim(), monthly_limit: Number(budgetForm.monthly_limit) };
    try {
      if (editingBudget) {
        const res = await api.put<Budget>(`/finance/budgets/${editingBudget.id}`, payload);
        setBudgets((prev) => prev.map((b) => (b.id === editingBudget.id ? res.data : b)));
      } else {
        const res = await api.post<Budget>("/finance/budgets", payload);
        setBudgets((prev) => [...prev, res.data]);
      }
      setBudgetPanel(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || "Could not save the budget.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm) return;
    const { kind, id } = confirm;
    try {
      if (kind === "tx") {
        await api.delete(`/finance/transactions/${id}`);
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      } else if (kind === "acc") {
        await api.delete(`/finance/accounts/${id}`);
        setAccounts((prev) => prev.filter((a) => a.id !== id));
      } else {
        await api.delete(`/finance/budgets/${id}`);
        setBudgets((prev) => prev.filter((b) => b.id !== id));
      }
    } finally {
      setConfirm(null);
    }
  }

  const categoryData = useMemo(
    () =>
      (summary?.by_category ?? []).map((c, i) => ({
        ...c,
        fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      })),
    [summary],
  );

  const visibleTx = useMemo(
    () =>
      transactions
        .filter((t) => (typeFilter === "all" ? true : t.type === typeFilter))
        .filter((t) => (categoryFilter === "all" ? true : t.category === categoryFilter))
        .filter((t) => (accountFilter === "all" ? true : String(t.account_id) === accountFilter))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, typeFilter, categoryFilter, accountFilter],
  );

  const spendByCategory = useMemo(() => {
    const month = format(new Date(), "yyyy-MM");
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense" || !t.date.startsWith(month)) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return map;
  }, [transactions]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <LoadingBlock />
          </Card>
        ))}
      </div>
    );
  }
  if (error) return <ErrorBlock message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total balance" value={currency(summary?.total_balance ?? 0)} hint="across all accounts" />
        <StatCard label="Income this month" value={currency(summary?.month_income ?? 0)} trend={{ value: "income", positive: true }} />
        <StatCard label="Expenses this month" value={currency(summary?.month_expense ?? 0)} trend={{ value: "spending", positive: false }} />
        <StatCard
          label="Net this month"
          value={currency((summary?.month_income ?? 0) - (summary?.month_expense ?? 0))}
          hint="income − expenses"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Spending by category" subtitle="Expense totals recorded in your transactions" />
          {categoryData.length === 0 ? (
            <EmptyState title="No category data" description="Record an expense and the breakdown appears here." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--surface-muted)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                      boxShadow: "0 4px 12px rgba(16,24,40,0.08)",
                    }}
                    formatter={((v: any) => [currency(Number(v)), "Total"]) as any}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {categoryData.map((entry) => (
                      <Cell key={entry.category} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Accounts"
            action={
              <Button variant="ghost" size="sm" onClick={openAccCreate}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add
              </Button>
            }
          />
          {accounts.length === 0 ? (
            <EmptyState title="No accounts" description="Add a bank, cash or card account to start tracking." />
          ) : (
            <ul className="divide-y divide-border">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[0.875rem] font-medium text-ink">{a.name}</p>
                    <p className="text-[0.75rem] capitalize text-muted">{a.type}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="mr-1 font-display text-[0.875rem] font-semibold text-ink">{currency(a.balance)}</span>
                    <button
                      type="button"
                      onClick={() => openAccEdit(a)}
                      aria-label={`Edit ${a.name}`}
                      className="rounded p-1 text-muted hover:bg-surfaceMuted hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: "acc", id: a.id })}
                      aria-label={`Delete ${a.name}`}
                      className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card padding={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <h3 className="mr-auto font-display text-[1.0625rem] font-semibold text-ink">Transactions</h3>
          <select
            aria-label="Filter by type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[0.8125rem] text-ink focus:border-primary focus:outline-none"
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[0.8125rem] text-ink focus:border-primary focus:outline-none"
          >
            <option value="all">All categories</option>
            {Array.from(new Set(transactions.map((t) => t.category))).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by account"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[0.8125rem] text-ink focus:border-primary focus:outline-none"
          >
            <option value="all">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={openTxCreate}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add transaction
          </Button>
        </div>

        {visibleTx.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={transactions.length === 0 ? "No transactions yet" : "Nothing matches these filters"}
              description={
                transactions.length === 0
                  ? "Record income and expenses to see balances, categories and trends."
                  : "Clear the filters to see everything again."
              }
              action={transactions.length === 0 ? <Button onClick={openTxCreate}>Record a transaction</Button> : undefined}
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[0.875rem]">
                <thead className="sticky top-0 bg-surfaceMuted/70 text-[0.75rem] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 font-medium">Account</th>
                    <th className="px-4 py-2.5 font-medium">Note</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleTx.map((t) => (
                    <tr key={t.id} className="hover:bg-surfaceMuted/40">
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {format(new Date(`${t.date}T00:00:00`), "d MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">{t.category}</td>
                      <td className="px-4 py-3 text-muted">{accounts.find((a) => a.id === t.account_id)?.name ?? "—"}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-muted">{t.note || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge tone={t.type === "income" ? "success" : "danger"}>
                          {t.type === "income" ? "Income" : "Expense"}
                        </Badge>
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                          t.type === "income" ? "text-success" : "text-ink"
                        }`}
                      >
                        {t.type === "income" ? "+" : "−"}
                        {currency(t.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openTxEdit(t)}
                            aria-label="Edit transaction"
                            className="rounded-lg p-1.5 text-muted hover:bg-surfaceMuted hover:text-ink"
                          >
                            <Pencil className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirm({ kind: "tx", id: t.id })}
                            aria-label="Delete transaction"
                            className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {visibleTx.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-[0.9375rem] font-medium text-ink">{t.category}</p>
                    <p className="text-[0.75rem] text-muted">
                      {format(new Date(`${t.date}T00:00:00`), "d MMM")} ·{" "}
                      {accounts.find((a) => a.id === t.account_id)?.name ?? "—"}
                    </p>
                    {t.note && <p className="mt-1 truncate text-[0.75rem] text-muted">{t.note}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`font-medium ${t.type === "income" ? "text-success" : "text-ink"}`}>
                      {t.type === "income" ? "+" : "−"}
                      {currency(t.amount)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openTxEdit(t)}
                        aria-label="Edit transaction"
                        className="rounded p-1 text-muted hover:bg-surfaceMuted"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm({ kind: "tx", id: t.id })}
                        aria-label="Delete transaction"
                        className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Monthly budgets"
          subtitle="Limit per category for the current month"
          action={
            <Button variant="ghost" size="sm" onClick={openBudgetCreate}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add budget
            </Button>
          }
        />
        {budgets.length === 0 ? (
          <EmptyState title="No budgets set" description="Set a monthly limit per category to keep spending in view." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {budgets.map((b) => {
              const spent = spendByCategory.get(b.category) ?? 0;
              const pct = b.monthly_limit > 0 ? Math.round((spent / b.monthly_limit) * 100) : 0;
              const tone = pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-success";
              return (
                <li key={b.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[0.875rem] font-medium text-ink">{b.category}</p>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openBudgetEdit(b)}
                        aria-label={`Edit ${b.category} budget`}
                        className="rounded p-1 text-muted hover:bg-surfaceMuted hover:text-ink"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm({ kind: "budget", id: b.id })}
                        aria-label={`Delete ${b.category} budget`}
                        className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surfaceMuted">
                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <p className="mt-1.5 text-[0.75rem] text-muted">
                    {currency(spent)} of {currency(b.monthly_limit)} · {pct}%
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Transaction panel */}
      <Modal
        open={txPanel}
        onClose={() => setTxPanel(false)}
        title={editingTx ? "Edit transaction" : "New transaction"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTxPanel(false)}>
              Cancel
            </Button>
            <Button onClick={saveTx} loading={saving}>
              {editingTx ? "Save changes" : "Add transaction"}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
            {formError}
          </div>
        )}
        <div className="mb-4 flex gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTxForm({ ...txForm, type: t })}
              className={`flex-1 rounded-lg border px-3 py-2 text-[0.8125rem] font-medium capitalize transition-colors ${
                txForm.type === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted hover:bg-surfaceMuted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <Field label="Account">
          <select
            className={inputClass}
            value={txForm.account_id}
            onChange={(e) => setTxForm({ ...txForm, account_id: e.target.value })}
          >
            <option value="">Select an account</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={txForm.amount}
              onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
              placeholder="0.00"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              className={inputClass}
              value={txForm.date}
              onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Category">
          <input
            className={inputClass}
            value={txForm.category}
            onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
            placeholder="e.g. Groceries"
          />
        </Field>
        <Field label="Note" hint="Optional">
          <input
            className={inputClass}
            value={txForm.note}
            onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
            placeholder="What was this for?"
          />
        </Field>
      </Modal>

      {/* Account panel */}
      <Modal
        open={accPanel}
        onClose={() => setAccPanel(false)}
        title={editingAcc ? "Edit account" : "New account"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAccPanel(false)}>
              Cancel
            </Button>
            <Button onClick={saveAcc} loading={saving}>
              {editingAcc ? "Save changes" : "Add account"}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
            {formError}
          </div>
        )}
        <Field label="Account name">
          <input
            className={inputClass}
            value={accForm.name}
            onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
            placeholder="e.g. Main checking"
          />
        </Field>
        <Field label="Type">
          <select
            className={inputClass}
            value={accForm.type}
            onChange={(e) => setAccForm({ ...accForm, type: e.target.value as Account["type"] })}
          >
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit">Credit</option>
            <option value="cash">Cash</option>
            <option value="investment">Investment</option>
          </select>
        </Field>
        <Field label="Current balance">
          <input
            type="number"
            step="0.01"
            className={inputClass}
            value={accForm.balance}
            onChange={(e) => setAccForm({ ...accForm, balance: e.target.value })}
          />
        </Field>
      </Modal>

      {/* Budget panel */}
      <Modal
        open={budgetPanel}
        onClose={() => setBudgetPanel(false)}
        title={editingBudget ? "Edit budget" : "New budget"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBudgetPanel(false)}>
              Cancel
            </Button>
            <Button onClick={saveBudget} loading={saving}>
              {editingBudget ? "Save changes" : "Add budget"}
            </Button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger">
            {formError}
          </div>
        )}
        <Field label="Category">
          <input
            className={inputClass}
            value={budgetForm.category}
            onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
            placeholder="e.g. Groceries"
          />
        </Field>
        <Field label="Monthly limit">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={budgetForm.monthly_limit}
            onChange={(e) => setBudgetForm({ ...budgetForm, monthly_limit: e.target.value })}
            placeholder="0.00"
          />
        </Field>
      </Modal>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Confirm delete"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-[0.875rem] text-muted">
          {confirm?.kind === "acc"
            ? "Deleting an account also removes the transactions recorded against it."
            : "This item will be permanently removed. This cannot be undone."}
        </p>
      </Modal>
    </div>
  );
}
