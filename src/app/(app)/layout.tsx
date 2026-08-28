import { requireSession } from "@/lib/session";
import AppShell from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <AppShell name={session.name}>{children}</AppShell>;
}
