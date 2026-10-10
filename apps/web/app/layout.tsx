import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Meeti - Turn meetings into actionable notes',
  description: 'AI-powered meeting notes platform with multi-language support',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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

