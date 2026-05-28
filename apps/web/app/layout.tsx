import type { Metadata } from 'next';
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

const siteUrl = new URL('https://bad-unicorn.hrgo.co.uk');
const socialTitle = 'Bad Unicorn | Finding candidates with attitude';
const socialDescription =
  'Turn vague hiring manager vibes into names, LinkedIn links, and candidate evidence without wrestling Boolean strings all afternoon.';

const sans = Space_Grotesk({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: 'Bad Unicorn',
  title: {
    default: socialTitle,
    template: '%s | Bad Unicorn',
  },
  description: socialDescription,
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/unicornlogo.png',
    apple: '/unicornlogo.png',
  },
  openGraph: {
    title: socialTitle,
    description: socialDescription,
    url: '/',
    siteName: 'Bad Unicorn',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Bad Unicorn recruiter intelligence workspace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: socialTitle,
    description: socialDescription,
    images: ['/twitter-image'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} antialiased`}>{children}</body>
    </html>
  );
}
