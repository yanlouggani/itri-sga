"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import {
  BarChart3, TrendingUp, Users, CheckCircle, AlertTriangle, Clock, Loader2, ChevronLeft, ChevronRight, PieChart,
} from "lucide-react";
import { toast } from "sonner";

type MonthData = { month: string; sessions: number; present: number; late: number; total: number; rate: number };
type ModuleStat = { name: string; sessions: number; present: number; total: number; rate: number };

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const parseMonth = (s: string) => { const [y, m] = s.split("-").map(Number); return `${MONTHS[m - 1]} ${y}`; };

export default function ProfessorAnalyticsPage() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [modules, setModules] = useState<ModuleStat[]>([]);
  const [profName, setProfName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showMonths, setShowMonths] = useState(12);
  const supabase = createClient();

  const load = useCallback(async () => {
    try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: p } = await supabase.from("users").select("firstname, lastname").eq("id", user.id).maybeSingle();
    if (p) setProfName(`${p.firstname ?? ""} ${p.lastname ?? ""}`);

    const { data: sessions } = await supabase
      .from("sessions")
      .select("sessiondate, presentcount, absentcount, latecount, totalstudents, status, modules(name)")
      .eq("professorid", user.id)
      .order("sessiondate", { ascending: true });

    if (!sessions || sessions.length === 0) { setLoading(false); return; }

    const byMonth: Record<string, { present: number; late: number; total: number; sessions: number }> = {};
    const byModule: Record<string, { present: number; total: number; sessions: number }> = {};

    for (const s of sessions as Record<string, unknown>[]) {
      const date = s.sessiondate as string;
      const monthKey = date.slice(0, 7);
      if (!byMonth[monthKey]) byMonth[monthKey] = { present: 0, late: 0, total: 0, sessions: 0 };
      byMonth[monthKey].sessions++;

      const p = (s.presentcount as number) ?? 0;
      const a = (s.absentcount as number) ?? 0;
      const l = (s.latecount as number) ?? 0;
      const tot = (s.totalstudents as number) ?? 0;
      byMonth[monthKey].present += p;
      byMonth[monthKey].late += l;
      byMonth[monthKey].total += (p + a + l);

      const modName = ((s.modules as Record<string, unknown> | null)?.name as string) ?? "Inconnu";
      if (!byModule[modName]) byModule[modName] = { present: 0, total: 0, sessions: 0 };
      byModule[modName].sessions++;
      byModule[modName].present += p;
      byModule[modName].total += (p + a + l);
    }

    const monthList = Object.entries(byMonth).map(([month, d]) => ({
      month: parseMonth(month),
      rawMonth: month,
      sessions: d.sessions,
      present: d.present,
      late: d.late,
      total: d.total,
      rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
    })).sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));

    const moduleList = Object.entries(byModule).map(([name, d]) => ({
      name,
      sessions: d.sessions,
      present: d.present,
      total: d.total,
      rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
    })).sort((a, b) => b.sessions - a.sessions);

    setMonths(monthList);
    setModules(moduleList);
    } catch (err) {
      toast.error("Erreur chargement analytics", { description: String(err) });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement des statistiques...</p>
      </div>
    </div>
  );

  const visibleMonths = months.slice(-showMonths);
  const totalSessions = months.reduce((s, m) => s + m.sessions, 0);
  const totalPresent = months.reduce((s, m) => s + m.present, 0);
  const totalMarked = months.reduce((s, m) => s + m.total, 0);
  const overallRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

  const totalLate = months.reduce((s, m) => s + m.late, 0);
  
  const pieData = [
    { name: "Présents", value: totalPresent, color: "#10b981" },
    { name: "Absents", value: totalMarked - totalPresent - totalLate, color: "#ef4444" },
    { name: "Retards", value: totalLate, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytiques</h1>
          <p className="text-muted-foreground">{profName && `${profName} · `}{totalSessions} séance{totalSessions > 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-1">
          {[6, 12].map((n) => (
            <Button key={n} variant={showMonths === n ? "default" : "outline"} size="sm" className="h-7 text-xs"
              onClick={() => setShowMonths(n)}>
              {n} mois
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Séances" value={totalSessions} color="text-blue-600" bg="bg-blue-500/10" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Taux de présence" value={`${overallRate}%`} color="text-emerald-600" bg="bg-emerald-500/10" />
        <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Présences" value={totalPresent} color="text-emerald-600" bg="bg-emerald-500/10" />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Absences" value={totalMarked - totalPresent} color="text-red-600" bg="bg-red-500/10" />
      </div>

      {visibleMonths.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Évolution du taux de présence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visibleMonths}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                  <Tooltip
                    contentStyle={{ fontSize: 13, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    formatter={(v) => [`${v}%`, "Taux de présence"]}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981" }}
                    activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4 text-primary" />
              Répartition globale
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-6 flex-wrap">
                <div className="h-48 w-48 mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        paddingAngle={4} dataKey="value" stroke="none">
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8 }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-sm">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span>{d.name} : <strong>{d.value}</strong> ({Math.round((d.value / totalMarked) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Séances par mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visibleMonths}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8 }} />
                  <Bar dataKey="sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Séances" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {modules.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Statistiques par module
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/50">
              {modules.map((m) => (
                <div key={m.name} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.sessions} séance{m.sessions > 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={cn("text-sm font-semibold tabular-nums",
                        m.rate >= 80 ? "text-emerald-600" : m.rate >= 60 ? "text-amber-600" : "text-red-600")}>
                        {m.rate}%
                      </p>
                      <p className="text-xs text-muted-foreground">{m.present}/{m.total}</p>
                    </div>
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all",
                        m.rate >= 80 ? "bg-emerald-500" : m.rate >= 60 ? "bg-amber-500" : "bg-red-500")}
                        style={{ width: `${m.rate}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {totalSessions === 0 && (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="rounded-full bg-muted p-4 mb-5">
              <BarChart3 className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <p className="text-xl font-semibold text-muted-foreground mb-1">Aucune donnée</p>
            <p className="text-sm text-muted-foreground/60">Les statistiques apparaîtront après vos premières séances</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; bg: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("rounded-xl p-3", bg, color)}>{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
