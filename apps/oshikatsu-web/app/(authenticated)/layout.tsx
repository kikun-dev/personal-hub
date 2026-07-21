import { Header } from "@/components/layout/Header";
import {
  NavigationProgressBar,
  NavigationProgressProvider,
} from "@/components/ui/NavigationProgress";
import { getSessionRole, isAdminRole } from "@/lib/getSessionRole";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = await getSessionRole();
  const isAdmin = isAdminRole(role);

  return (
    <NavigationProgressProvider>
      <div className="min-h-screen bg-background">
        <NavigationProgressBar />
        <Header isAdmin={isAdmin} />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </NavigationProgressProvider>
  );
}
