import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useIscrizioniConPagamenti, useUpdatePagamento, useReminderLogs, useSendReminder, PaymentStatus, IscrizioneConPagamento } from '@/hooks/usePagamenti';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, CreditCard, Send, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { format } from 'date-fns';
import { it as itLocale } from 'date-fns/locale';

const TURNI_FILTER = [
  '4° Elementare', '5° Elementare',
  '1° Media', '2° Media', '3° Media',
  'Turno famiglie',
];

function statusColor(stato: PaymentStatus) {
  switch (stato) {
    case 'pagato': return 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700';
    case 'parziale': return 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700';
    case 'da_pagare': default: return 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700';
  }
}

function statusHeaderColor(stato: PaymentStatus) {
  switch (stato) {
    case 'pagato': return 'bg-gradient-to-r from-emerald-500/15 to-green-500/10';
    case 'parziale': return 'bg-gradient-to-r from-amber-500/15 to-yellow-500/10';
    case 'da_pagare': default: return 'bg-gradient-to-r from-red-500/15 to-orange-500/10';
  }
}

function statusBadge(stato: PaymentStatus) {
  switch (stato) {
    case 'pagato': return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 rounded-full text-xs pointer-events-none"><CheckCircle2 className="h-3 w-3 mr-1" />Pagato</Badge>;
    case 'parziale': return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 rounded-full text-xs pointer-events-none"><Clock className="h-3 w-3 mr-1" />Parziale</Badge>;
    case 'da_pagare': default: return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 rounded-full text-xs pointer-events-none"><CreditCard className="h-3 w-3 mr-1" />Da pagare</Badge>;
  }
}

function statusLabel(stato: string) {
  switch (stato) {
    case 'pagato': return 'Pagato';
    case 'parziale': return 'Parziale';
    case 'da_pagare': return 'Da pagare';
    default: return stato;
  }
}

// ─── Detail Drawer ─────────────────────────────────────

