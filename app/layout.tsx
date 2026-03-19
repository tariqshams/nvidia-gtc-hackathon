import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Avatar Narrator',
  description: 'Esports Hype Caster built with Next.js and NVIDIA VILA / Nemotron endpoints.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-950 text-neutral-100">{children}</body>
    </html>
  );
}
