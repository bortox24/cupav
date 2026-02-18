import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRagazzi, RagazzoCompleto } from '@/hooks/useRagazzi';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, MapPin, Calendar, Users, GraduationCap, Phone, Mail } from 'lucide-react';

function RagazzoCard({ ragazzo }: { ragazzo: RagazzoCompleto }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{ragazzo.full_name}</CardTitle>
          <Badge variant={ragazzo.residente_altavilla ? 'default' : 'secondary'} className="shrink-0">
            <MapPin className="h-3 w-3 mr-1" />
            {ragazzo.residente_altavilla ? 'Residente' : 'Non residente'}
          </Badge>
        </div>
        {ragazzo.data_nascita && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {ragazzo.data_nascita}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Iscrizioni */}
        {ragazzo.iscrizioni.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium flex items-center gap-1">
              <GraduationCap className="h-4 w-4" /> Iscrizioni
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ragazzo.iscrizioni.map((i) => (
                <Badge key={i.id} variant="outline" className="text-xs">
                  {i.anno}: {i.turno}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Genitori */}
        {ragazzo.genitori.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <Users className="h-4 w-4" /> Genitori
            </p>
            {ragazzo.genitori.map((g) => (
              <div key={g.id} className="text-sm bg-muted/50 rounded-lg p-2.5 space-y-1">
                <p className="font-medium">{g.nome_cognome} <span className="text-muted-foreground font-normal">({g.ruolo})</span></p>
                {g.email && (
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Mail className="h-3 w-3" /> {g.email}
                  </p>
                )}
                {g.telefono && (
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Phone className="h-3 w-3" /> {g.telefono}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnagraficaRagazzi() {
  const { data: ragazzi, isLoading } = useRagazzi();
  const [search, setSearch] = useState('');

  const filtered = ragazzi?.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <MainLayout title="Anagrafica Ragazzi">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'Nessun ragazzo trovato.' : 'Nessun ragazzo registrato.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <RagazzoCard key={r.id} ragazzo={r} />
          ))}
        </div>
      )}
    </MainLayout>
  );
}