function PagamentoDetailDrawer({ item, open, onOpenChange }: { item: IscrizioneConPagamento | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: logs = [], isLoading: logsLoading } = useReminderLogs(item?.id ?? null);
  const sendReminder = useSendReminder();

  if (!item) return null;

  const initials = `${(item.ragazzo_nome?.[0] || '').toUpperCase()}${(item.ragazzo_cognome?.[0] || '').toUpperCase()}`;
  const canSendReminder = item.stato_pagamento !== 'pagato';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="overflow-y-auto px-5 pb-8">
          <DrawerHeader className="px-0 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-lg shrink-0 bg-gradient-to-br from-primary to-blue-500">
                {initials}
              </div>
              <div>
                <DrawerTitle className="text-xl text-left">{item.ragazzo_nome} {item.ragazzo_cognome}</DrawerTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{item.genitore_qualita} — {item.genitore_nome} {item.genitore_cognome}</p>
              </div>
            </div>
          </DrawerHeader>

          {/* Status & amounts */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-2 flex-wrap">
              {statusBadge(item.stato_pagamento)}
              <Badge className="bg-muted text-muted-foreground border-0 rounded-full text-xs pointer-events-none">
                {item.turno}
              </Badge>
            </div>
            <div className="bg-muted/30 rounded-2xl px-4 py-3 space-y-1">
              <p className="text-sm"><span className="font-medium">Importo dovuto:</span> {item.importo_dovuto}€</p>
              {item.stato_pagamento === 'parziale' && (
                <p className="text-sm"><span className="font-medium">Già pagato:</span> {item.importo_pagato}€ — <span className="text-amber-600 dark:text-amber-400 font-medium">Restano {item.importo_dovuto - item.importo_pagato}€</span></p>
              )}
            </div>
          </div>

          {/* Reminder button */}
          <div className="mb-5">
            <Button
              className="w-full"
              variant={canSendReminder ? 'default' : 'outline'}
              disabled={!canSendReminder || sendReminder.isPending}
              onClick={() => sendReminder.mutate(item)}
            >
              {sendReminder.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {canSendReminder ? 'Invia reminder pagamento' : 'Pagamento completato'}
            </Button>
          </div>

          {/* Logs */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Log invii reminder</h4>
            {logsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nessun reminder inviato</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="bg-muted/30 rounded-xl px-3 py-2.5 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{log.inviato_da_nome}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'dd-MM-yyyy, HH:mm', { locale: itLocale })}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Stato: {statusLabel(log.stato_al_momento)}
                      {log.note_al_momento && ` — ${log.note_al_momento}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Card component ────────────────────────────────────

function PagamentoCard({ item, onClick }: { item: IscrizioneConPagamento; onClick: () => void }) {
  const updateMutation = useUpdatePagamento();
  const [localImportoPagato, setLocalImportoPagato] = useState(item.importo_pagato || 0);
  const [saved, setSaved] = useState(false);

  const handleStatusChange = (newStato: string) => {
    const stato = newStato as PaymentStatus;
    setSaved(false);
    updateMutation.mutate({
      iscrizioneId: item.id,
      stato,
      note: stato === 'parziale' ? `Già pagato: ${localImportoPagato}€ su ${item.importo_dovuto}€` : null,
      importo_pagato: stato === 'parziale' ? localImportoPagato : 0,
    });
  };

  const handleImportoDovutoChange = (val: string) => {
    const importo = parseInt(val);
    updateMutation.mutate({
      iscrizioneId: item.id,
      stato: item.stato_pagamento,
      note: item.stato_pagamento === 'parziale' ? `Già pagato: ${localImportoPagato}€ su ${importo}€` : null,
      importo_dovuto: importo,
    });
  };

  const handleSavePartial = () => {
    updateMutation.mutate({
      iscrizioneId: item.id,
      stato: 'parziale',
      note: `Già pagato: ${localImportoPagato}€ su ${item.importo_dovuto}€`,
      importo_pagato: localImportoPagato,
    }, {
      onSuccess: () => setSaved(true),
    });
  };

  const initials = `${(item.ragazzo_nome?.[0] || '').toUpperCase()}${(item.ragazzo_cognome?.[0] || '').toUpperCase()}`;

  return (
    <Card className={`border-2 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 ${statusColor(item.stato_pagamento)}`}>
      <CardContent className="p-0">
        {/* Header - clickable to open drawer */}
        <div
          className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${statusHeaderColor(item.stato_pagamento)}`}
          onClick={onClick}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md bg-gradient-to-br from-primary to-blue-500">
            {initials}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-[15px] leading-tight text-foreground whitespace-nowrap">
              {item.ragazzo_nome} {item.ragazzo_cognome}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
              {item.genitore_nome} {item.genitore_cognome}
            </p>
          </div>
          {/* Importo dovuto dropdown */}
          <div onClick={(e) => e.stopPropagation()}>
            <Select value={String(item.importo_dovuto)} onValueChange={handleImportoDovutoChange}>
              <SelectTrigger className="w-[90px] h-7 text-xs rounded-full bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="250">250€</SelectItem>
                <SelectItem value="230">230€</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-muted-foreground font-medium">{item.turno}</p>

          <RadioGroup
            value={item.stato_pagamento}
            onValueChange={handleStatusChange}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="pagato" id={`pagato-${item.id}`} />
              <Label htmlFor={`pagato-${item.id}`} className="text-sm font-medium text-emerald-700 dark:text-emerald-400 cursor-pointer">Pagato</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="parziale" id={`parziale-${item.id}`} />
              <Label htmlFor={`parziale-${item.id}`} className="text-sm font-medium text-amber-700 dark:text-amber-400 cursor-pointer">Parziale</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="da_pagare" id={`da_pagare-${item.id}`} />
              <Label htmlFor={`da_pagare-${item.id}`} className="text-sm font-medium text-red-700 dark:text-red-400 cursor-pointer">Da pagare</Label>
            </div>
          </RadioGroup>

          {item.stato_pagamento === 'parziale' && (
            <div className="space-y-2 pt-1 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Già pagato:</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={item.importo_dovuto}
                    value={localImportoPagato}
                    onChange={(e) => { setLocalImportoPagato(Number(e.target.value)); setSaved(false); }}
                    className="w-20 h-7 text-sm bg-background"
                  />
                  <span className="text-xs text-muted-foreground">€</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                a fronte di: <span className="font-semibold text-foreground">{item.importo_dovuto}€</span>
              </p>
              {saved ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center py-1">✓ Salvato</p>
              ) : (
                <Button size="sm" variant="outline" onClick={handleSavePartial} disabled={updateMutation.isPending} className="w-full text-xs">
                  {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Salva
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────

export default function GestionePagamenti() {
  const { data: items = [], isLoading } = useIscrizioniConPagamenti();
  const [search, setSearch] = useState('');
  const [filterTurno, setFilterTurno] = useState('all');
  const [filterStato, setFilterStato] = useState('all');
  const [selectedItem, setSelectedItem] = useState<IscrizioneConPagamento | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = [...items];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        `${i.ragazzo_nome} ${i.ragazzo_cognome}`.toLowerCase().includes(q) ||
        `${i.genitore_nome} ${i.genitore_cognome}`.toLowerCase().includes(q)
      );
    }
    if (filterTurno !== 'all') result = result.filter(i => i.turno === filterTurno);
    if (filterStato !== 'all') result = result.filter(i => i.stato_pagamento === filterStato);
    result.sort((a, b) => {
      const cmp = (a.ragazzo_nome || '').localeCompare(b.ragazzo_nome || '', 'it');
      return cmp !== 0 ? cmp : (a.ragazzo_cognome || '').localeCompare(b.ragazzo_cognome || '', 'it');
    });
    return result;
  }, [items, search, filterTurno, filterStato]);

  const counts = useMemo(() => {
    const c = { pagato: 0, parziale: 0, da_pagare: 0 };
    items.forEach(i => { c[i.stato_pagamento]++; });
    return c;
  }, [items]);

  const handleOpenDrawer = (item: IscrizioneConPagamento) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  return (
    <MainLayout title="Gestione Pagamenti">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="py-3 px-4 text-center">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{counts.pagato}</p>
              <p className="text-xs text-muted-foreground">Pagati</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="py-3 px-4 text-center">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{counts.parziale}</p>
              <p className="text-xs text-muted-foreground">Parziali</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="py-3 px-4 text-center">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{counts.da_pagare}</p>
              <p className="text-xs text-muted-foreground">Da pagare</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm rounded-2xl bg-muted/30">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome ragazzo o genitore..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl bg-background"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterTurno} onValueChange={setFilterTurno}>
                <SelectTrigger className="w-[180px] h-8 text-xs rounded-full">
                  <SelectValue placeholder="Turno" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Tutti i turni</SelectItem>
                  {TURNI_FILTER.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStato} onValueChange={setFilterStato}>
                <SelectTrigger className="w-[160px] h-8 text-xs rounded-full">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="pagato">Pagato</SelectItem>
                  <SelectItem value="parziale">Parziale</SelectItem>
                  <SelectItem value="da_pagare">Da pagare</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cards grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search || filterTurno !== 'all' || filterStato !== 'all' ? 'Nessun risultato trovato.' : 'Nessuna iscrizione presente.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(item => (
              <PagamentoCard key={item.id} item={item} onClick={() => handleOpenDrawer(item)} />
            ))}
          </div>
        )}
      </div>

      <PagamentoDetailDrawer
        item={selectedItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </MainLayout>
  );
}
