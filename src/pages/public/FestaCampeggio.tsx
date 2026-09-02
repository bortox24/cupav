import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus, Mail, Facebook, PartyPopper, CalendarDays, Clock, CloudRain, UtensilsCrossed, Cake, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomLogo } from "@/hooks/useCustomLogo";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ModuloChiuso } from "@/components/ModuloChiuso";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { calcolaContributoFesta, COSTO_FESTA_ADULTO, COSTO_FESTA_RAGAZZO, COSTO_FESTA_STAFF, type AllergiaRiga } from "@/hooks/useFestaCampeggio";

const capitalizeWords = (s: string) =>
  s.toLowerCase().replace(/(^|[\s'’\-])(\p{L})/gu, (_m, sep, ch) => sep + ch.toUpperCase());

function Stepper({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between bg-muted/30 rounded-xl p-4">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center text-lg font-bold tabular-nums">{value}</span>
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => onChange(value + 1)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function FestaCampeggio() {
  const { toast } = useToast();
  const logoUrl = useCustomLogo();
  const { data: siteSettings, isLoading: settingsLoading } = useSiteSettings();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [numAdulti, setNumAdulti] = useState(0);
  const [numRagazzi, setNumRagazzi] = useState(0);
  const [numStaff, setNumStaff] = useState(0);
  const [haAllergie, setHaAllergie] = useState<boolean | null>(null);
  const [allergie, setAllergie] = useState<AllergiaRiga[]>([{ nome: "", quantita: 1 }]);

  const contributo = useMemo(
    () => calcolaContributoFesta(numAdulti, numRagazzi, numStaff),
    [numAdulti, numRagazzi, numStaff]
  );

  const totPartecipanti = numAdulti + numRagazzi + numStaff;

  // Riduce automaticamente le quantità allergie se i partecipanti diminuiscono
  useEffect(() => {
    setAllergie(prev => {
      let restanti = totPartecipanti;
      let changed = false;
      const next = prev.map(r => {
        const q = Math.max(0, Math.min(r.quantita, restanti));
        restanti -= q;
        if (q !== r.quantita) changed = true;
        return { ...r, quantita: q };
      });
      return changed ? next : prev;
    });
  }, [totPartecipanti]);

  const totAllergici = allergie.reduce((s, r) => s + r.quantita, 0);
  const allergieValide = allergie.filter(r => r.nome.trim() && r.quantita > 0);

  const hasPartecipanti = totPartecipanti > 0;
  const allergieOk = haAllergie === false || (haAllergie === true && allergieValide.length > 0);
  const isValid = !!(nome.trim() && cognome.trim() && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && hasPartecipanti && allergieOk);

  const updateAllergia = (idx: number, patch: Partial<AllergiaRiga>) => {
    setAllergie(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async () => {
    if (!hasPartecipanti) {
      toast({ title: "Seleziona almeno un partecipante", description: "Inserisci almeno un adulto, ragazzo o staff.", variant: "destructive" });
      return;
    }
    if (haAllergie === null) {
      toast({ title: "Indica se ci sono allergie o intolleranze", variant: "destructive" });
      return;
    }
    if (haAllergie && allergieValide.length === 0) {
      toast({ title: "Completa le allergie", description: "Inserisci il tipo di allergia e il numero di persone.", variant: "destructive" });
      return;
    }
    if (!isValid) {
      toast({ title: "Compila tutti i campi obbligatori", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        nome: capitalizeWords(nome.trim()),
        cognome: capitalizeWords(cognome.trim()),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || null,
        num_adulti: numAdulti,
        num_ragazzi: numRagazzi,
        num_staff: numStaff,
        contributo,
        ha_allergie: !!haAllergie,
        allergie: haAllergie ? allergieValide.map(r => ({ nome: r.nome.trim(), quantita: r.quantita })) : null,
        firma_data: format(new Date(), "yyyy-MM-dd"),
        firma_nome_cognome: `${capitalizeWords(nome.trim())} ${capitalizeWords(cognome.trim())}`,
      };
      const { error } = await (supabase as any).from("festa_campeggio").insert(payload);
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Errore durante l'invio", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!settingsLoading && siteSettings?.festa_campeggio_enabled === "false") {
    return <ModuloChiuso titolo="Adesioni chiuse" descrizione="Le adesioni alla Festa Campeggio sono attualmente chiuse." />;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 to-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center shadow-xl rounded-2xl">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="mx-auto w-20 h-20 bg-fuchsia-100 rounded-full flex items-center justify-center">
              <PartyPopper className="h-10 w-10 text-fuchsia-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Grazie per la tua adesione!</h2>
            <p className="text-muted-foreground">
              La tua iscrizione alla <strong>Festa Campeggio</strong> è stata registrata.
              {contributo > 0 && (
                <>
                  <br />Porta con te il contributo di <strong>{contributo}€</strong> in contanti.
                </>
              )}
            </p>
            <div className="bg-muted/40 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold text-foreground">Per qualsiasi informazione</p>
              <p className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4 text-fuchsia-600" />
                <a href="mailto:cupavdirettivo@gmail.com" className="text-primary underline">cupavdirettivo@gmail.com</a>
              </p>
              <p className="flex items-center justify-center gap-2 text-muted-foreground">
                <Facebook className="h-4 w-4 text-fuchsia-600" />
                CUPAV Campeggio Unità Pastorale Altavilla Valmarana
              </p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">Invia un'altra adesione</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 via-background to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-500 via-purple-500 to-pink-500 text-white py-6 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-3 sm:flex-row sm:text-left sm:gap-4">
          <img src={logoUrl} alt="CUPAV" className="h-20 w-20 sm:h-14 sm:w-14 rounded-xl bg-white/20 p-1" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold uppercase">Festa Campeggio</h1>
            <p className="text-white/90 text-sm">CUPAV — Campeggio Unità Pastorale Altavilla Valmarana</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Info giornata */}
        <Card className="rounded-2xl border-fuchsia-300 overflow-hidden">
          <div className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white px-4 py-5 text-center">
            <p className="text-xs uppercase tracking-widest text-white/80">CUPAV</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase leading-tight">Festa del Campeggio</h2>
            <p className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4" /> Domenica 20 settembre
            </p>
          </div>
          <CardContent className="space-y-4 pt-5">
            <div className="rounded-xl bg-amber-100 dark:bg-amber-950/30 border border-amber-300 p-3 text-center">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Prenotazione obbligatoria entro martedì 15 settembre
              </p>
            </div>

            <div>
              <p className="font-semibold flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-fuchsia-600" /> Programma</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><strong className="text-foreground">ore 10.00</strong> — Santa Messa</li>
                <li><strong className="text-foreground">ore 12.30</strong> — Pranzo conviviale</li>
                <li><strong className="text-foreground">ore 14.30</strong> — Intrattenimento</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold flex items-center gap-2 mb-2"><UtensilsCrossed className="h-4 w-4 text-fuchsia-600" /> Menù</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><strong className="text-foreground">Primo:</strong> trofie fredde con pesto, pancetta, pomodorini e noci</li>
                <li><strong className="text-foreground">Secondo:</strong> arrosto di maiale, fagioli all'uccelletto con erbe di campo spadellate</li>
                <li>Acqua, vino, bibite, caffè</li>
              </ul>
              <div className="mt-3 rounded-xl bg-fuchsia-100 dark:bg-fuchsia-950/30 border border-fuchsia-300 p-3 flex items-center gap-2">
                <Cake className="h-5 w-5 text-fuchsia-600 shrink-0" />
                <p className="text-sm font-bold text-fuchsia-800 dark:text-fuchsia-200">Per i dolci pensateci voi !</p>
              </div>
            </div>

            <div className="rounded-xl bg-muted/40 p-3 flex items-center gap-2">
              <CloudRain className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">In caso di maltempo l'evento sarà annullato.</p>
            </div>
          </CardContent>
        </Card>

        {/* Dati */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-fuchsia-100 text-fuchsia-600 rounded-full w-7 h-7 flex items-center justify-center text-sm">1</span>
              Anagrafica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Nome *</Label><Input value={nome} onChange={e => setNome(capitalizeWords(e.target.value))} placeholder="Mario" /></div>
              <div><Label>Cognome *</Label><Input value={cognome} onChange={e => setCognome(capitalizeWords(e.target.value))} placeholder="Rossi" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@esempio.it" /></div>
              <div><Label>Telefono</Label><Input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+39 3xx xxx xxxx" /></div>
            </div>
          </CardContent>
        </Card>

        {/* Partecipanti */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-fuchsia-100 text-fuchsia-600 rounded-full w-7 h-7 flex items-center justify-center text-sm">2</span>
              Partecipanti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Stepper label="Adulti" hint={`${COSTO_FESTA_ADULTO}€ a persona`} value={numAdulti} onChange={setNumAdulti} />
            <Stepper label="Ragazzi" hint={`${COSTO_FESTA_RAGAZZO}€ a persona`} value={numRagazzi} onChange={setNumRagazzi} />
            <Stepper label="Staff" hint={`${COSTO_FESTA_STAFF}€ a persona (animatori, responsabili, cucina, direttivo)`} value={numStaff} onChange={setNumStaff} />
          </CardContent>
        </Card>

        {/* Allergie */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-fuchsia-100 text-fuchsia-600 rounded-full w-7 h-7 flex items-center justify-center text-sm">3</span>
              Allergie o intolleranze?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={haAllergie === true ? "default" : "outline"}
                className={`rounded-xl h-12 ${haAllergie === true ? "bg-fuchsia-600 hover:bg-fuchsia-700 text-white" : ""}`}
                onClick={() => setHaAllergie(true)}
              >
                Sì
              </Button>
              <Button
                type="button"
                variant={haAllergie === false ? "default" : "outline"}
                className={`rounded-xl h-12 ${haAllergie === false ? "bg-fuchsia-600 hover:bg-fuchsia-700 text-white" : ""}`}
                onClick={() => setHaAllergie(false)}
              >
                No
              </Button>
            </div>

            {haAllergie && (
              <div className="space-y-3">
                {totPartecipanti === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Inserisci prima i partecipanti.
                  </p>
                )}
                {allergie.map((riga, idx) => {
                  const altri = totAllergici - riga.quantita;
                  const maxRiga = Math.max(0, totPartecipanti - altri);
                  return (
                    <div key={idx} className="bg-muted/30 rounded-xl p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={riga.nome}
                          onChange={e => updateAllergia(idx, { nome: e.target.value })}
                          placeholder="Es. celiaco, lattosio, frutta secca..."
                        />
                        {allergie.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => setAllergie(prev => prev.filter((_, i) => i !== idx))}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Quante persone (max {maxRiga})</p>
                        <div className="flex items-center gap-3">
                          <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" disabled={riga.quantita <= 0} onClick={() => updateAllergia(idx, { quantita: Math.max(0, riga.quantita - 1) })}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-lg font-bold tabular-nums">{riga.quantita}</span>
                          <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" disabled={riga.quantita >= maxRiga} onClick={() => updateAllergia(idx, { quantita: Math.min(maxRiga, riga.quantita + 1) })}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl"
                  disabled={totAllergici >= totPartecipanti}
                  onClick={() => setAllergie(prev => [...prev, { nome: "", quantita: 1 }])}
                >
                  <Plus className="h-4 w-4 mr-1" /> Aggiungi allergia
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Persone con allergie/intolleranze: {totAllergici} su {totPartecipanti} partecipanti
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Riepilogo */}
        <Card className="rounded-2xl border-fuchsia-300 bg-fuchsia-50/40 dark:bg-fuchsia-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-fuchsia-100 text-fuchsia-600 rounded-full w-7 h-7 flex items-center justify-center text-sm">4</span>
              Riepilogo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-background rounded-xl p-3 shadow-sm">
                <p className="text-2xl font-bold text-foreground">{numAdulti + numRagazzi + numStaff}</p>
                <p className="text-xs text-muted-foreground">Persone</p>
              </div>
              <div className="bg-background rounded-xl p-3 shadow-sm col-span-2">
                <p className="text-2xl font-bold text-fuchsia-600">{contributo}€</p>
                <p className="text-xs text-muted-foreground">Contributo totale</p>
              </div>
            </div>
            {contributo > 0 && (
              <div className="text-sm text-muted-foreground space-y-1">
                {numAdulti > 0 && <p>Adulti: {numAdulti} × {COSTO_FESTA_ADULTO}€ = {numAdulti * COSTO_FESTA_ADULTO}€</p>}
                {numRagazzi > 0 && <p>Ragazzi: {numRagazzi} × {COSTO_FESTA_RAGAZZO}€ = {numRagazzi * COSTO_FESTA_RAGAZZO}€</p>}
                {numStaff > 0 && <p>Staff: {numStaff} × {COSTO_FESTA_STAFF}€ = {numStaff * COSTO_FESTA_STAFF}€</p>}
              </div>
            )}
            {haAllergie && allergieValide.length > 0 && (
              <div className="text-sm text-muted-foreground space-y-1 border-t pt-3">
                <p className="font-medium text-foreground">Allergie / intolleranze</p>
                {allergieValide.map((r, i) => <p key={i}>{r.nome}: {r.quantita} {r.quantita === 1 ? 'persona' : 'persone'}</p>)}
              </div>
            )}
            <div className="pt-2">
              <p className="text-sm font-medium text-foreground">Firma digitale</p>
              <p className="text-sm text-muted-foreground">
                Confermo l'adesione a nome di <strong>{nome.trim() && cognome.trim() ? `${capitalizeWords(nome.trim())} ${capitalizeWords(cognome.trim())}` : '...'}</strong> in data {format(new Date(), 'dd/MM/yyyy', { locale: it })}.
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white rounded-xl"
              size="lg"
            >
              {submitting ? "Invio in corso..." : "Conferma adesione"}
            </Button>
            {!isValid && (
              <p className="text-xs text-center text-muted-foreground">
                {!hasPartecipanti
                  ? "Inserisci almeno un partecipante (adulti, ragazzi o staff)."
                  : haAllergie === null
                    ? "Indica se ci sono allergie o intolleranze."
                    : !allergieOk
                      ? "Completa le allergie indicate (tipo e numero di persone)."
                      : "Compila nome, cognome ed email obbligatori."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
