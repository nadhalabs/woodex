import type { Metadata } from 'next';
import './globals.css';
import { FeedbackProvider } from '@/components/FeedbackProvider';

export const metadata: Metadata = {
  title: 'WOODEX — Simple Business Software for Furniture & Wood Stores',
  description: 'Lightweight multi-tenant SaaS for furniture stores, timber dealers, and showrooms.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><FeedbackProvider>{children}</FeedbackProvider></body>
    </html>
  );
}
