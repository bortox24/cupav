import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Image, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { useCustomLogo } from '@/hooks/useCustomLogo';
import { useQueryClient } from '@tanstack/react-query';

export default function Impostazioni() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoUrl = useCustomLogo();
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSiteSetting();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Seleziona un file immagine', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // Remove existing logo first
      await supabase.storage.from('branding').remove(['logo.png']);
      
      const { error } = await supabase.storage
        .from('branding')
        .upload('logo.png', file, { upsert: true, contentType: file.type });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['custom-logo'] });
      toast({ title: 'Logo aggiornato con successo' });
    } catch (err: any) {
      toast({ title: 'Errore durante il caricamento', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleToggle = (key: string, checked: boolean) => {
    updateSetting.mutate(
      { key, value: checked ? 'true' : 'false' },
      {
        onSuccess: () => toast({ title: 'Impostazione aggiornata' }),
        onError: (err) => toast({ title: 'Errore', description: err.message, variant: 'destructive' }),
      }
    );
  };

  if (isLoading) {
    return (
      <MainLayout title="Impostazioni">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const iscrizioneEnabled = settings?.iscrizione_enabled === 'true';
  const preiscrizioneEnabled = settings?.preiscrizione_enabled === 'true';

  return (
    <MainLayout title="Impostazioni">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logo
            </CardTitle>
            <CardDescription>
              Carica un logo personalizzato. Verrà usato in tutto il sito.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="border border-border rounded-xl p-3 bg-muted/30">
                <img src={logoUrl} alt="Logo attuale" className="h-20 w-auto object-contain" />
              </div>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Caricamento...</>
                  ) : (
                    <><Upload className="mr-2 h-4 w-4" /> Carica nuovo logo</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Formati supportati: PNG, JPG, SVG
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Link pubblici */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Link Pubblici
            </CardTitle>
            <CardDescription>
              Attiva o disattiva i moduli di iscrizione e preiscrizione pubblici.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Iscrizioni</Label>
                <p className="text-sm text-muted-foreground">
                  Modulo iscrizione campeggio (/iscrizione)
                </p>
              </div>
              <Switch
                checked={iscrizioneEnabled}
                onCheckedChange={(checked) => handleToggle('iscrizione_enabled', checked)}
                disabled={updateSetting.isPending}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Preiscrizioni</Label>
                <p className="text-sm text-muted-foreground">
                  Modulo preiscrizione CUPAV (/preiscrizione-cupav)
                </p>
              </div>
              <Switch
                checked={preiscrizioneEnabled}
                onCheckedChange={(checked) => handleToggle('preiscrizione_enabled', checked)}
                disabled={updateSetting.isPending}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
