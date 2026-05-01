import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useIscrizioniFamiglie, IscrizioneFamiglia, TIPO_PERIODO_LABEL } from '@/hooks/useFamiglie';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Loader2, Search, Users, Phone, Mail, MapPin, Calendar, Download, Tent } from 'lucide-react';
import { format } from 'date-fns';
import { it as itLocale } from 'date-fns/locale';

function formatDate(d: string) {
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: itLocale }); } catch { return d; }
}

function totalePartecipanti(i: IscrizioneFamiglia) {
  return i.num_adulti + (i.figlio_1_over10 ? 1 : 0) + (i.figlio_2_over10 ? 1 : 0) + (i.figlio_3_over10 ? 1 : 0) + i.num_4_10_anni + i.num_0_3_anni;
}

function FamigliaCard({ item, onClick }: { item: IscrizioneFamiglia; onClick: () => void }) {
  const initials = `${(item.nome[0] || '').toUpperCase()}${(item.cognome[0] || '').toUpperCase()}`;
  const tot = totalePartecipanti(item);
  return (
    <Card className="border-2 border-l-4 border-l-orange-500 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 bg-gradient-to-br from-orange-500 to-amber-600 shadow-md">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base truncate text-foreground">{item.cognome} {item.nome}</h4>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-3 w-3" />{item.residente_a}</p>
          </div>
          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-0 rounded-full text-[10px] pointer-events-none">
            🏕️ Famiglie
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="text-muted-foreground">Periodo</p>
            <p className="font-semibold text-foreground truncate">{TIPO_PERIODO_LABEL[item.tipo_periodo]}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2">
            <p className="text-muted-foreground">Partecipanti</p>
            <p className="font-semibold text-foreground flex items-center gap-1"><Users className="h-3 w-3" />{tot} {item.num_animali > 0 ? `+ 🐾${item.num_animali}` : ''}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FamigliaDetailDrawer({ item, open, onOpenChange }: { item: IscrizioneFamiglia | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!item) return null;
  const tot = totalePartecipanti(item);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="overflow-y-auto px-5 pb-8">
          <DrawerHeader className="px-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                {(item.nome[0] || '').toUpperCase()}{(item.cognome[0] || '').toUpperCase()}
              </div>
              <div>
                <DrawerTitle className="text-xl text-left">{item.cognome} {item.nome}</DrawerTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Iscrizione del {formatDate(item.created_at)}</p>
              </div>
            </div>
          </DrawerHeader>
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-xl p-3 space-y-2 text-sm">
              <h4 className="font-semibold text-foreground flex items-center gap-2"><Mail className="h-4 w-4" />Contatti</h4>
              <p>{item.email}</p>
              <div className="space-y-1">
                {item.recapiti_telefonici.map((r, i) => (
                  <p key={i} className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3" /><span className="font-medium text-foreground">{r.nome}:</span> {r.telefono}</p>
                ))}
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
              <h4 className="font-semibold text-foreground flex items-center gap-2"><MapPin className="h-4 w-4" />Residenza</h4>
              <p>{item.residente_a} — {item.via}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
              <h4 className="font-semibold text-foreground flex items-center gap-2"><Calendar className="h-4 w-4" />Periodo richiesto</h4>
              <p><strong>{TIPO_PERIODO_LABEL[item.tipo_periodo]}</strong></p>
              <p className="text-muted-foreground">Dal {formatDate(item.data_inizio)} al {formatDate(item.data_fine)}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
              <h4 className="font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4" />Partecipanti ({tot})</h4>
              <p>Adulti: <strong>{item.num_adulti}</strong></p>
              <p>Figli &gt; 10 anni: <strong>{[item.figlio_1_over10, item.figlio_2_over10, item.figlio_3_over10].filter(Boolean).length}</strong></p>
              <p>4–10 anni: <strong>{item.num_4_10_anni}</strong></p>
              <p>0–3 anni: <strong>{item.num_0_3_anni}</strong></p>
              <p>Animali: <strong>{item.num_animali}</strong></p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 space-y-1 text-sm">
              <h4 className="font-semibold text-foreground">Acconto e firma</h4>
              <p>Acconto versato: <strong>€ {item.acconto_versato}</strong></p>
              <p>Regolamento accettato: <strong>{item.regolamento_accettato ? 'Sì' : 'No'}</strong></p>
              <p>Firma: <strong>{item.firma_nome_cognome}</strong> — {formatDate(item.firma_data)}</p>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function exportCSV(items: IscrizioneFamiglia[]) {
  const header = ['Cognome', 'Nome', 'Email', 'Residenza', 'Via', 'Recapiti', 'Periodo', 'Dal', 'Al', 'Adulti', 'Figli>10', '4-10', '0-3', 'Animali', 'Acconto', 'Data firma'];
  const rows = items.map(i => [
    i.cognome, i.nome, i.email, i.residente_a, i.via,
    i.recapiti_telefonici.map(r => `${r.nome}: ${r.telefono}`).join(' | '),
    TIPO_PERIODO_LABEL[i.tipo_periodo],
    formatDate(i.data_inizio), formatDate(i.data_fine),
    i.num_adulti,
    [i.figlio_1_over10, i.figlio_2_over10, i.figlio_3_over10].filter(Boolean).length,
    i.num_4_10_anni, i.num_0_3_anni, i.num_animali,
    i.acconto_versato, formatDate(i.firma_data),
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `anagrafica_turno_famiglie_${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function AnagraficaTurnoFamiglie() {
  const { data: items = [], isLoading } = useIscrizioniFamiglie();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<IscrizioneFamiglia | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      `${i.cognome} ${i.nome}`.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      i.residente_a.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <MainLayout title="Anagrafica Turno Famiglie">
      <div className="space-y-6">
        <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-950/30 dark:to-amber-950/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md">
              <Tent className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-foreground">Turno Famiglie 2026</h2>
              <p className="text-sm text-muted-foreground">{items.length} iscrizion{items.length === 1 ? 'e' : 'i'} ricevut{items.length === 1 ? 'a' : 'e'}</p>
            </div>
            <Button variant="outline" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-2" />Esporta CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-muted/30">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cerca per nome, cognome, email o residenza..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl bg-background" />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center"><Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">Nessuna iscrizione presente.</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(item => (
              <FamigliaCard key={item.id} item={item} onClick={() => { setSelected(item); setDrawerOpen(true); }} />
            ))}
          </div>
        )}
      </div>

      <FamigliaDetailDrawer item={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </MainLayout>
  );
}
