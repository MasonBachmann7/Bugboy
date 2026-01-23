import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ErrorCaptureProvider } from '@/components/ErrorCaptureProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BugBoy Demo | BugStack Test Application',
  description: 'A demonstration application for testing BugStack error capture and automatic PR creation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorCaptureProvider>
          {children}
        </ErrorCaptureProvider>
      </body>
    </html>
  );
}
