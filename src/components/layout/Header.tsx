import { useEffect } from 'react';
import logoCupav from '@/assets/logo-cupav.png';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  useEffect(() => {
    document.title = `${title} | CUPAV`;
  }, [title]);

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <img 
            src={logoCupav} 
            alt="Logo CUPAV" 
            className="h-16 w-auto object-contain"
          />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
