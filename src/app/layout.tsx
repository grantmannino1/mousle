// ============================================================
//  app/layout.tsx
// ============================================================

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MouseWordle — Daily Mouse Brain Atlas Game',
  description:
    'Identify mystery mouse brain regions from the Allen CCFv3 atlas. A daily neuroanatomy puzzle game.',
  keywords: ['neuroscience', 'mouse brain', 'allen atlas', 'neuroanatomy', 'puzzle', 'wordle'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-lab-bg text-gray-200 font-mono">
        {children}
      </body>
    </html>
  );
}
