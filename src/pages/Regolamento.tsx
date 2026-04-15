import { useState, useRef, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDF_URL = '/regolamento-campeggio.pdf';

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
  return (
    <MainLayout title="Regolamento">
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <a href={PDF_URL} target="_blank" rel="noopener noreferrer" download>
              <Download className="h-4 w-4 mr-2" />
              Scarica PDF
            </a>
          </Button>
        </div>
        <div className="w-full rounded-lg border border-border overflow-hidden bg-muted p-2 sm:p-4">
          <PdfViewer url={PDF_URL} />
        </div>
      </div>
    </MainLayout>
  );
}
