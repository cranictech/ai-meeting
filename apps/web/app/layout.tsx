import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Meeting AI - Turn meetings into actionable notes',
  description: 'AI-powered meeting notes platform with multi-language support',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-gray-900 bg-white">{children}</body>
    </html>
  );
}

