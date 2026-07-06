import type { Metadata } from 'next';
import { Host_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const host = Host_Grotesk({
  subsets: ['latin'],
  variable: '--font-host-grotesk',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: 'Agama Documentation',
    default: 'Agama Documentation',
  },
  description:
    'Agama is a synthetic dollar protocol backed by real-world private credit and bonds.',
  openGraph: {
    title: 'Agama Documentation',
    description:
      'Deposit USDC, mint agUSD, and stake for sagUSD — yield backed by real-world private credit and bonds.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${host.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
