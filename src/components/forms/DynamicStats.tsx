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
            <Card key={stat.field.name} className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/40 dark:to-sky-950/40 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Hash className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stat.avg.toFixed(1)}</p>
                    <p className="text-sm text-blue-600/80 dark:text-blue-400/80">{stat.field.label} (media)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Select/Radio field distributions */}
      {stats.selectRadioStats.map((stat) => (
        <Card key={stat.field.name} className="bg-white dark:bg-gray-900 border-2 border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-semibold text-lg">{stat.field.label}</h4>
                <span className="ml-auto text-sm text-muted-foreground">{stat.total} risposte</span>
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
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          isPositive 
                            ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800' 
                            : isNegative 
                              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
                              : 'bg-white dark:bg-gray-800 border-border'
                        }`}
                      >
                        {isPositive ? (
                          <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                        ) : isNegative ? (
                          <div className="p-1.5 rounded-full bg-red-100 dark:bg-red-900">
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-full bg-primary/10">
                            <div className="h-4 w-4 rounded-full bg-primary/40" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{value}</p>
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
