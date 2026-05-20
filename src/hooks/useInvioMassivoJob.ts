import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface InvioMassivoJob {
  id: string;
  created_by: string;
  created_by_nome: string;
  titolo: string;
  testo: string;
  cta_label: string | null;
  cta_url: string | null;
  webhook_id: string | null;
  webhook_url: string;
  webhook_descrizione: string | null;
  filtri: any;
  dry_run: boolean;
  send_interval_seconds: number;
  stato: 'queued' | 'running' | 'completed' | 'aborted' | 'failed';
  totale: number;
  inviati: number;
  falliti: number;
  current_index: number;
  abort_requested: boolean;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvioMassivoJobItem {
  id: string;
  job_id: string;
  position: number;
  ragazzo_id: string | null;
  ragazzo_full_name: string;
  genitore_nome: string;
  payload: any;
  stato: 'pending' | 'sending' | 'sent' | 'error' | 'skipped';
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

const ACTIVE_STATES = ['queued', 'running'];

export function useInvioMassivoJob(opts?: { withItems?: boolean }) {
  const { user } = useAuth();
  const withItems = !!opts?.withItems;
  const [activeJob, setActiveJob] = useState<InvioMassivoJob | null>(null);
  const [lastFinishedJob, setLastFinishedJob] = useState<InvioMassivoJob | null>(null);
  const [items, setItems] = useState<InvioMassivoJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const dismissedRef = useRef<Set<string>>(new Set());

  const fetchActive = useCallback(async () => {
    if (!user) { setActiveJob(null); setLoading(false); return; }
    const { data } = await supabase
      .from('invio_massivo_jobs' as any)
      .select('*')
      .eq('created_by', user.id)
      .in('stato', ACTIVE_STATES)
      .order('created_at', { ascending: false })
      .limit(1);
    const job = (data as any)?.[0] as InvioMassivoJob | undefined;
    setActiveJob(job || null);
    setLoading(false);
  }, [user]);

  // Initial load
  useEffect(() => { fetchActive(); }, [fetchActive]);

  // Realtime on jobs
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`invio-jobs-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'invio_massivo_jobs',
        filter: `created_by=eq.${user.id}`,
      }, (payload) => {
        const newRow = (payload.new as InvioMassivoJob) || null;
        const oldRow = (payload.old as InvioMassivoJob) || null;
        if (payload.eventType === 'DELETE') {
          if (oldRow && activeJob?.id === oldRow.id) setActiveJob(null);
          return;
        }
        if (!newRow) return;
        const isActive = ACTIVE_STATES.includes(newRow.stato);
        if (isActive) {
          setActiveJob(newRow);
        } else {
          // Just finished
          setActiveJob((prev) => (prev?.id === newRow.id ? null : prev));
          if (!dismissedRef.current.has(newRow.id)) {
            setLastFinishedJob(newRow);
            // auto-dismiss after 10s
            setTimeout(() => {
              dismissedRef.current.add(newRow.id);
              setLastFinishedJob((cur) => (cur?.id === newRow.id ? null : cur));
            }, 10000);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeJob?.id]);

  // Items load + realtime
  useEffect(() => {
    if (!withItems || !activeJob) { setItems([]); return; }
    const jobId = activeJob.id;
    let cancelled = false;
    supabase.from('invio_massivo_job_items' as any)
      .select('*').eq('job_id', jobId).order('position', { ascending: true })
      .then(({ data }) => { if (!cancelled) setItems((data as any) || []); });
    const ch = supabase.channel(`invio-items-${jobId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'invio_massivo_job_items',
        filter: `job_id=eq.${jobId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems((prev) => [...prev, payload.new as InvioMassivoJobItem]
            .sort((a, b) => a.position - b.position));
        } else if (payload.eventType === 'UPDATE') {
          setItems((prev) => prev.map((it) =>
            it.id === (payload.new as any).id ? (payload.new as InvioMassivoJobItem) : it));
        } else if (payload.eventType === 'DELETE') {
          setItems((prev) => prev.filter((it) => it.id !== (payload.old as any).id));
        }
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [withItems, activeJob?.id]);

  const abort = useCallback(async (jobId: string) => {
    const { error } = await supabase.functions.invoke('invio-massivo-runner', {
      body: { action: 'abort', job_id: jobId },
    });
    if (error) throw error;
  }, []);

  const dismissFinished = useCallback(() => {
    if (lastFinishedJob) dismissedRef.current.add(lastFinishedJob.id);
    setLastFinishedJob(null);
  }, [lastFinishedJob]);

  const progress = activeJob ? {
    sent: activeJob.inviati,
    error: activeJob.falliti,
    done: activeJob.inviati + activeJob.falliti,
    total: activeJob.totale,
    percent: activeJob.totale > 0
      ? Math.round(((activeJob.inviati + activeJob.falliti) / activeJob.totale) * 100)
      : 0,
    etaSeconds: activeJob.totale > 0
      ? Math.max(0, activeJob.totale - activeJob.inviati - activeJob.falliti) * activeJob.send_interval_seconds
      : 0,
  } : null;

  return { activeJob, items, lastFinishedJob, progress, loading, abort, refresh: fetchActive, dismissFinished };
}
