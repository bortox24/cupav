import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Euro, Save } from 'lucide-react';
import { useTariffeFamiglie, useUpdateTariffaFamiglia } from '@/hooks/useTariffeFamiglie';
import { useToast } from '@/hooks/use-toast';
import type { TariffaFamiglia } from '@/lib/tariffeFamiglie';

const COL_DEFS: { key: keyof TariffaFamiglia; label: string }[] = [
  { key: 'adulto', label: 'Adulto' },
  { key: 'figlio_1_over10', label: '1° figlio >10' },
  { key: 'figlio_2_over10', label: '2° figlio >10' },
  { key: 'figlio_3_over10', label: '3° figlio >10' },
  { key: 'eta_4_10', label: '4–10 anni' },
  { key: 'eta_0_3', label: '0–3 anni' },
];

export function TariffeFamiglieCard() {
  const { toast } = useToast();
  const { data: tariffe = [], isLoading } = useTariffeFamiglie();
  const updateMut = useUpdateTariffaFamiglia();
  const [draft, setDraft] = useState<Record<number, TariffaFamiglia>>({});

  useEffect(() => {
    const map: Record<number, TariffaFamiglia> = {};
    tariffe.forEach(t => { map[t.categoria] = { ...t }; });
    setDraft(map);
  }, [tariffe]);

  const setField = (cat: number, key: keyof TariffaFamiglia, val: string) => {
    setDraft(prev => ({
      ...prev,
      [cat]: { ...prev[cat], [key]: parseFloat(val) || 0 } as TariffaFamiglia,
    }));
  };

  const isDirty = (cat: number) => {
    const orig = tariffe.find(t => t.categoria === cat);
    const cur = draft[cat];
    if (!orig || !cur) return false;
    return COL_DEFS.some(c => Number(orig[c.key]) !== Number(cur[c.key]));
  };

  const save = (cat: number) => {
    const cur = draft[cat];
    if (!cur) return;
    const updates: Partial<TariffaFamiglia> = {};
    COL_DEFS.forEach(c => { (updates as any)[c.key] = Number(cur[c.key]) || 0; });
    updateMut.mutate({ categoria: cat, updates }, {
      onSuccess: () => toast({ title: `Tariffa categoria ${cat} aggiornata` }),
      onError: (e: any) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Tariffe Turno Famiglie
        </CardTitle>
        <CardDescription>
          Prezzi giornalieri a persona per categoria. Vengono usati per calcolare automaticamente
          il totale dovuto delle iscrizioni famiglie in Anagrafica e Gestione Pagamenti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5">
            {tariffe.map(t => {
              const cur = draft[t.categoria] ?? t;
              const dirty = isDirty(t.categoria);
              return (
                <div key={t.categoria} className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-foreground">Categoria {t.categoria}</p>
                      <p className="text-xs text-muted-foreground">{t.descrizione}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => save(t.categoria)}
                      disabled={!dirty || updateMut.isPending}
                    >
                      {updateMut.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                      Salva
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {COL_DEFS.map(c => (
                      <div key={c.key} className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">{c.label}</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.5"
                            value={Number(cur[c.key] ?? 0)}
                            onChange={(e) => setField(t.categoria, c.key, e.target.value)}
                            className="pl-6 h-9"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
