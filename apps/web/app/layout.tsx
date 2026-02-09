import type { Metadata } from 'next';
import { Space_Grotesk, Source_Code_Pro } from 'next/font/google';
import './globals.css';

const sans = Space_Grotesk({
  variable: '--font-sans',
  subsets: ['latin'],
});

const mono = Source_Code_Pro({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Deep Research Chat',
  description: 'Chat UI for Mastra research agents',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}