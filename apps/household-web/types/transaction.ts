export type Transaction = {
  id: string;
  userId: string;
  date: string;
  type: "expense";
  amount: number;
  categoryId: string | null;
  categoryName: string | null;
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
  amount: number;
  categoryId: string | null;
  paymentMethodId: string | null;
  memo: string;
  isOshikatsu: boolean;
  groupName: string | null;
  activityType: string | null;
};

export type UpdateTransactionInput = CreateTransactionInput;
