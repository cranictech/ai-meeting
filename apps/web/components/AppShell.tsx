'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from './theme';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', exact: true },
  { href: '/dashboard/meetings', label: 'Meetings' },
  { href: '/dashboard/tasks', label: 'Tasks' },
  { href: '/dashboard/search', label: 'Search' },
  { href: '/dashboard/organizations', label: 'Teams' },
  { href: '/dashboard/integrations', label: 'Integrations' },
  { href: '/dashboard/developer', label: 'Developer' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/settings', label: 'Settings' },
];

function initials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppShell({
  children,
  userName,
  userEmail,
  search,
}: {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  search?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/apple-touch-icon.png" alt="Meeti" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-lg font-bold tracking-tight text-foreground">Meeti</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(item.href, item.exact)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block">{search}</div>
            <ThemeToggle />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 transition hover:border-primary/40"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                  {initials(userName)}
                </span>
                <span className="hidden max-w-[10rem] truncate text-sm font-medium text-foreground sm:block">
                  {userName || 'Account'}
                </span>
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden
                  />
                  <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                    <div className="border-b border-border px-4 py-3">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {userName || 'Your account'}
                      </div>
                      {userEmail && (
                        <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
                      )}
                    </div>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-foreground hover:bg-muted"
                    >
                      Settings
                    </Link>
                    <Link
                      href="/dashboard/billing"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-foreground hover:bg-muted"
                    >
                      Billing
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full border-t border-border px-4 py-2.5 text-left text-sm text-destructive hover:bg-muted"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMobileNav((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground lg:hidden"
              aria-label="Toggle navigation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
          </div>
        </div>

        {mobileNav && (
          <nav className="border-t border-border bg-card px-4 py-2 lg:hidden">
            <div className="mb-2 md:hidden">{search}</div>
            <div className="grid grid-cols-2 gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNav(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive(item.href, item.exact)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
