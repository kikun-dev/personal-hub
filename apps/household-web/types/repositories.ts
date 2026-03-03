import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from "./transaction";
import type { Category } from "./category";
import type { PaymentMethod } from "./paymentMethod";

export type TransactionRepository = {
  findByMonth(userId: string, year: number, month: number): Promise<Transaction[]>;
  findById(userId: string, id: string): Promise<Transaction | null>;
  create(userId: string, input: CreateTransactionInput): Promise<Transaction>;
  update(userId: string, id: string, input: UpdateTransactionInput): Promise<Transaction>;
  delete(userId: string, id: string): Promise<void>;
};

export type CategoryRepository = {
  findAll(userId: string): Promise<Category[]>;
};

export type PaymentMethodRepository = {
  findAll(userId: string): Promise<PaymentMethod[]>;
};
