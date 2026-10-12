import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme';

// Runs before first paint so the correct theme is applied with no flash.
const themeInitScript = `
(function(){try{var t=localStorage.getItem('meeti-theme');if(t!=='light'&&t!=='dark'){t='dark';}var r=document.documentElement;r.classList.toggle('dark',t==='dark');}catch(e){document.documentElement.classList.add('dark');}})();
`;

export const metadata: Metadata = {
  metadataBase: new URL('https://meeti.org.uk'),
  title: {
    default: 'Meeti - Turn meetings into actionable notes',
    template: '%s | Meeti',
  },
  description: 'AI-powered meeting notes platform with multi-language support',
  openGraph: {
    type: 'website',
    siteName: 'Meeti',
    title: 'Meeti - Turn meetings into actionable notes',
    description: 'AI-powered meeting notes: transcription, summaries, action items and decisions.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meeti - Turn meetings into actionable notes',
    description: 'AI-powered meeting notes: transcription, summaries, action items and decisions.',
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

