import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { InvioMassivoBanner } from '@/components/InvioMassivoBanner';

interface MainLayoutProps {
  title: string;
  children: ReactNode;
}

export function MainLayout({ title, children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title={title} />
      <InvioMassivoBanner />
      <main className="container mx-auto px-4 py-6 flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
