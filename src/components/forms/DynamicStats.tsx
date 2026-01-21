import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FormField, FormResponse } from '@/hooks/useForms';
import { Users, BarChart3, Calendar, Hash, CheckCircle, XCircle } from 'lucide-react';

interface DynamicStatsProps {
  schema: FormField[];
  responses: FormResponse[];
}

interface FieldStat {
  field: FormField;
  distribution: Record<string, number>;
  total: number;
}

interface NumberStat {
  field: FormField;
  min: number;
  max: number;
  avg: number;
  count: number;
}

export function DynamicStats({ schema, responses }: DynamicStatsProps) {
  const stats = useMemo(() => {
    const selectRadioStats: FieldStat[] = [];
    const numberStats: NumberStat[] = [];

    schema.forEach((field) => {
      if (field.type === 'select' || field.type === 'radio') {
        const distribution: Record<string, number> = {};
        let total = 0;

        responses.forEach((response) => {
          const data = response.data as Record<string, string>;
          const value = data[field.name];
          if (value) {
            distribution[value] = (distribution[value] || 0) + 1;
            total++;
          }
        });

        if (total > 0) {
          selectRadioStats.push({ field, distribution, total });
        }
      }

      if (field.type === 'number') {
        const values: number[] = [];

        responses.forEach((response) => {
          const data = response.data as Record<string, unknown>;
          const value = data[field.name];
          if (value !== null && value !== undefined && value !== '') {
            const num = Number(value);
            if (!isNaN(num)) {
              values.push(num);
            }
          }
        });

        if (values.length > 0) {
          numberStats.push({
            field,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            count: values.length,
          });
        }
      }
    });

    return { selectRadioStats, numberStats, total: responses.length };
  }, [schema, responses]);

  if (stats.selectRadioStats.length === 0 && stats.numberStats.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Risposte totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Number field stats */}
      {stats.numberStats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.numberStats.map((stat) => (
            <Card key={stat.field.name}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stat.avg.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">{stat.field.label} (media)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Select/Radio field distributions */}
      {stats.selectRadioStats.map((stat) => (
        <Card key={stat.field.name}>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h4 className="font-medium">{stat.field.label}</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(stat.distribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([value, count]) => {
                    const percentage = ((count / stat.total) * 100).toFixed(0);
                    const isPositive = ['sì', 'si', 'yes', 'true', 'confermato', 'presente'].includes(value.toLowerCase());
                    const isNegative = ['no', 'false', 'annullato', 'assente'].includes(value.toLowerCase());
                    
                    return (
                      <div
                        key={value}
                        className="flex items-center gap-2 p-3 rounded-lg bg-muted/50"
                      >
                        {isPositive ? (
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        ) : isNegative ? (
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-primary/20 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{value}</p>
                          <p className="text-sm text-muted-foreground">
                            {count} ({percentage}%)
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
