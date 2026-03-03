import Link from "next/link";
import type { Transaction } from "@/types/transaction";
import { formatYen, formatDate } from "@/lib/formatters";

type TransactionListItemProps = {
  transaction: Transaction;
};

export function TransactionListItem({
  transaction,
}: TransactionListItemProps) {
  const isExpense = transaction.type === "expense";

  return (
    <Link
      href={`/transactions/${transaction.id}/edit`}
      className="flex items-center justify-between border-b border-foreground/5 py-3 transition-colors hover:bg-foreground/[0.02] last:border-b-0"
    >
      <div className="flex items-center gap-3">
        <span className="w-10 text-sm text-foreground/40">
          {formatDate(transaction.date)}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">
              {transaction.categoryName}
            </span>
            {transaction.isOshikatsu && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                推し活
              </span>
            )}
          </div>
          {transaction.memo && (
            <p className="mt-0.5 text-xs text-foreground/40">
              {transaction.memo}
            </p>
          )}
        </div>
      </div>
      <span
        className={`text-sm font-medium ${
          isExpense ? "text-red-500" : "text-green-600"
        }`}
      >
        {isExpense ? "-" : "+"}
        {formatYen(transaction.amount)}
      </span>
    </Link>
  );
}
