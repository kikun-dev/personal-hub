export type Transaction = {
  id: string;
  userId: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  categoryId: string;
  categoryName: string;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  memo: string;
  isOshikatsu: boolean;
  groupName: string | null;
  activityType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTransactionInput = {
  date: string;
  type: "income" | "expense";
  amount: number;
  categoryId: string;
  paymentMethodId: string | null;
  memo: string;
  isOshikatsu: boolean;
  groupName: string | null;
  activityType: string | null;
};

export type UpdateTransactionInput = CreateTransactionInput;
