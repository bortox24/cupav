import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Check, XCircle, Clock, Send, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { InvioMassivoJob, InvioMassivoJobItem } from '@/hooks/useInvioMassivoJob';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: string;
}

export function InvioMassivoMonitorDialog({ open, onOpenChange, jobId }: Props) {
  const [job, setJob] = useState<InvioMassivoJob | null>(null);
  const [items, setItems] = useState<InvioMassivoJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aborting, setAborting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase.from('invio_massivo_jobs' as any).select('*').eq('id', jobId).maybeSingle(),
      supabase.from('invio_massivo_job_items' as any).select('*').eq('job_id', jobId).order('position'),
    ]).then(([j, i]) => {
      if (cancelled) return;
      setJob((j.data as any) || null);
      setItems(((i.data as any) || []) as InvioMassivoJobItem[]);
      setLoading(false);
    });

    const ch1 = supabase.channel(`mon-job-${jobId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'invio_massivo_jobs', filter: `id=eq.${jobId}` },
        (p) => setJob(p.new as InvioMassivoJob))
      .subscribe();
    const ch2 = supabase.channel(`mon-items-${jobId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invio_massivo_job_items', filter: `job_id=eq.${jobId}` },
        (p) => {
          if (p.eventType === 'UPDATE') {
            setItems((prev) => prev.map((it) => it.id === (p.new as any).id ? (p.new as InvioMassivoJobItem) : it));
          } else if (p.eventType === 'INSERT') {
            setItems((prev) => [...prev, p.new as InvioMassivoJobItem].sort((a, b) => a.position - b.position));
          }
        })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [open, jobId]);

  const handleAbort = async () => {
    setAborting(true);
    try {
      const { error } = await supabase.functions.invoke('invio-massivo-runner', { body: { action: 'abort', job_id: jobId } });
      if (error) throw error;
      toast.info('Richiesta di interruzione inviata');
    } catch (e: any) {
      toast.error('Errore: ' + (e?.message || 'sconosciuto'));
    } finally {
      setAborting(false);
    }
  };

  const isActive = job?.stato === 'queued' || job?.stato === 'running';
  const percent = job && job.totale > 0 ? Math.round(((job.inviati + job.falliti) / job.totale) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Monitor invio massivo
            {job?.dry_run && <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">DRY RUN</Badge>}
          </DialogTitle>
          <DialogDescription>
            Stato in tempo reale dell'invio in corso. Puoi chiudere questa finestra: il processo continua sul server.
          </DialogDescription>
        </DialogHeader>

        {loading || !job ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-semibold truncate">{job.titolo}</div>
                <StatusBadge stato={job.stato} />
              </div>
              <Progress value={percent} className="h-2" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <Stat label="Totale" value={job.totale} />
                <Stat label="Inviati" value={job.inviati} className="text-emerald-600 dark:text-emerald-400" />
                <Stat label="Errori" value={job.falliti} className="text-destructive" />
                <Stat label="Restanti" value={Math.max(0, job.totale - job.inviati - job.falliti)} />
              </div>
              {job.error_message && (
                <div className="text-xs text-destructive flex items-start gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />{job.error_message}
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="divide-y">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="text-muted-foreground text-xs w-8 text-right">{it.position + 1}.</span>
                    <ItemStatusIcon stato={it.stato} />
                    <span className="flex-1 truncate">{it.ragazzo_full_name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[20ch]">{it.genitore_nome}</span>
                    {it.error_message && it.stato === 'error' && (
                      <span className="text-xs text-destructive truncate max-w-[20ch]">{it.error_message}</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
              {isActive && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={aborting || job.abort_requested}>
                      {job.abort_requested ? 'Interruzione in corso…' : 'Interrompi invio'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Interrompere l'invio?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le comunicazioni già inviate restano inviate. Le rimanenti NON verranno inviate.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction onClick={handleAbort}>Interrompi</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, className }: { label: string; value: number | string; className?: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${className || ''}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ stato }: { stato: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    queued: { label: 'In coda', cls: 'bg-muted text-muted-foreground' },
    running: { label: 'In corso', cls: 'bg-primary text-primary-foreground' },
    completed: { label: 'Completato', cls: 'bg-emerald-600 text-white' },
    aborted: { label: 'Interrotto', cls: 'bg-amber-600 text-white' },
    failed: { label: 'Fallito', cls: 'bg-destructive text-destructive-foreground' },
  };
  const v = map[stato] || map.queued;
  return <Badge className={v.cls}>{v.label}</Badge>;
}

function ItemStatusIcon({ stato }: { stato: string }) {
  if (stato === 'sent') return <Check className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (stato === 'error') return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
  if (stato === 'sending') return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
  return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
}
