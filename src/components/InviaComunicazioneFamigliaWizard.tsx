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
import type { IscrizioneFamiglia } from '@/hooks/useFamiglie';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const buildEmailHtml = (titolo: string, testo: string, destinatarioNome: string) => {
  const titoloSafe = escapeHtml(titolo);
  const testoSafe = escapeHtml(testo).replace(/\\n/g, '<br/>').replace(/\r\n|\r|\n/g, '<br/>');
  const destSafe = escapeHtml(destinatarioNome || 'Famiglia');
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Comunicazione CUPAV 2026</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding: 30px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-family: Arial, sans-serif;">
      <tr>
        <td style="background-color:#f2c10f; padding: 30px; text-align:center;">
          <img src="https://lymuvosryafhpeaiqcba.supabase.co/storage/v1/object/public/branding/logo.png?t=1774111967982" alt="CUPAV" width="160" style="display:block; margin:0 auto; max-width:160px;" />
          <h1 style="color:#000000; margin: 16px 0 4px 0; font-size:20px; letter-spacing:1px; font-family: Arial, sans-serif;">Campeggio Unità Pastorale Altavilla Valmarana</h1>
          <p style="color:#000000; margin:0; font-size:13px; font-family: Arial, sans-serif;">CUPAV — Turno Famiglie</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 36px 40px 0 40px;">
          <h2 style="color:#1a5c2e; margin:0 0 28px 0; font-size:22px; font-family: Arial, sans-serif;">${titoloSafe}</h2>
          <p style="color:#444444; font-size:15px; line-height:1.6; margin:0; font-family: Arial, sans-serif;">Gentile <strong>${destSafe}</strong>,</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 4px 40px 32px 40px;">
          <p style="color:#444444; font-size:15px; line-height:1.8; margin:0; font-family: Arial, sans-serif;">${testoSafe}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 40px 30px 40px; text-align:center;">
          <p style="color:#888888; font-size:13px; line-height:1.7; margin:0; font-family: Arial, sans-serif;">
            Per qualsiasi domanda o informazione contattaci a<br/>cupavdirettivo@gmail.com
          </p>
        </td>
      </tr>
      <tr>
        <td style="background-color:#1a5c2e; padding: 24px 40px; text-align:center;">
          <p style="color:#c8e6c9; font-size:12px; margin:0 0 6px 0; font-family: Arial, sans-serif;">
            <strong style="color:#ffffff;">CUPAV</strong> — Campeggio Unità Pastorale Altavilla Valmarana
          </p>
          <p style="color:#a5d6a7; font-size:11px; margin:0; font-family: Arial, sans-serif;">
            Questa è un'email automatica di comunicazione.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
};

interface Props {
  iscrizione: IscrizioneFamiglia;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function InviaComunicazioneFamigliaWizard({ iscrizione, open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [titolo, setTitolo] = useState('');
  const [testo, setTesto] = useState('');
  const [sending, setSending] = useState(false);

  const reset = () => { setStep(1); setTitolo(''); setTesto(''); setSending(false); };
  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const destinatarioNome = `${iscrizione.cognome} ${iscrizione.nome}`.trim() || 'Famiglia';
  const previewHtml = buildEmailHtml(titolo, testo, destinatarioNome);

  const handleSend = async () => {
    if (!user || !profile) { toast.error('Utente non autenticato'); return; }
    setSending(true);
    let successo = false;
    try {
      const { data: webhookRows } = await supabase
        .from('webhook_config')
        .select('webhook_url')
        .ilike('descrizione', '%comunicazione custom famiglie%')
        .limit(1);

      const webhookUrl = webhookRows?.[0]?.webhook_url || 'https://n8n.marcobortolamai.synology.me/webhook/testo_custom_famiglie';
      if (!webhookUrl) {
        toast.error('Nessun webhook configurato per comunicazioni famiglie');
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
          tipo: 'turno_famiglie',
          iscrizione_famiglia_id: iscrizione.id,
          email: iscrizione.email,
          cognome: iscrizione.cognome,
          nome: iscrizione.nome,
          residente_a: iscrizione.residente_a,
          via: iscrizione.via,
          recapiti_telefonici: iscrizione.recapiti_telefonici,
          tipo_periodo: iscrizione.tipo_periodo,
          data_inizio: iscrizione.data_inizio,
          data_fine: iscrizione.data_fine,
          num_adulti: iscrizione.num_adulti,
          num_4_10_anni: iscrizione.num_4_10_anni,
          num_0_3_anni: iscrizione.num_0_3_anni,
          num_animali: iscrizione.num_animali,
          turno: iscrizione.turno,
        }),
      });
      successo = res.ok;
      if (successo) toast.success('Comunicazione inviata!');
      else toast.error("Errore nell'invio della comunicazione");
    } catch {
      toast.error('Errore di rete nell\'invio');
    }

    const dettaglioTesto = testo.length > 200 ? `${testo.slice(0, 200)}…` : testo;
    await (supabase.from('anagrafica_invio_logs' as any) as any).insert({
      iscrizione_famiglia_id: iscrizione.id,
      inviato_da: user.id,
      inviato_da_nome: profile.full_name || profile.email,
      successo,
      tipo: 'invio_comunicazione_custom',
      dettaglio: `Titolo: ${titolo} — ${dettaglioTesto}`,
    });
    queryClient.invalidateQueries({ queryKey: ['anagrafica-invio-logs-famiglia', iscrizione.id] });
    setSending(false);
    if (successo) handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-red-500" />
            Invia comunicazione — {destinatarioNome}
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
                placeholder="Es. Aggiornamento turno famiglie 2026"
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
