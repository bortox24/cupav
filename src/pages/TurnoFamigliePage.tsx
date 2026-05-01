import { MainLayout } from '@/components/layout/MainLayout';
import { useIscrizioniFamiglie, IscrizioneFamiglia, TIPO_PERIODO_LABEL } from '@/hooks/useFamiglie';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tent, Users, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { it as itLocale } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

function totalePartecipanti(i: IscrizioneFamiglia) {
  return i.num_adulti + (i.figlio_1_over10 ? 1 : 0) + (i.figlio_2_over10 ? 1 : 0) + (i.figlio_3_over10 ? 1 : 0) + i.num_4_10_anni + i.num_0_3_anni;
}

export default function TurnoFamigliePage() {
  const { data: items = [], isLoading } = useIscrizioniFamiglie();

  const totalePersone = items.reduce((sum, i) => sum + totalePartecipanti(i), 0);
  const totaleAnimali = items.reduce((sum, i) => sum + i.num_animali, 0);

  return (
    <MainLayout title="Turno Famiglie 2026">
      <div className="space-y-6">
        {/* Hero */}
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Tent className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Turno Famiglie</h2>
              <p className="text-white/90 text-sm">Sagron Mis (TN) — Agosto 2026</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-white/80">Famiglie</p>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
              <p className="text-2xl font-bold">{totalePersone}</p>
              <p className="text-xs text-white/80">Persone</p>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
              <p className="text-2xl font-bold">{totaleAnimali}</p>
              <p className="text-xs text-white/80">Animali 🐾</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Link to="/anagrafica-turno-famiglie">
            <Button variant="outline">Apri anagrafica completa <ArrowRight className="h-4 w-4 ml-2" /></Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="py-8 text-center"><Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">Ancora nessuna iscrizione al turno famiglie.</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <Card key={item.id} className="border-2 border-l-4 border-l-orange-500 rounded-2xl hover:shadow-lg transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base truncate">{item.cognome} {item.nome}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{item.residente_a}</p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-0 rounded-full text-[10px] pointer-events-none shrink-0">
                      🏕️ Famiglie
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3 w-3" />{TIPO_PERIODO_LABEL[item.tipo_periodo]}
                    </p>
                    <p className="text-muted-foreground">
                      {format(new Date(item.data_inizio), 'dd/MM', { locale: itLocale })} → {format(new Date(item.data_fine), 'dd/MM/yyyy', { locale: itLocale })}
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2 text-xs flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Partecipanti</span>
                    <span className="font-semibold text-foreground">{totalePartecipanti(item)}{item.num_animali > 0 ? ` + 🐾${item.num_animali}` : ''}</span>
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
