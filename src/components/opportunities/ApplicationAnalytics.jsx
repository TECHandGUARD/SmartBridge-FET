import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const STAGE_COLORS = {
  Saved:        '#94a3b8',
  Started:      '#60a5fa',
  Submitted:    '#a78bfa',
  'Pending NBT':'#fbbf24',
  Accepted:     '#22c55e',
  Rejected:     '#f87171',
  Waitlisted:   '#fb923c',
};

export default function ApplicationAnalytics({ applications }) {
  const stats = useMemo(() => {
    const total = applications.length;
    const byStage = applications.reduce((acc, a) => {
      acc[a.stage] = (acc[a.stage] || 0) + 1;
      return acc;
    }, {});

    const stageData = Object.entries(byStage).map(([stage, count]) => ({ stage, count }));

    const upcoming = applications
      .filter(a => a.deadline && new Date(a.deadline) > new Date())
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 4);

    const overdue = applications.filter(a => a.deadline && new Date(a.deadline) < new Date() && !['Submitted','Accepted','Rejected','Waitlisted'].includes(a.stage));

    return { total, stageData, byStage, upcoming, overdue };
  }, [applications]);

  if (applications.length === 0) return null;

  const accepted = stats.byStage['Accepted'] || 0;
  const submitted = (stats.byStage['Submitted'] || 0) + (stats.byStage['Pending NBT'] || 0) + accepted + (stats.byStage['Waitlisted'] || 0);
  const successRate = submitted > 0 ? Math.round((accepted / submitted) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tracked", value: stats.total, icon: <TrendingUp className="w-4 h-4 text-primary" />, color: "bg-primary/5" },
          { label: "Submitted", value: submitted, icon: <Clock className="w-4 h-4 text-purple-500" />, color: "bg-purple-50" },
          { label: "Accepted", value: accepted, icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, color: "bg-green-50" },
          { label: "Success Rate", value: `${successRate}%`, icon: <TrendingUp className="w-4 h-4 text-amber-500" />, color: "bg-amber-50" },
        ].map(k => (
          <div key={k.label} className={`${k.color} rounded-xl p-3 flex items-center gap-2`}>
            {k.icon}
            <div>
              <div className="text-lg font-bold text-foreground leading-none">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stage bar chart */}
      {stats.stageData.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Applications by Stage</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={stats.stageData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.stageData.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Overdue alert */}
      {stats.overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">Overdue Applications</span>
          </div>
          {stats.overdue.map(a => (
            <div key={a.id} className="flex items-center justify-between text-xs py-0.5">
              <span className="font-medium text-red-800">{a.university_name}</span>
              <span className="text-red-600">{new Date(a.deadline).toLocaleDateString('en-ZA')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming deadlines */}
      {stats.upcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-800">Upcoming Deadlines</span>
          </div>
          {stats.upcoming.map(a => {
            const daysLeft = Math.ceil((new Date(a.deadline) - new Date()) / 86400000);
            return (
              <div key={a.id} className="flex items-center justify-between text-xs py-0.5">
                <span className="font-medium text-amber-900">{a.university_name}</span>
                <span className={`font-semibold ${daysLeft <= 7 ? 'text-red-600' : 'text-amber-700'}`}>
                  {daysLeft}d left
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}