import type { Transaction } from "@/types/transaction";
import { TransactionListItem } from "./TransactionListItem";

type TransactionListProps = {
  transactions: Transaction[];
};

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground/40">
        この月の取引はまだありません
      </p>
    );
  }

  return (
    <div>
      {transactions.map((tx) => (
        <TransactionListItem key={tx.id} transaction={tx} />
      ))}
    </div>
  );
}
