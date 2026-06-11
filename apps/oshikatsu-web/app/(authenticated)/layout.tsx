import { Header } from "@/components/layout/Header";
import {
  NavigationProgressBar,
  NavigationProgressProvider,
} from "@/components/ui/NavigationProgress";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <NavigationProgressProvider>
      <div className="min-h-screen bg-background">
        <NavigationProgressBar />
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </div>
    </NavigationProgressProvider>
  );
}
