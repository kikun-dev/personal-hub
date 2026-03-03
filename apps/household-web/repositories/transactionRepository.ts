import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction } from "@/types/transaction";
import type { TransactionRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";

type TransactionRow = {
  id: string;
  user_id: string;
  date: string;
  type: string;
  amount: number;
  category_id: string | null;
  categories: { name: string } | null;
  payment_method_id: string | null;
  payment_methods: { name: string } | null;
  memo: string;
  is_oshikatsu: boolean;
  group_name: string | null;
  activity_type: string | null;
  created_at: string;
  updated_at: string;
};

function mapToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    type: "expense",
    amount: row.amount,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? null,
    paymentMethodId: row.payment_method_id,
    paymentMethodName: row.payment_methods?.name ?? null,
    memo: row.memo,
    isOshikatsu: row.is_oshikatsu,
    groupName: row.group_name,
    activityType: row.activity_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getMonthRange(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

export function createTransactionRepository(
  supabase: SupabaseClient
): TransactionRepository {
  return {
    async findByMonth(userId, year, month) {
      const { startDate, endDate } = getMonthRange(year, month);

      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(name), payment_methods(name)")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (error) {
        throw new RepositoryError("取引の取得に失敗しました", error);
      }
      return (data as TransactionRow[]).map(mapToTransaction);
    },

    async findById(userId, id) {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(name), payment_methods(name)")
        .eq("user_id", userId)
        .eq("id", id)
        .single();

      if (error) {
        // PGRST116 = "行が見つからない"、22P02 = "UUID形式不正" → null を返す
        if (error.code === "PGRST116" || error.code === "22P02") {
          return null;
        }
        throw new RepositoryError("取引の取得に失敗しました", error);
      }
      return mapToTransaction(data as TransactionRow);
    },

    async create(userId, input) {
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          date: input.date,
          type: "expense",
          amount: input.amount,
          category_id: input.isOshikatsu ? null : input.categoryId,
          payment_method_id: input.paymentMethodId,
          memo: input.memo,
          is_oshikatsu: input.isOshikatsu,
          group_name: input.isOshikatsu ? input.groupName : null,
          activity_type: input.isOshikatsu ? input.activityType : null,
        })
        .select("*, categories(name), payment_methods(name)")
        .single();

      if (error) {
        throw new RepositoryError("取引の作成に失敗しました", error);
      }
      return mapToTransaction(data as TransactionRow);
    },

    async update(userId, id, input) {
      const { data, error } = await supabase
        .from("transactions")
        .update({
          date: input.date,
          type: "expense",
          amount: input.amount,
          category_id: input.isOshikatsu ? null : input.categoryId,
          payment_method_id: input.paymentMethodId,
          memo: input.memo,
          is_oshikatsu: input.isOshikatsu,
          group_name: input.isOshikatsu ? input.groupName : null,
          activity_type: input.isOshikatsu ? input.activityType : null,
        })
        .eq("user_id", userId)
        .eq("id", id)
        .select("*, categories(name), payment_methods(name)")
        .single();

      if (error) {
        throw new RepositoryError("取引の更新に失敗しました", error);
      }
      return mapToTransaction(data as TransactionRow);
    },

    async delete(userId, id) {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("user_id", userId)
        .eq("id", id);

      if (error) {
        throw new RepositoryError("取引の削除に失敗しました", error);
      }
    },
  };
}
