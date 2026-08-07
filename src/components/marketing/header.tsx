"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignInLink, StartFreeButton } from "@/components/auth-buttons";
import { FooterGrowthBadge } from "@/components/growth-badge/footer-badge";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/features", label: "Features" },
  { href: "/guides", label: "Guides" },
  { href: "/academy", label: "Growth Academy" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
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
            <SignInLink className="hidden sm:inline-flex" />
            <StartFreeButton />
          </Show>
          <Show when="signed-in">
            <Button href="/dashboard" variant="secondary" size="sm">
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
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg-muted transition hover:bg-bg-muted hover:text-fg md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="marketing-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="marketing-mobile-menu"
          className="fixed inset-0 top-16 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <button
            type="button"
            className="absolute inset-0 bg-bg/70 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            className="relative mx-auto flex max-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col gap-1 overflow-y-auto border-b border-border bg-bg-elevated px-5 py-4 shadow-[var(--shadow)] sm:px-8"
            aria-label="Mobile"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-3 text-base font-medium text-fg-muted transition hover:bg-bg-muted hover:text-fg",
                  pathname === link.href && "bg-bg-muted text-fg",
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 space-y-2 border-t border-border pt-4 sm:hidden">
              <Show when="signed-out">
                <div className="flex flex-col gap-2">
                  <SignInLink className="inline-flex h-11 w-full justify-center rounded-xl border border-border bg-bg-elevated text-fg" />
                  <div className="[&_button]:h-11 [&_button]:w-full [&_button]:justify-center">
                    <StartFreeButton />
                  </div>
                </div>
              </Show>
              <Show when="signed-in">
                <Button
                  href="/dashboard"
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={() => setMenuOpen(false)}
                >
                  Open Dashboard
                </Button>
              </Show>
            </div>
          </nav>
        </div>
      ) : null}
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
          <Link href="/guides" className="hover:text-fg">
            Guides
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
          <Link href="/extension" className="hover:text-fg">
            Extension
          </Link>
          <Link href="/security" className="hover:text-fg">
            Security
          </Link>
          <Link href="/privacy" className="hover:text-fg">
            Privacy
          </Link>
          <button
            type="button"
            className="hover:text-fg"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("mg:open-smart-consent"));
              }
            }}
          >
            Privacy preferences
          </button>
          <Link href="/terms" className="hover:text-fg">
            Terms
          </Link>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <span>© {new Date().getFullYear()} MoneyGap AI</span>
            <FooterGrowthBadge />
          </div>
          <span>AI Business Growth OS</span>
        </div>
      </div>
    </footer>
  );
}
