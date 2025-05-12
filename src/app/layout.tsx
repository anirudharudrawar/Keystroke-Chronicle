import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Keystroke Chronicle',
  description: 'A simple keylogger for ethical input capture understanding.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark"> {/* Apply dark theme */}
      <body className={`${geistMono.variable} font-mono antialiased`}> {/* Apply monospace font */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
