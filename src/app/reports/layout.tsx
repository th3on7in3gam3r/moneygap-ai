import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo href="/dashboard" />
            <span className="hidden text-sm text-fg-subtle sm:inline">Intelligence Report</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden rounded-xl px-3 py-2 text-sm text-fg-muted transition hover:text-fg sm:inline"
            >
              Dashboard
            </Link>
            <ThemeToggle />
            <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
          </div>
        </div>
      </header>
      <main className="px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
