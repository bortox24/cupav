import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { it as itLocale } from 'date-fns/locale';
import { CalendarDays, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GiornoCalendario {
  key: string;
  date: Date;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  giorni: GiornoCalendario[];
  presenzePerGiorno: Record<string, number>;
  colore: 'orange' | 'amber';
}

const colorMap = {
  orange: {
    headerGradient: 'from-orange-500 via-amber-500 to-yellow-500',
    cardBorder: 'border-orange-200 dark:border-orange-900/50',
    cardBg: 'bg-orange-50/60 dark:bg-orange-950/20',
    accent: 'text-orange-700 dark:text-orange-300',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
  amber: {
    headerGradient: 'from-amber-500 via-orange-500 to-yellow-500',
    cardBorder: 'border-amber-200 dark:border-amber-900/50',
    cardBg: 'bg-amber-50/60 dark:bg-amber-950/20',
    accent: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
};

export function CalendarioPresenzeDialog({ open, onOpenChange, title, giorni, presenzePerGiorno, colore }: Props) {
  const c = colorMap[colore];
  const giornoMax = giorni.reduce(
    (max, g) => ((presenzePerGiorno[g.key] ?? 0) > (presenzePerGiorno[max?.key ?? ''] ?? -1) ? g : max),
    giorni[0],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto p-0">
        <div className={cn('bg-gradient-to-r text-white p-4 sm:p-5 rounded-t-lg', c.headerGradient)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <CalendarDays className="h-5 w-5" />
              <span className="text-base sm:text-lg">{title}</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/85 text-xs sm:text-sm mt-1">
            Persone presenti in campeggio giorno per giorno
          </p>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {giorni.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nessun giorno disponibile
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {giorni.map(g => {
                  const n = presenzePerGiorno[g.key] ?? 0;
                  const isMax = n > 0 && g.key === giornoMax?.key;
                  return (
                    <div
                      key={g.key}
                      className={cn(
                        'rounded-xl border-2 p-3 flex items-center justify-between gap-2 transition-all',
                        c.cardBorder,
                        c.cardBg,
                        isMax && 'ring-2 ring-offset-1 ring-offset-background',
                        isMax && (colore === 'orange' ? 'ring-orange-400' : 'ring-amber-400'),
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                          {format(g.date, 'EEEE', { locale: itLocale })}
                        </p>
                        <p className="text-sm sm:text-base font-bold text-foreground capitalize">
                          {format(g.date, 'd MMM yyyy', { locale: itLocale })}
                        </p>
                      </div>
                      <div className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold', c.badge)}>
                        <Users className="h-4 w-4" />
                        <span className="text-lg leading-none">{n}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
