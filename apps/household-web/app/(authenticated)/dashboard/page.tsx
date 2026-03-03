import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createTransactionRepository } from "@/repositories/transactionRepository";
import { calculateMonthlySummary } from "@/usecases/getMonthlySummary";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { TransactionSummary } from "@/components/dashboard/TransactionSummary";
import { TransactionList } from "@/components/transactions/TransactionList";

type DashboardPageProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const now = new Date();

  const rawYear = Number(params.year);
  const rawMonth = Number(params.month);
  const year =
    Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100
      ? rawYear
      : now.getFullYear();
  const month =
    Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12
      ? rawMonth
      : now.getMonth() + 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const repo = createTransactionRepository(supabase);
  const transactions = await repo.findByMonth(user!.id, year, month);
  const summary = calculateMonthlySummary(transactions, year, month);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">ダッシュボード</h1>
        <Suspense>
          <MonthSelector year={year} month={month} />
        </Suspense>
      </div>

      <TransactionSummary summary={summary} />

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground/60">
          取引一覧
        </h2>
        <TransactionList transactions={transactions} />
      </div>
    </div>
  );
}
