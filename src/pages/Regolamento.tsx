import { useState, useRef, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Upload, Trash2, FileText, Loader2, Download } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BUCKET = 'regolamento';
const FILE_NAME = 'regolamento.pdf';

function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateWidth]);

  return (
    <div ref={containerRef} className="w-full">
      <Document
        file={url}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        loading={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
        error={
          <div className="text-center py-10 text-destructive">
            Errore nel caricamento del PDF
          </div>
        }
      >
        {numPages && containerWidth > 0 && Array.from({ length: numPages }, (_, i) => (
          <div key={i} className={i < numPages - 1 ? 'mb-4' : ''}>
            <Page
              pageNumber={i + 1}
              width={containerWidth}
              renderTextLayer
              renderAnnotationLayer
            />
          </div>
        ))}
      </Document>
    </div>
  );
}

export default function Regolamento() {
  const { isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPdf = async () => {
    setLoading(true);
    const { data } = await supabase.storage.from(BUCKET).list('', { limit: 1, search: FILE_NAME });
    if (data && data.length > 0) {
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(FILE_NAME);
      setPdfUrl(urlData.publicUrl + '?t=' + Date.now());
    } else {
      setPdfUrl(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPdf();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ variant: 'destructive', title: 'Errore', description: 'Puoi caricare solo file PDF' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Il file non può superare i 20MB' });
      return;
    }

    setUploading(true);
    const { error } = await supabase.storage.from(BUCKET).upload(FILE_NAME, file, { upsert: true });
    if (error) {
      toast({ variant: 'destructive', title: 'Errore upload', description: error.message });
    } else {
      toast({ title: 'Regolamento caricato', description: 'Il PDF è stato aggiornato con successo' });
      await fetchPdf();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.storage.from(BUCKET).remove([FILE_NAME]);
    if (error) {
      toast({ variant: 'destructive', title: 'Errore', description: error.message });
    } else {
      toast({ title: 'Regolamento eliminato' });
      setPdfUrl(null);
    }
    setDeleting(false);
  };

  return (
    <MainLayout title="Regolamento">
      <div className="space-y-6">
        {isAdmin && (
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 pt-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {pdfUrl ? 'Sostituisci PDF' : 'Carica PDF'}
              </Button>
              {pdfUrl && (
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Elimina
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : pdfUrl ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="h-4 w-4 mr-2" />
                  Scarica PDF
                </a>
              </Button>
            </div>
            <div className="w-full rounded-lg border border-border overflow-hidden bg-muted p-2 sm:p-4">
              <PdfViewer url={pdfUrl} />
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Nessun regolamento caricato</p>
              {isAdmin && <p className="text-sm mt-1">Usa il pulsante sopra per caricare il PDF del regolamento</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
