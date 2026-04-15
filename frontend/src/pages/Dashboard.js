import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Wallet, TrendUp, Receipt, ChartPie, ArrowRight } from '@phosphor-icons/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

const PIE_COLORS = ['#2563EB', '#E11D48', '#10B981', '#F59E0B', '#7C3AED', '#06B6D4', '#EC4899', '#8B5CF6'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const { isDark } = useSelector((s) => s.theme);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get(`/dashboard/trends?period=${period}`),
    ]).then(([s, t]) => {
      setStats(s.data);
      setTrends(t.data);
    }).finally(() => setLoading(false));
  }, [period]);

  if (loading) return <DashboardSkeleton />;

  const summaryCards = [
    { label: 'Total Expenses', value: `$${(stats?.total_expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'This Month', value: `$${(stats?.month_expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: TrendUp, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
    { label: 'Monthly Budget', value: `$${(stats?.total_budget || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Transactions', value: stats?.expense_count || 0, icon: ChartPie, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight font-[Outfit]">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your financial activity</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children" data-testid="summary-cards">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border border-border bg-card hover:border-primary/20 transition-colors duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-semibold tracking-tight mt-2 font-[Outfit]">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon weight="duotone" className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trends Chart */}
        <Card className="lg:col-span-2 border border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-medium tracking-tight font-[Outfit]">Spending Trends</CardTitle>
            <div className="flex gap-1">
              {['monthly', 'weekly'].map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  data-testid={`trend-${p}-btn`}
                  className="text-xs capitalize"
                >
                  {p}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1E293B' : '#E2E8F0'} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis tick={{ fontSize: 12, fill: isDark ? '#94A3B8' : '#64748B' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: isDark ? '#0F172A' : '#FFF', border: `1px solid ${isDark ? '#1E293B' : '#E2E8F0'}`, borderRadius: '8px', fontSize: '13px' }}
                    formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Expenses']}
                  />
                  <Line type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={2.5} dot={{ fill: '#2563EB', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-medium tracking-tight font-[Outfit]">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.category_breakdown?.length > 0 ? (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.category_breakdown} dataKey="total" nameKey="category_name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {stats.category_breakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} contentStyle={{ background: isDark ? '#0F172A' : '#FFF', border: `1px solid ${isDark ? '#1E293B' : '#E2E8F0'}`, borderRadius: '8px', fontSize: '13px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {stats.category_breakdown.slice(0, 5).map((cat, i) => (
                    <div key={cat.category_name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground">{cat.category_name}</span>
                      </div>
                      <span className="font-medium">${cat.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No expense data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-medium tracking-tight font-[Outfit]">Recent Transactions</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/expenses')} data-testid="view-all-expenses">
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {stats?.recent_transactions?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Receipt weight="duotone" className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.category_name}</p>
                      <p className="text-xs text-muted-foreground">{tx.date} {tx.notes && `- ${tx.notes}`}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-destructive">-${tx.amount.toFixed(2)}</p>
                    <Badge variant="secondary" className="text-xs mt-0.5">{tx.payment_method}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">No transactions yet. Add your first expense!</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div><Skeleton className="h-10 w-48" /><Skeleton className="h-5 w-64 mt-2" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-[360px] rounded-xl" />
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
    </div>
  );
}
