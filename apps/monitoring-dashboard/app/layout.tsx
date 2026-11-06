import type { Metadata } from 'next';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Forest Guard — Fire Risk Monitoring & Live CCTV Dashboard',
  description:
    'Real-time BMKG weather monitoring, heuristic fire risk susceptibility analysis, and live HLS CCTV surveillance.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B1220] text-[#F8FAFC] antialiased">
        {children}
      </body>
    </html>
  );
}