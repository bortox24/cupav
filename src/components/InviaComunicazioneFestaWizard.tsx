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
import { buildEmailHtml } from '@/lib/comunicazioneEmailTemplate';
import type { FestaCampeggio } from '@/hooks/useFestaCampeggio';

interface Props {
  iscrizione: FestaCampeggio;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function InviaComunicazioneFestaWizard({ iscrizione, open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [titolo, setTitolo] = useState('');
  const [testo, setTesto] = useState('');
  const [sending, setSending] = useState(false);

  const reset = () => { setStep(1); setTitolo(''); setTesto(''); setSending(false); };
  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const destinatarioNome = `${iscrizione.cognome} ${iscrizione.nome}`.trim() || 'Partecipante';
  const previewHtml = buildEmailHtml(titolo, testo, destinatarioNome);

  const handleSend = async () => {
    if (!user || !profile) { toast.error('Utente non autenticato'); return; }
    setSending(true);
    let successo = false;
    try {
      const { data: webhookRows } = await supabase
        .from('webhook_config')
        .select('webhook_url')
        .ilike('descrizione', '%comunicazione custom festa%')
        .limit(1);

      const webhookUrl = webhookRows?.[0]?.webhook_url
        || 'https://n8n.marcobortolamai.synology.me/webhook/testo_custom_montaggio';

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titolo,
          testo,
          html: previewHtml,
          tipo: 'festa_campeggio',
          festa_campeggio_id: iscrizione.id,
          email: iscrizione.email,
          cognome: iscrizione.cognome,
          nome: iscrizione.nome,
          telefono: iscrizione.telefono,
          num_adulti: iscrizione.num_adulti,
          num_ragazzi: iscrizione.num_ragazzi,
          num_staff: iscrizione.num_staff,
          contributo: iscrizione.contributo,
          invitato: iscrizione.invitato ?? false,
        }),
      });
      successo = res.ok;
      if (successo) toast.success('Comunicazione inviata!');
      else toast.error("Errore nell'invio della comunicazione");
    } catch {
      toast.error("Errore di rete nell'invio");
    }

    const dettaglioTesto = testo.length > 200 ? `${testo.slice(0, 200)}…` : testo;
    await (supabase.from('anagrafica_invio_logs' as any) as any).insert({
      inviato_da: user.id,
      inviato_da_nome: profile.full_name || profile.email,
      successo,
      tipo: 'invio_comunicazione_custom',
      dettaglio: `Festa Campeggio — ${destinatarioNome} (${iscrizione.email}) — Titolo: ${titolo} — ${dettaglioTesto}`,
    });

    setSending(false);
    if (successo) handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-fuchsia-500" />
            <span className="truncate">Invia comunicazione — {destinatarioNome}</span>
          </DialogTitle>
          <DialogDescription className="text-left">
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
                placeholder="Es. Informazioni Festa Campeggio 2026"
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
              Destinatario: <strong>{destinatarioNome}</strong>
              {iscrizione.email ? ` — ${iscrizione.email}` : ''}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} className="w-full sm:w-auto">Annulla</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!titolo.trim() || !testo.trim()}
                className="w-full sm:w-auto"
              >
                Avanti <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={sending} className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 mr-2" /> Indietro
              </Button>
              <Button onClick={handleSend} disabled={sending} className="w-full sm:w-auto">
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
