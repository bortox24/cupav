import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormResponse } from '@/hooks/useForms';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AIAnalysisProps {
  formId: string;
  formName: string;
  schema: FormField[];
  responses: FormResponse[];
}

export function AIAnalysis({ formId, formName, schema, responses }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    
    try {
      // Prepare aggregated data for analysis
      const aggregatedData = prepareAggregatedData(schema, responses);
      
      const { data, error } = await supabase.functions.invoke('analyze-form-responses', {
        body: {
          formName,
          schema: schema.map(f => ({ name: f.name, label: f.label, type: f.type, options: f.options })),
          aggregatedData,
          totalResponses: responses.length,
        },
      });

      if (error) throw error;
      
      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Error analyzing responses:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile analizzare le risposte. Riprova più tardi.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Analisi AI</CardTitle>
          </div>
          <Button
            variant={analysis ? 'outline' : 'default'}
            size="sm"
            onClick={handleAnalyze}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisi in corso...
              </>
            ) : analysis ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Rianalizza
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analizza con AI
              </>
            )}
          </Button>
        </div>
        {!analysis && (
          <CardDescription>
            Usa l'intelligenza artificiale per ottenere insights sulle risposte del modulo
          </CardDescription>
        )}
      </CardHeader>
      {analysis && (
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {analysis}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function prepareAggregatedData(schema: FormField[], responses: FormResponse[]) {
  const result: Record<string, unknown> = {};

  schema.forEach((field) => {
    if (field.type === 'select' || field.type === 'radio') {
      const distribution: Record<string, number> = {};
      responses.forEach((response) => {
        const data = response.data as Record<string, string>;
        const value = data[field.name];
        if (value) {
          distribution[value] = (distribution[value] || 0) + 1;
        }
      });
      result[field.label] = distribution;
    } else if (field.type === 'number') {
      const values: number[] = [];
      responses.forEach((response) => {
        const data = response.data as Record<string, unknown>;
        const value = data[field.name];
        if (value !== null && value !== undefined && value !== '') {
          const num = Number(value);
          if (!isNaN(num)) values.push(num);
        }
      });
      if (values.length > 0) {
        result[field.label] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
          count: values.length,
        };
      }
    } else if (field.type === 'date') {
      const dates: string[] = [];
      responses.forEach((response) => {
        const data = response.data as Record<string, string>;
        const value = data[field.name];
        if (value) dates.push(value);
      });
      if (dates.length > 0) {
        result[field.label] = { totalDates: dates.length, dates: dates.slice(0, 10) };
      }
    }
  });

  return result;
}
