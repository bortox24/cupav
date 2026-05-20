import { useState } from 'react';
import { useInvioMassivoJob } from '@/hooks/useInvioMassivoJob';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, X, Eye, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { InvioMassivoMonitorDialog } from '@/components/InvioMassivoMonitorDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

function formatEta(seconds: number) {
  if (seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function InvioMassivoBanner() {
  const { activeJob, progress, lastFinishedJob, abort, dismissFinished } = useInvioMassivoJob();
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [aborting, setAborting] = useState(false);

  const handleAbort = async () => {
    if (!activeJob) return;
    setAborting(true);
    try {
      await abort(activeJob.id);
      toast.info('Richiesta di interruzione inviata');
    } catch (e: any) {
      toast.error('Errore: ' + (e?.message || 'sconosciuto'));
    } finally {
      setAborting(false);
    }
  };

  // Finished banner (summary, auto-dismiss)
  if (!activeJob && lastFinishedJob) {
    const j = lastFinishedJob;
    const isOk = j.stato === 'completed';
    const isAborted = j.stato === 'aborted';
    return (
      <div className={`sticky top-0 z-40 w-full border-b ${
        isOk ? 'bg-emerald-600/95 text-white' : isAborted ? 'bg-amber-600/95 text-white' : 'bg-destructive/95 text-destructive-foreground'
      }`}>
        <div className="container mx-auto px-4 py-2 flex items-center gap-3 text-sm">
          {isOk ? <CheckCircle2 className="h-4 w-4 shrink-0" /> :
            isAborted ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          <span className="font-semibold truncate flex-1">
            {isOk && `Invio completato — ${j.inviati} inviati, ${j.falliti} errori`}
            {isAborted && `Invio interrotto — ${j.inviati}/${j.totale} inviati`}
            {j.stato === 'failed' && `Invio fallito — ${j.error_message || 'errore'}`}
            {j.dry_run && <Badge variant="outline" className="ml-2 border-white/40 text-white">DRY RUN</Badge>}
          </span>
          <Button size="sm" variant="ghost" onClick={dismissFinished} className="text-white hover:bg-white/20 h-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (!activeJob || !progress) return null;

  return (
    <>
      <div className="sticky top-0 z-40 w-full border-b border-primary/30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative">
                <Send className="h-4 w-4 text-primary" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="text-sm font-semibold truncate max-w-[40ch]">{activeJob.titolo}</span>
              {activeJob.dry_run && (
                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 dark:text-amber-400">DRY RUN</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-3 ml-auto">
              <span><strong className="text-foreground">{progress.done}</strong>/{progress.total}</span>
              {progress.error > 0 && <span className="text-destructive">• {progress.error} errori</span>}
              <span>• ETA {formatEta(progress.etaSeconds)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setMonitorOpen(true)}>
                <Eye className="h-3.5 w-3.5" /> Dettagli
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive" disabled={aborting || activeJob.abort_requested}>
                    {activeJob.abort_requested ? 'Interruzione…' : 'Interrompi'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Interrompere l'invio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Le {progress.done} comunicazioni già inviate restano inviate. Le rimanenti ({progress.total - progress.done}) NON verranno inviate.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAbort}>Interrompi</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <Progress value={progress.percent} className="h-1.5 mt-1.5" />
        </div>
      </div>
      <InvioMassivoMonitorDialog open={monitorOpen} onOpenChange={setMonitorOpen} jobId={activeJob.id} />
    </>
  );
}
