import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createTransactionRepository } from "@/repositories/transactionRepository";
import { getMonthlySummary } from "@/usecases/getMonthlySummary";
import { listTransactions } from "@/usecases/listTransactions";
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
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const repo = createTransactionRepository(supabase);
  const [summary, transactions] = await Promise.all([
    getMonthlySummary(repo, user!.id, year, month),
    listTransactions(repo, user!.id, { year, month }),
  ]);

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
