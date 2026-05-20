import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import type { RagazzoCompleto } from '@/hooks/useRagazzi';
import { buildEmailHtml } from '@/lib/comunicazioneEmailTemplate';

interface Props {
  ragazzo: RagazzoCompleto;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function InviaComunicazioneWizard({ ragazzo, open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [titolo, setTitolo] = useState('');
  const [testo, setTesto] = useState('');
  const [sending, setSending] = useState(false);

  const reset = () => { setStep(1); setTitolo(''); setTesto(''); setSending(false); };
  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const genitoreNome = ragazzo.genitori?.[0]?.nome_cognome || 'Genitore';
  const previewHtml = buildEmailHtml(titolo, testo, genitoreNome);

  const handleSend = async () => {
    if (!user || !profile) { toast.error('Utente non autenticato'); return; }
    setSending(true);
    let successo = false;
    try {
      const { data: webhookRows } = await supabase
        .from('webhook_config')
        .select('webhook_url')
        .ilike('descrizione', '%comunicazione custom%')
        .limit(1);

      const webhookUrl = webhookRows?.[0]?.webhook_url;
      if (!webhookUrl) {
        toast.error('Nessun webhook configurato con descrizione "comunicazione custom"');
        setSending(false);
        return;
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titolo,
          testo,
          html: previewHtml,
          ragazzo_id: ragazzo.id,
          full_name: ragazzo.full_name,
          data_nascita: ragazzo.data_nascita,
          residente_altavilla: ragazzo.residente_altavilla,
          genitori: ragazzo.genitori,
          iscrizioni: ragazzo.iscrizioni,
        }),
      });
      successo = res.ok;
      if (successo) toast.success('Comunicazione inviata!');
      else toast.error("Errore nell'invio della comunicazione");
    } catch {
      toast.error('Errore di rete nell\'invio');
    }

    const dettaglioTesto = testo.length > 200 ? `${testo.slice(0, 200)}…` : testo;
    await supabase.from('anagrafica_invio_logs' as any).insert({
      ragazzo_id: ragazzo.id,
      inviato_da: user.id,
      inviato_da_nome: profile.full_name || profile.email,
      successo,
      tipo: 'invio_comunicazione_custom',
      dettaglio: `Titolo: ${titolo} — ${dettaglioTesto}`,
    });
    queryClient.invalidateQueries({ queryKey: ['anagrafica-invio-logs', ragazzo.id] });
    setSending(false);
    if (successo) handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-red-500" />
            Invia comunicazione — {ragazzo.full_name}
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Compila titolo e testo della comunicazione.' : 'Anteprima email — verifica e invia.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Titolo</Label>
              <Input
                value={titolo}
                onChange={(e) => setTitolo(e.target.value)}
                placeholder="Es. Aggiornamento iscrizione 2026"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Testo della comunicazione</Label>
              <Textarea
                value={testo}
                onChange={(e) => setTesto(e.target.value)}
                placeholder="Scrivi qui il messaggio…"
                rows={10}
                maxLength={5000}
                className="resize-y min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground">{testo.length}/5000 caratteri</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            <div className="rounded-lg overflow-hidden border bg-white">
              <iframe
                title="Anteprima email"
                srcDoc={previewHtml}
                className="w-full"
                style={{ height: '60vh', border: 'none', background: '#f4f4f4' }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Destinatario: <strong>{genitoreNome}</strong>
              {ragazzo.genitori?.[0]?.email ? ` — ${ragazzo.genitori[0].email}` : ''}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Annulla</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!titolo.trim() || !testo.trim()}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                Avanti <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={sending}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Indietro
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Invia
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
