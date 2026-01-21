import { useEffect } from 'react';
import { Link } from 'react-router-dom';
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
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-3">
          <Link to="/home" className="hover:opacity-90 transition-opacity">
            <img 
              src={logoCupav} 
              alt="Logo CUPAV" 
              className="h-20 md:h-24 w-auto object-contain"
            />
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight text-center">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
