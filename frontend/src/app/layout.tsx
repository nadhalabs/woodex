import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
