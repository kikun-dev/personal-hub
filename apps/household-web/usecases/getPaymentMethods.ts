import type { PaymentMethodRepository } from "@/types/repositories";
import type { PaymentMethod } from "@/types/paymentMethod";

export async function getPaymentMethods(
  repo: PaymentMethodRepository,
  userId: string
): Promise<PaymentMethod[]> {
  return repo.findAll(userId);
}
