import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useIscrizioniMontaggio, IscrizioneMontaggio } from '@/hooks/useIscrizioniMontaggio';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Hammer, Users, MapPin, ArrowRight, Moon, CalendarDays, FileDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GIORNI_MONTAGGIO, formatEuro } from '@/lib/tariffeMontaggio';
import { CalendarioPresenzeDialog, GiornoCalendario } from '@/components/CalendarioPresenzeDialog';
import { exportMontaggioPdf } from '@/lib/exportMontaggioPdf';
import { InvioMassivoGenericDialog, GenericRecipient } from '@/components/InvioMassivoGenericDialog';
import { Megaphone } from 'lucide-react';
import { toast } from 'sonner';

function totalePartecipanti(i: IscrizioneMontaggio) {
  return i.num_adulti + (i.num_figli_over10 ?? 0) + i.num_4_10_anni + i.num_0_3_anni;
}

const GIORNI_DATE_MAP: Record<string, Date> = {
  sab_30_05: new Date(2026, 4, 30),
  dom_31_05: new Date(2026, 4, 31),
  lun_01_06: new Date(2026, 5, 1),
  mar_02_06: new Date(2026, 5, 2),
};

export default function TurnoMontaggioPage() {
  const { data: allItems = [], isLoading } = useIscrizioniMontaggio();
  const items = allItems.filter(i => !i.archiviato);
  const [calendarioOpen, setCalendarioOpen] = useState(false);
  const [invioOpen, setInvioOpen] = useState(false);

  const invioRecipients: GenericRecipient[] = items
    .filter(i => i.email)
    .map(i => ({
      id: i.id,
      full_name: `${i.cognome} ${i.nome}`.trim(),
      badges: (i.giorni_selezionati ?? []).map(g => ({
        label: GIORNI_MONTAGGIO.find(x => x.value === g)?.short ?? g,
        variant: 'secondary' as const,
      })),
      tags: { giorni: i.giorni_selezionati ?? [] },
    }));

  const totalePersone = items.reduce((s, i) => s + totalePartecipanti(i), 0);
  const totaleImporto = items.reduce((s, i) => s + (i.importo_totale_calcolato ?? 0), 0);

  const { giorniCalendario, presenzePerGiorno } = useMemo(() => {
    const days: GiornoCalendario[] = GIORNI_MONTAGGIO.map(g => ({ key: g.value, date: GIORNI_DATE_MAP[g.value] }));
    const presenze: Record<string, number> = {};
    for (const g of GIORNI_MONTAGGIO) presenze[g.value] = 0;
    for (const it of items) {
      const tot = totalePartecipanti(it);
      for (const g of (it.giorni_selezionati ?? [])) {
        if (presenze[g] !== undefined) presenze[g] += tot;
      }
    }
    return { giorniCalendario: days, presenzePerGiorno: presenze };
  }, [items]);

  return (
    <MainLayout title="Montaggio Campeggio">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
              <Hammer className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold leading-tight">Montaggio Campeggio</h2>
              <p className="text-white/85 text-xs sm:text-sm mt-1">Iscrizioni 30 maggio – 2 giugno 2026</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-5">
            <div className="bg-white/15 rounded-xl px-2 sm:px-3 py-2 text-center">
              <p className="text-xl sm:text-2xl font-bold">{items.length}</p>
              <p className="text-[10px] sm:text-xs text-white/80">Iscrizioni</p>
            </div>
            <div className="bg-white/15 rounded-xl px-2 sm:px-3 py-2 text-center">
              <p className="text-xl sm:text-2xl font-bold">{totalePersone}</p>
              <p className="text-[10px] sm:text-xs text-white/80">Persone</p>
            </div>
            <div className="bg-white/15 rounded-xl px-2 sm:px-3 py-2 text-center">
              <p className="text-xl sm:text-2xl font-bold">{formatEuro(totaleImporto)}</p>
              <p className="text-[10px] sm:text-xs text-white/80">Totale da versare</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              if (items.length === 0) { toast.info('Nessuna iscrizione da esportare'); return; }
              try { exportMontaggioPdf(items); toast.success('PDF generato'); }
              catch (e: any) { toast.error('Errore generazione PDF', { description: e?.message }); }
            }}
          >
            <FileDown className="h-4 w-4 mr-2" />Esporta PDF
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCalendarioOpen(true)}>
            <CalendarDays className="h-4 w-4 mr-2" />Calendario
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              if (invioRecipients.length === 0) { toast.info('Nessun iscritto con email'); return; }
              setInvioOpen(true);
            }}
          >
            <Megaphone className="h-4 w-4 mr-2" />Invio Massivo
          </Button>
          <Link to="/anagrafica-montaggio-campeggio" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">Apri anagrafica completa <ArrowRight className="h-4 w-4 ml-2" /></Button>
          </Link>
        </div>

        <CalendarioPresenzeDialog
          open={calendarioOpen}
          onOpenChange={setCalendarioOpen}
          title="Calendario Montaggio Campeggio"
          giorni={giorniCalendario}
          presenzePerGiorno={presenzePerGiorno}
          colore="amber"
        />

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Ancora nessuna iscrizione al montaggio campeggio.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <Card key={item.id} className="border-2 border-l-4 border-l-amber-500 rounded-2xl hover:shadow-lg transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base truncate">{item.cognome} {item.nome}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{item.residente_a}</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 rounded-full text-[10px] pointer-events-none shrink-0">
                      🔨 Montaggio
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(item.giorni_selezionati ?? []).map(g => (
                      <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                        {GIORNI_MONTAGGIO.find(x => x.value === g)?.short ?? g}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/40 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Pers.</span>
                      <span className="font-semibold">{totalePartecipanti(item)}</span>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><Moon className="h-3 w-3" />Notti</span>
                      <span className="font-semibold">{item.num_notti}</span>
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 text-right">
                    {formatEuro(item.importo_totale_calcolato ?? 0)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
