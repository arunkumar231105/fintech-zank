import './globals.css';
import { Inter } from 'next/font/google';
import AppProviders from '../components/providers/AppProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Zank AI',
  description: 'AI-powered finance app for Gen Z',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
