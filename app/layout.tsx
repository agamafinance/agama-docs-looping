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
    template: '%s — Agama Docs',
    default: 'Agama Protocol — Documentation',
  },
  description:
    'Agama is a decentralized lending and borrowing protocol for Brazilian Real World Assets on Rayls. Architecturally inherited from RAAC.',
  openGraph: {
    title: 'Agama Protocol — Documentation',
    description:
      'Decentralized lending against tokenized Brazilian RWA on Rayls. RAAC-adapted.',
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
