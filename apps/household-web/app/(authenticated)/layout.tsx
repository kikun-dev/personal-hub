import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { Header } from "@/components/layout/Header";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userEmail={user.email ?? ""} />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
