import { redirect, notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createPersonRepository } from "@/repositories/personRepository";
import { getPerson } from "@/usecases/getPerson";
import { PersonForm } from "@/components/admin/PersonForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { updatePersonAction, deletePersonAction } from "./actions";
import type { UpdatePersonInput } from "@/types/person";
import type { ValidationError } from "@/types/errors";

type EditPersonPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPersonPage({
  params,
}: EditPersonPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const person = await getPerson(createPersonRepository(supabase), id);

  if (!person) {
    notFound();
  }

  const initialValues: UpdatePersonInput = {
    displayName: person.displayName,
    dateOfBirth: person.dateOfBirth ?? "",
    roles: person.roles,
    biography: person.biography ?? "",
  };

  async function handleSubmit(
    values: UpdatePersonInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await updatePersonAction(id, values);
    if (!result.errors) {
      redirect("/people");
    }
    return result;
  }

  async function handleDelete(): Promise<{ error?: string }> {
    "use server";
    const result = await deletePersonAction(id);
    if (!result.error) {
      redirect("/people");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">制作陣を編集</h1>
        <DeleteButton
          confirmMessage={`${person.displayName} を削除しますか？`}
          onDelete={handleDelete}
        />
      </div>
      <PersonForm
        mode="edit"
        initialValues={initialValues}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
