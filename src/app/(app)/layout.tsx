/**
 * App Layout
 *
 * Layout for authenticated app pages with navigation shell.
 * Auth is handled server-side by requireAuth() in each page.
 */

import { AppShell } from "@/presentation/components/layout/app-shell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
