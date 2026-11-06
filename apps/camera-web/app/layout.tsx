import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Forest Guard — Camera Management Web',
  description: 'CCTV hardware registration, HLS stream probing, and heartbeat broadcasting.',
};

export default function CameraWebRootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" className="dark">
      <body style={{ backgroundColor: '#0B1220', color: '#F8FAFC', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}