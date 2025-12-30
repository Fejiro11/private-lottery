import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Private Lottery | FHE-Powered Prediction Game',
  description: 'A privacy-first prediction game using Fully Homomorphic Encryption. All guesses remain encrypted until reveal.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-dark-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
