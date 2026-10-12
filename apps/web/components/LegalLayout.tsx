import Link from 'next/link';

/**
 * Shared shell for Meeti legal / policy pages.
 * Server component (no client JS needed).
 */
export default function LegalLayout({
  title,
  updated,
  notice,
  children,
}: {
  title: string;
  updated: string;
  notice?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            Meeti
          </Link>
          <nav className="flex gap-4 text-sm text-gray-600">
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900">Terms</Link>
            <Link href="/ai-policy" className="hover:text-gray-900">AI Policy</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {updated}</p>
        {notice && (
          <div className="mb-8 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {notice}
          </div>
        )}
        <div className="space-y-6 leading-relaxed text-gray-800">{children}</div>
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 text-sm text-gray-500">
          © 2026 Meeti. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
