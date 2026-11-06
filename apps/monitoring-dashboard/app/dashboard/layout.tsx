import React from 'react';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC]">{children}</div>;
}