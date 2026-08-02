"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInLink, StartFreeButton } from "@/components/auth-buttons";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/features", label: "Features" },
  { href: "/academy", label: "Growth Academy" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function MarketingHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm text-fg-muted transition hover:text-fg",
                pathname === link.href && "text-fg",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Show when="signed-out">
            <SignInLink />
            <StartFreeButton />
          </Show>
          <Show when="signed-in">
            <Button href="/dashboard" variant="secondary" size="sm" className="hidden sm:inline-flex">
              Dashboard
            </Button>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </Show>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-bg-elevated">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-fg-muted">
            Find the revenue your website is leaving on the table — then close the gap.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
          <Link href="/features" className="hover:text-fg">
            Features
          </Link>
          <Link href="/academy" className="hover:text-fg">
            Growth Academy
          </Link>
          <Link href="/pricing" className="hover:text-fg">
            Pricing
          </Link>
          <Link href="/about" className="hover:text-fg">
            About
          </Link>
          <Link href="/contact" className="hover:text-fg">
            Contact
          </Link>
          <Link href="/docs" className="hover:text-fg">
            Docs
          </Link>
          <Link href="/security" className="hover:text-fg">
            Security
          </Link>
          <Link href="/privacy" className="hover:text-fg">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-fg">
            Terms
          </Link>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 text-xs text-fg-subtle sm:px-8">
          <span>© {new Date().getFullYear()} MoneyGap AI</span>
          <span>AI Business Growth OS</span>
        </div>
      </div>
    </footer>
  );
}
