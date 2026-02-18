import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useIscrizioniConPagamenti, useUpdatePagamento, PaymentStatus, IscrizioneConPagamento } from '@/hooks/usePagamenti';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Filter, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const TURNI_FILTER = [
  '4^ Elementare', '5^ Elementare',
  '1^ Media', '2^ Media', '3^ Media',
  'Turno famiglie',
];

function statusColor(stato: PaymentStatus) {
  switch (stato) {
    case 'pagato':
      return 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700';
    case 'parziale':
      return 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700';
    case 'da_pagare':
    default:
      return 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700';
  }
}

function statusHeaderColor(stato: PaymentStatus) {
  switch (stato) {
    case 'pagato':
      return 'bg-gradient-to-r from-emerald-500/15 to-green-500/10';
    case 'parziale':
      return 'bg-gradient-to-r from-amber-500/15 to-yellow-500/10';
    case 'da_pagare':
    default:
      return 'bg-gradient-to-r from-red-500/15 to-orange-500/10';
  }
}

function PagamentoCard({ item }: { item: IscrizioneConPagamento }) {
  const updateMutation = useUpdatePagamento();
  const [localNote, setLocalNote] = useState(item.note_pagamento || '');

  const handleStatusChange = (newStato: string) => {
    const stato = newStato as PaymentStatus;
    updateMutation.mutate({
      iscrizioneId: item.id,
      stato,
      note: stato === 'parziale' ? localNote : null,
    });
  };

  const handleNoteSave = () => {
    updateMutation.mutate({
      iscrizioneId: item.id,
      stato: 'parziale',
      note: localNote,
    });
  };

  const initials = `${(item.ragazzo_nome?.[0] || '').toUpperCase()}${(item.ragazzo_cognome?.[0] || '').toUpperCase()}`;

  return (
    <Card className={`border-2 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 ${statusColor(item.stato_pagamento)}`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className={`px-4 py-3 flex items-center gap-3 ${statusHeaderColor(item.stato_pagamento)}`}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md bg-gradient-to-br from-primary to-blue-500">
            {initials}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-[15px] leading-tight truncate text-foreground">
              {item.ragazzo_nome} {item.ragazzo_cognome}
            </h4>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {item.genitore_nome} {item.genitore_cognome}
            </p>
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
            <div className="space-y-2 pt-1">
              <Textarea
                placeholder="Note (es. ha pagato €50 su €100)..."
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
                className="text-sm min-h-[60px] bg-background"
              />
              <Button size="sm" variant="outline" onClick={handleNoteSave} disabled={updateMutation.isPending} className="w-full text-xs">
                Salva note
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function GestionePagamenti() {
  const { data: items = [], isLoading } = useIscrizioniConPagamenti();
  const [search, setSearch] = useState('');
  const [filterTurno, setFilterTurno] = useState('all');
  const [filterStato, setFilterStato] = useState('all');

  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        `${i.ragazzo_nome} ${i.ragazzo_cognome}`.toLowerCase().includes(q) ||
        `${i.genitore_nome} ${i.genitore_cognome}`.toLowerCase().includes(q)
      );
    }
    if (filterTurno !== 'all') {
      result = result.filter(i => i.turno === filterTurno);
    }
    if (filterStato !== 'all') {
      result = result.filter(i => i.stato_pagamento === filterStato);
    }
    return result;
  }, [items, search, filterTurno, filterStato]);

  const counts = useMemo(() => {
    const c = { pagato: 0, parziale: 0, da_pagare: 0 };
    items.forEach(i => { c[i.stato_pagamento]++; });
    return c;
  }, [items]);

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
                <SelectContent>
                  <SelectItem value="all">Tutti i turni</SelectItem>
                  {TURNI_FILTER.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStato} onValueChange={setFilterStato}>
                <SelectTrigger className="w-[160px] h-8 text-xs rounded-full">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
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
              <PagamentoCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
