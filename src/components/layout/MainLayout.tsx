import { ReactNode } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';

interface MainLayoutProps {
  title: string;
  children: ReactNode;
}

export function MainLayout({ title, children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header title={title} />
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
