import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Send, Square, Check, XCircle, Clock, Users, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RagazzoCompleto } from '@/hooks/useRagazzi';

const CURRENT_YEAR = new Date().getFullYear();
const TURNI_OPTIONS = [
  '4^ Elementare', '5^ Elementare',
  '1^ Media', '2^ Media', '3^ Media',
  'Turno famiglie',
];
const SEND_INTERVAL = 30; // seconds

type SendStatus = 'pending' | 'sending' | 'sent' | 'error';

interface QueueItem {
  ragazzo: RagazzoCompleto;
  status: SendStatus;
  errorMsg?: string;
}

interface WebhookOption {
  id: string;
  webhook_url: string;
  descrizione: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ragazzi: RagazzoCompleto[];
}

export function InvioMassivoDialog({ open, onOpenChange, ragazzi }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Filters
  const [selectedTurni, setSelectedTurni] = useState<string[]>([]);
  const [filtroNumero, setFiltroNumero] = useState<'tutti' | 'con_numero' | 'senza_numero'>('tutti');

  // Webhook
  const [webhooks, setWebhooks] = useState<WebhookOption[]>([]);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>('');
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);

  // Queue
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const abortRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stats
  const sentCount = queue.filter(q => q.status === 'sent').length;
  const errorCount = queue.filter(q => q.status === 'error').length;
  const totalCount = queue.length;

  // Load webhooks
  useEffect(() => {
    if (!open) return;
    setLoadingWebhooks(true);
    supabase.from('webhook_config').select('*').then(({ data }) => {
      setWebhooks((data as any[]) || []);
      setLoadingWebhooks(false);
    });
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      abortRef.current = true;
      if (countdownRef.current) clearInterval(countdownRef.current);
      setSending(false);
      setQueue([]);
      setCurrentIndex(0);
      setCountdown(0);
      setSelectedTurni([]);
      setFiltroNumero('tutti');
      setSelectedWebhookId('');
    }
  }, [open]);

  // Filter logic
  const filteredRagazzi = ragazzi.filter(r => {
    if (r.archiviato) return false;
    // Turno filter
    if (selectedTurni.length > 0) {
      const hasTurno = r.iscrizioni.some(
        i => i.anno === CURRENT_YEAR && selectedTurni.includes(i.turno)
      );
      if (!hasTurno) return false;
    }
    // Numero filter
    if (filtroNumero === 'con_numero' && r.numero == null) return false;
    if (filtroNumero === 'senza_numero' && r.numero != null) return false;
    return true;
  });

  const toggleTurno = (turno: string) => {
    setSelectedTurni(prev =>
      prev.includes(turno) ? prev.filter(t => t !== turno) : [...prev, turno]
    );
  };

  const selectedWebhook = webhooks.find(w => w.id === selectedWebhookId);

  const buildPayload = (ragazzo: RagazzoCompleto) => ({
    ragazzo_id: ragazzo.id,
    full_name: ragazzo.full_name,
    data_nascita: ragazzo.data_nascita,
    residente_altavilla: ragazzo.residente_altavilla,
    ha_allergie: ragazzo.ha_allergie,
    allergie_dettaglio: ragazzo.allergie_dettaglio,
    patologie_dettaglio: ragazzo.patologie_dettaglio,
    genitori: ragazzo.genitori,
    iscrizioni: ragazzo.iscrizioni,
    farmaco_1_nome: ragazzo.farmaco_1_nome,
    farmaco_1_posologia: ragazzo.farmaco_1_posologia,
    farmaco_2_nome: ragazzo.farmaco_2_nome,
    farmaco_2_posologia: ragazzo.farmaco_2_posologia,
    farmaco_3_nome: ragazzo.farmaco_3_nome,
    farmaco_3_posologia: ragazzo.farmaco_3_posologia,
    numero: ragazzo.numero,
  });

  const startSending = useCallback(async () => {
    if (!selectedWebhook || !user || !profile) return;

    const items: QueueItem[] = filteredRagazzi.map(r => ({
      ragazzo: r,
      status: 'pending' as SendStatus,
    }));
    setQueue(items);
    setSending(true);
    abortRef.current = false;
    setCurrentIndex(0);

    const webhookUrl = selectedWebhook.webhook_url;
    const webhookDesc = selectedWebhook.descrizione || 'webhook';
    const tipoLog = `invio_massivo`;

    for (let i = 0; i < items.length; i++) {
      if (abortRef.current) break;
      setCurrentIndex(i);

      // Update status to sending
      setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'sending' } : q));

      let successo = false;
      let errorMsg = '';
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(items[i].ragazzo)),
        });
        successo = res.ok;
        if (!successo) errorMsg = `HTTP ${res.status}`;
      } catch (err: any) {
        errorMsg = err?.message || 'Errore di rete';
      }

      // Update status
      setQueue(prev => prev.map((q, idx) =>
        idx === i ? { ...q, status: successo ? 'sent' : 'error', errorMsg } : q
      ));

      // Log
      await supabase.from('anagrafica_invio_logs' as any).insert({
        ragazzo_id: items[i].ragazzo.id,
        inviato_da: user.id,
        inviato_da_nome: profile.full_name || profile.email,
        successo,
        tipo: tipoLog,
        dettaglio: `Webhook: ${webhookDesc}${errorMsg ? ` — ${errorMsg}` : ''}`,
      });

      // Wait 30 seconds before next (unless last or aborted)
      if (i < items.length - 1 && !abortRef.current) {
        setCountdown(SEND_INTERVAL);
        await new Promise<void>(resolve => {
          let remaining = SEND_INTERVAL;
          countdownRef.current = setInterval(() => {
            remaining--;
            setCountdown(remaining);
            if (remaining <= 0 || abortRef.current) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              resolve();
            }
          }, 1000);
        });
      }
    }

    setSending(false);
    setCountdown(0);
    queryClient.invalidateQueries({ queryKey: ['ragazzi'] });

    if (!abortRef.current) {
      const sent = items.filter((_, i2) => {
        // We need the final queue state — use a trick
        return true; // will show toast separately
      });
      toast.success('Invio massivo completato!');
    } else {
      toast.info('Invio massivo interrotto');
    }
  }, [filteredRagazzi, selectedWebhook, user, profile, queryClient]);

  const stopSending = () => {
    abortRef.current = true;
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const canStart = selectedWebhookId && filteredRagazzi.length > 0 && !sending;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (sending) {
        stopSending();
      }
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Invio Massivo Comunicazioni
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* FILTRI */}
          {!sending && queue.length === 0 && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Filter className="h-4 w-4" /> Filtri
                </h3>

                {/* Turni multi-select */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Turni (seleziona uno o più)</p>
                  <div className="flex flex-wrap gap-2">
                    {TURNI_OPTIONS.map(turno => (
                      <label
                        key={turno}
                        className="flex items-center gap-1.5 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedTurni.includes(turno)}
                          onCheckedChange={() => toggleTurno(turno)}
                        />
                        {turno}
                      </label>
                    ))}
                  </div>
                  {selectedTurni.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nessun filtro turno = tutti i turni</p>
                  )}
                </div>

                {/* Filtro numero */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Numero assegnato</p>
                  <Select value={filtroNumero} onValueChange={(v: any) => setFiltroNumero(v)}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tutti">Tutti</SelectItem>
                      <SelectItem value="con_numero">Solo con numero</SelectItem>
                      <SelectItem value="senza_numero">Solo senza numero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Counter */}
                <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary">
                    <span className="font-bold text-lg mr-1">{filteredRagazzi.length}</span>
                    ragazzi corrispondono ai filtri
                  </span>
                </div>
              </div>

              <Separator />

              {/* WEBHOOK SELECTION */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Webhook da utilizzare</h3>
                {loadingWebhooks ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : webhooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun webhook configurato</p>
                ) : (
                  <Select value={selectedWebhookId} onValueChange={setSelectedWebhookId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona un webhook..." />
                    </SelectTrigger>
                    <SelectContent>
                      {webhooks.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.descrizione || w.webhook_url}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedWebhook && (
                  <p className="text-xs text-muted-foreground truncate">{selectedWebhook.webhook_url}</p>
                )}
              </div>

              <Separator />

              {/* PREVIEW */}
              {filteredRagazzi.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Anteprima ({filteredRagazzi.length} ragazzi)</h3>
                  <ScrollArea className="h-[200px] rounded-md border">
                    <div className="p-2 space-y-1">
                      {filteredRagazzi.map(r => {
                        const turno = r.iscrizioni.find(i => i.anno === CURRENT_YEAR)?.turno;
                        return (
                          <div key={r.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                            <span className="font-medium">{r.full_name}</span>
                            <div className="flex items-center gap-2">
                              {r.numero != null && (
                                <Badge variant="outline" className="text-xs">#{r.numero}</Badge>
                              )}
                              {turno && (
                                <Badge variant="secondary" className="text-xs">{turno}</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* START BUTTON */}
              <Button
                onClick={startSending}
                disabled={!canStart}
                className="w-full gap-2"
                size="lg"
              >
                <Send className="h-4 w-4" />
                Avvia invio ({filteredRagazzi.length} ragazzi)
              </Button>
            </>
          )}

          {/* SENDING STATE */}
          {(sending || queue.length > 0) && (
            <div className="space-y-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    Inviato {sentCount + errorCount} / {totalCount}
                  </span>
                  <span className="text-muted-foreground">
                    {sentCount} riusciti, {errorCount} errori
                  </span>
                </div>
                <Progress value={totalCount > 0 ? ((sentCount + errorCount) / totalCount) * 100 : 0} />
              </div>

              {/* Countdown */}
              {sending && countdown > 0 && (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 py-3">
                  <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
                  <span className="text-sm text-muted-foreground">
                    Prossimo invio tra <span className="font-bold text-foreground">{countdown}s</span>
                  </span>
                </div>
              )}

              {/* Queue list */}
              <ScrollArea className="h-[300px] rounded-md border">
                <div className="p-2 space-y-1">
                  {queue.map((item, idx) => (
                    <div
                      key={item.ragazzo.id}
                      className={`flex items-center justify-between text-sm py-1.5 px-2 rounded ${
                        item.status === 'sending' ? 'bg-primary/10' : ''
                      }`}
                    >
                      <span className={item.status === 'sending' ? 'font-semibold' : ''}>
                        {item.ragazzo.full_name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {item.status === 'pending' && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="h-3 w-3" /> In attesa
                          </Badge>
                        )}
                        {item.status === 'sending' && (
                          <Badge className="text-xs gap-1 bg-primary">
                            <Loader2 className="h-3 w-3 animate-spin" /> In invio
                          </Badge>
                        )}
                        {item.status === 'sent' && (
                          <Badge className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-600">
                            <Check className="h-3 w-3" /> Inviato
                          </Badge>
                        )}
                        {item.status === 'error' && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <XCircle className="h-3 w-3" /> Errore
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Stop / Close buttons */}
              <div className="flex gap-2">
                {sending ? (
                  <Button variant="destructive" onClick={stopSending} className="w-full gap-2">
                    <Square className="h-4 w-4" /> Interrompi
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                    Chiudi
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
