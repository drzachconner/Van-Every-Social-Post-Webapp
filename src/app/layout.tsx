import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Van Every Social Posts',
  description: 'Upload images or video, preview, edit, then post',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
