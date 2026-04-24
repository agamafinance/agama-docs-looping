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
    'Agama is a decentralized lending and borrowing protocol for Brazilian Real World Assets on Rayls.',
  openGraph: {
    title: 'Agama Documentation',
    description:
      'Decentralized lending against tokenized Brazilian RWA on Rayls.',
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
