import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

interface ModuloChiusoProps {
  titolo?: string;
  descrizione?: string;
}

export function ModuloChiuso({
  titolo = "Modulo chiuso",
  descrizione = "Questo modulo non è attualmente disponibile. Riprova più tardi.",
}: ModuloChiusoProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full text-center shadow-xl rounded-2xl">
        <CardHeader>
          <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle>{titolo}</CardTitle>
          <CardDescription>{descrizione}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
