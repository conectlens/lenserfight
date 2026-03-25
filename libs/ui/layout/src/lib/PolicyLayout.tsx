import React from 'react';
import { Link } from 'react-router-dom';

export interface PolicyLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function PolicyLayout({ title, children }: PolicyLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 flex flex-col md:flex-row gap-12 text-gray-800">
      <aside className="w-full md:w-64 flex-shrink-0">
        <h2 className="font-bold uppercase tracking-wider text-sm mb-4 text-gray-500">Legal</h2>
        <nav className="flex flex-col gap-2">
          <Link to="/legal/terms" className="hover:text-black">Terms of Service</Link>
          <Link to="/legal/privacy" className="hover:text-black">Privacy Policy</Link>
          <Link to="/legal/cookies" className="hover:text-black">Cookie Policy</Link>
          <Link to="/legal/acceptable-use" className="hover:text-black">Acceptable Use</Link>
        </nav>
      </aside>
      <main className="flex-1 prose prose-slate">
        <h1 className="text-3xl font-black mb-8">{title}</h1>
        {children}
      </main>
    </div>
  );
}
