import { redirect } from "next/navigation";
import { PersonForm } from "@/components/admin/PersonForm";
import { createPersonAction } from "./actions";
import type { CreatePersonInput } from "@/types/person";
import type { ValidationError } from "@/types/errors";

export default async function NewPersonPage() {
  async function handleSubmit(
    values: CreatePersonInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await createPersonAction(values);
    if (!result.errors) {
      redirect("/people");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">制作陣を追加</h1>
      <PersonForm mode="create" onSubmit={handleSubmit} />
    </div>
  );
}
