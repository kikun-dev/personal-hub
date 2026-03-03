import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentMethod } from "@/types/paymentMethod";
import type { PaymentMethodRepository } from "@/types/repositories";
import { RepositoryError } from "@/types/errors";

type PaymentMethodRow = {
  id: string;
  name: string;
  sort_order: number;
  is_default: boolean;
};

function mapToPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isDefault: row.is_default,
  };
}

export function createPaymentMethodRepository(
  supabase: SupabaseClient
): PaymentMethodRepository {
  return {
    async findAll(userId) {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, name, sort_order, is_default")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order("sort_order", { ascending: true });

      if (error) {
        throw new RepositoryError("支払い方法の取得に失敗しました", error);
      }
      return (data as PaymentMethodRow[]).map(mapToPaymentMethod);
    },
  };
}
