"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";
import {
  BarChart3, TrendingUp, Users, CheckCircle, AlertTriangle, PieChart,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState, LoadingState } from "@/components/mascot/EmptyState";

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

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!active) return;
      await load();
    })();
    return () => {
      active = false;
    };
  }, [load]);

  if (loading) return <LoadingState label="Chargement des statistiques..." />;

  const visibleMonths = months.slice(-showMonths);
  const totalSessions = months.reduce((s, m) => s + m.sessions, 0);
  const totalPresent = months.reduce((s, m) => s + m.present, 0);
  const totalMarked = months.reduce((s, m) => s + m.total, 0);
  const overallRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

  const totalLate = months.reduce((s, m) => s + m.late, 0);

  const pieData = [
    { name: "Présents", value: totalPresent, color: "#6d28d9" },
    { name: "Absents", value: totalMarked - totalPresent - totalLate, color: "#f97316" },
    { name: "Retards", value: totalLate, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  const hasData = totalSessions > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytiques"
        subtitle={profName ? `${profName} · ${totalSessions} séance${totalSessions > 1 ? "s" : ""}` : `${totalSessions} séance${totalSessions > 1 ? "s" : ""}`}
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-1">
            {[6, 12].map((n) => (
              <Button key={n} variant={showMonths === n ? "default" : "outline"} size="sm" className="h-7 text-xs rounded-lg"
                onClick={() => setShowMonths(n)}>
                {n} mois
              </Button>
            ))}
          </div>
        }
      />

      {!hasData && (
        <EmptyState
          pose="reflexion"
          title="Aucune donnée"
          hint="Les statistiques apparaîtront après vos premières séances"
        />
      )}

      {hasData && (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Séances" value={totalSessions} color="from-[#6d28d9]/10 to-[#6d28d9]/5" iconColor="text-[#6d28d9]" />
            <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Taux de présence" value={`${overallRate}%`} color="from-emerald-500/10 to-emerald-500/5" iconColor="text-emerald-600" />
            <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Présences" value={totalPresent} color="from-[#6d28d9]/10 to-[#6d28d9]/5" iconColor="text-[#6d28d9]" />
            <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Absences" value={totalMarked - totalPresent} color="from-[#f97316]/10 to-[#f97316]/5" iconColor="text-[#f97316]" />
          </div>

          {visibleMonths.length > 0 && (
            <Card className="border border-[#6d28d9]/10 bg-white shadow-sm shadow-[#6d28d9]/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#1a1a2e]">
                  <div className="rounded-lg bg-[#6d28d9]/10 p-1.5">
                    <TrendingUp className="h-4 w-4 text-[#6d28d9]" />
                  </div>
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
                      <Line type="monotone" dataKey="rate" stroke="#6d28d9" strokeWidth={2.5} dot={{ r: 4, fill: "#6d28d9" }}
                        activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border border-[#6d28d9]/10 bg-white shadow-sm shadow-[#6d28d9]/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#1a1a2e]">
                  <div className="rounded-lg bg-[#6d28d9]/10 p-1.5">
                    <PieChart className="h-4 w-4 text-[#6d28d9]" />
                  </div>
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
                    <div className="space-y-2 text-sm text-[#475569]">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                          <span>{d.name} : <strong>{d.value}</strong> ({Math.round((d.value / totalMarked) * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState compact pose="reflexion" title="Aucune donnée" />
                )}
              </CardContent>
            </Card>

            <Card className="border border-[#6d28d9]/10 bg-white shadow-sm shadow-[#6d28d9]/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#1a1a2e]">
                  <div className="rounded-lg bg-[#f97316]/10 p-1.5">
                    <BarChart3 className="h-4 w-4 text-[#f97316]" />
                  </div>
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
                      <Bar dataKey="sessions" fill="#6d28d9" radius={[4, 4, 0, 0]} name="Séances" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {modules.length > 0 && (
            <Card className="border border-[#6d28d9]/10 bg-white shadow-sm shadow-[#6d28d9]/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#1a1a2e]">
                  <div className="rounded-lg bg-[#6d28d9]/10 p-1.5">
                    <Users className="h-4 w-4 text-[#6d28d9]" />
                  </div>
                  Statistiques par module
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-[#6d28d9]/[0.06]">
                  {modules.map((m) => (
                    <div key={m.name} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1a2e] truncate">{m.name}</p>
                        <p className="text-xs text-[#64748b]">{m.sessions} séance{m.sessions > 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={cn("text-sm font-semibold tabular-nums",
                            m.rate >= 80 ? "text-emerald-600" : m.rate >= 60 ? "text-amber-600" : "text-[#f97316]")}>
                            {m.rate}%
                          </p>
                          <p className="text-xs text-[#64748b]">{m.present}/{m.total}</p>
                        </div>
                        <div className="w-24 h-2 rounded-full bg-[#f8f9fc] overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all",
                            m.rate >= 80 ? "bg-emerald-500" : m.rate >= 60 ? "bg-amber-500" : "bg-[#f97316]")}
                            style={{ width: `${m.rate}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, iconColor }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; iconColor: string;
}) {
  return (
    <Card className="border border-[#6d28d9]/[0.06] bg-white hover:shadow-lg hover:shadow-[#6d28d9]/[0.04] transition-all">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`rounded-xl bg-gradient-to-br ${color} p-3 ${iconColor}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-[#1a1a2e]">{value}</p>
          <p className="text-xs text-[#64748b]">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
