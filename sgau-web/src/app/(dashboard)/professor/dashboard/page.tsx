"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  CalendarDays, Clock, MapPin, Users, PlayCircle,
  Square, Loader2, ChevronRight, History, GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { getWeekStart, projectWeek, normalizeTime } from "@/lib/session-masters";
import { uuid } from "@/lib/uuid";
import { Mascot } from "@/components/mascot/Mascot";
import { EmptyState, LoadingState } from "@/components/mascot/EmptyState";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type SessionRow = {
  id: string; moduleName: string; groupName: string; roomName: string;
  starttime: string; endtime: string; sessiondate: string;
  status: string;
  presentcount: number; absentcount: number; totalstudents: number;
};

type ScheduleRow = {
  id: string; starttime: string; endtime: string;
  moduleName: string; groupName: string; roomName: string;
  groupid: string; professorid: string; roomid: string;
};

export default function ProfessorDashboardPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [todaySlots, setTodaySlots] = useState<ScheduleRow[]>([]);
  const [profile, setProfile] = useState<{ firstname: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<SessionRow | null>(null);
  const [closing, setClosing] = useState(false);
  const [now, setNow] = useState(new Date());
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => { const i = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(i); }, []);

  const today = now.toISOString().slice(0, 10);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase.from("users").select("firstname").eq("id", user.id).maybeSingle();
      if (p) setProfile(p as { firstname: string });

      const { data: links } = await supabase
        .from("professor_groups")
        .select("groupid")
        .eq("professorid", user.id);
      const gids = (links ?? []).map((r: Record<string, unknown>) => r.groupid as string);

      if (gids.length === 0) {
        setLoading(false);
        return;
      }

      const res = await projectWeek(supabase, getWeekStart(new Date()), null);
      if (res.ok) {
        setTodaySlots(
          res.data
            .filter((o) => o.occurrenceDate === today)
            .map((o) => ({
              id: o.id,
              starttime: o.startTime,
              endtime: o.endTime,
              moduleName: o.moduleName,
              groupName: o.groupName,
              roomName: o.roomName,
              groupid: o.groupId,
              professorid: o.professorId,
              roomid: o.roomId,
            })),
        );
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessData } = await supabase
        .from("sessions")
        .select("*, modules(name), groups(name), rooms(name)")
        .eq("professorid", user.id)
        .gte("sessiondate", thirtyDaysAgo.toISOString().slice(0, 10))
        .order("sessiondate", { ascending: false })
        .order("starttime");

      if (sessData) {
        setSessions((sessData as Record<string, unknown>[]).map((s) => {
          const m = s.modules as Record<string, unknown> | null;
          const g = s.groups as Record<string, unknown> | null;
          const r = s.rooms as Record<string, unknown> | null;
          return {
            id: s.id as string,
            moduleName: m?.name as string ?? "",
            groupName: g?.name as string ?? "",
            roomName: r?.name as string ?? "",
            starttime: s.starttime as string,
            endtime: s.endtime as string,
            sessiondate: s.sessiondate as string,
            status: s.status as string,
            presentcount: (s.presentcount as number) ?? 0,
            absentcount: (s.absentcount as number) ?? 0,
            totalstudents: (s.totalstudents as number) ?? 0,
          };
        }));
      }
    } catch (err) {
      toast.error("Erreur chargement dashboard", { description: String(err) });
    }
    setLoading(false);
  }, [supabase, today]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!mounted) return;
      await load();
    })();
    const i = setInterval(() => { if (mounted) void load(); }, 10000);
    return () => { mounted = false; clearInterval(i); };
  }, [load]);

  const handleStart = async (sessionid?: string, scheduleEntry?: ScheduleRow) => {
    const key = sessionid ?? "new";
    setActingId(key);
    try {
      let targetId = sessionid;
      if (!targetId && scheduleEntry) {
        const entry = scheduleEntry;
        const { count: enrollCount } = await supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("groupid", entry.groupid)
          .eq("status", "active");
        const { data: newSession, error: createErr } = await supabase
          .from("sessions")
          .insert({
            id: uuid(),
            groupid: entry.groupid,
            professorid: entry.professorid,
            roomid: entry.roomid,
            sessiondate: today,
            starttime: entry.starttime,
            endtime: entry.endtime,
            status: "ACTIVE",
            totalstudents: enrollCount ?? 0,
          })
          .select("id")
          .single();
        if (createErr) throw createErr;
        targetId = newSession?.id as string;
      }
      const { data, error } = await supabase.rpc("start_session", {
        p_session_id: targetId ?? null,
      });
      if (error) throw error;
      toast.success("Séance démarrée");
      if (data) router.push(`/professor/sessions/${data}`);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setActingId(null);
  };

  const handleClose = async () => {
    if (!closeTarget) return;
    setClosing(true);
    try {
      const { error } = await supabase.rpc("close_session", { p_session_id: closeTarget.id });
      if (error) throw error;
      toast.success("Séance clôturée");
      setCloseTarget(null);
      load();
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setClosing(false);
  };

  const active = sessions.filter((s) => s.status.toLowerCase() === "active");
  const todaySessions = sessions.filter((s) => s.sessiondate === today);
  const completedToday = todaySessions.filter((s) => s.status.toLowerCase() === "completed");
  const completedAll = sessions.filter((s) => s.status.toLowerCase() === "completed");

  const hasSessionAt = (t: string) => todaySessions.some((s) => normalizeTime(s.starttime) === normalizeTime(t));
  const availableSlots = todaySlots.filter((s) => !hasSessionAt(s.starttime));

  const pastSessions = completedAll.filter((s) => s.sessiondate !== today).slice(0, 6);
  const hasContent = active.length > 0 || todaySessions.length > 0 || todaySlots.length > 0;

  const ws = getWeekStart(new Date());
  const weekKey = ws;
  const completedWeek = sessions.filter((s) => s.status.toLowerCase() === "completed" && s.sessiondate >= weekKey);
  const totalAttendance = completedWeek.reduce((acc, s) => acc + s.presentcount, 0);
  const totalPossible = completedWeek.reduce((acc, s) => acc + s.totalstudents, 0);
  const attendanceRate = totalPossible > 0 ? Math.round((totalAttendance / totalPossible) * 100) : null;

  if (loading) return <LoadingState label="Chargement de votre journée..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#64748b]">{DAYS[now.getDay()]} {now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5 text-[#1a1a2e]">
            {now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir"}{profile ? `, ${profile.firstname}` : ""}
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-[#64748b] bg-white rounded-xl px-4 py-2 border border-[#6d28d9]/10 shadow-sm">
          <Mascot pose="bonjour" size="xs" animate={false} />
          <span>{todaySlots.length} créneau{todaySlots.length > 1 ? "x" : ""} aujourd&apos;hui</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#6d28d9]/10 bg-gradient-to-r from-[#6d28d9]/5 via-white to-[#f97316]/5 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Mascot pose={completedWeek.length > 0 ? "celebration" : "bonjour"} size="md" animate={false} />
          <div className="flex-1 min-w-[220px]">
            <p className="text-base font-bold text-[#1a1a2e]">
              {completedWeek.length > 0
                ? `${completedWeek.length} séance(s) bouclée(s) cette semaine`
                : "Votre semaine commence ici"}
            </p>
            <p className="text-sm text-[#64748b]">
              {attendanceRate !== null
                ? `Présence moyenne de ${attendanceRate}% sur ${totalAttendance}/${totalPossible} étudiants marqués.`
                : "Démarrez vos séances pour remplir votre résumé hebdomadaire."}
            </p>
          </div>
          {attendanceRate !== null && (
            <div className="flex flex-col items-center rounded-xl bg-white border border-[#6d28d9]/10 px-4 py-2">
              <span className="text-xl font-bold text-[#6d28d9]">{attendanceRate}%</span>
              <span className="text-[10px] text-[#64748b]">présence</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Aujourd'hui" value={todaySlots.length} color="from-[#6d28d9]/10 to-[#6d28d9]/5" iconColor="text-[#6d28d9]" />
        <StatCard icon={<PlayCircle className="h-5 w-5" />} label="En cours" value={active.length} color="from-[#f97316]/10 to-[#f97316]/5" iconColor="text-[#f97316]" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Étudiants" value={todaySessions.reduce((s, x) => s + x.totalstudents, 0)} color="from-[#f59e0b]/10 to-[#f59e0b]/5" iconColor="text-[#f59e0b]" />
        <StatCard icon={<History className="h-5 w-5" />} label="Terminées" value={completedToday.length} color="from-[#6d28d9]/10 to-[#f97316]/5" iconColor="text-[#6d28d9]" />
      </div>

      {active.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-semibold text-[#1a1a2e]">En cours</h2>
            <Badge variant="secondary" className="text-[10px] font-mono bg-[#f97316]/10 text-[#f97316] border-none">{active.length}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((s) => (
              <SessionCard key={s.id} session={s} statusColor="emerald"
                actions={
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="default" className="h-8 text-xs gap-1.5 flex-1 rounded-lg"
                      onClick={() => router.push(`/professor/sessions/${s.id}`)}>
                      <Users className="h-3.5 w-3.5" />Gérer
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-[#f97316] border-[#f97316]/30 hover:bg-[#f97316]/10 rounded-lg"
                      onClick={() => setCloseTarget(s)}>
                      <Square className="h-3.5 w-3.5" />Clôturer
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        </section>
      )}

      {completedToday.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
            <h2 className="text-lg font-semibold text-[#1a1a2e]">Terminées aujourd&apos;hui</h2>
            <Badge variant="secondary" className="text-[10px] font-mono bg-[#6d28d9]/10 text-[#6d28d9] border-none">{completedToday.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {completedToday.map((s) => (
              <SessionCard key={s.id} session={s} statusColor="muted" muted
                actions={
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 flex-1 rounded-lg"
                    onClick={() => router.push(`/professor/sessions/${s.id}`)}>
                    Marquages <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                }
              />
            ))}
          </div>
        </section>
      )}

      {availableSlots.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <h2 className="text-lg font-semibold text-[#1a1a2e]">À démarrer</h2>
            <Badge variant="secondary" className="text-[10px] font-mono bg-blue-500/10 text-blue-600 border-none">{availableSlots.length}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {availableSlots.map((slot) => (
              <Card key={slot.id} className="border-blue-200/50 border-dashed overflow-hidden bg-white">
                <div className="h-0.5 bg-gradient-to-r from-blue-300 to-blue-400" />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-[#6d28d9]" />
                    <h3 className="font-semibold text-sm text-[#1a1a2e]">{slot.moduleName}</h3>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{slot.starttime} — {slot.endtime}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{slot.roomName}</span>
                    <span className="flex items-center gap-1.5"><Users className="h-3 w-3" />{slot.groupName}</span>
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs gap-1.5 rounded-lg font-semibold text-white shadow-sm shadow-[#f97316]/20 hover:shadow-md hover:shadow-[#f97316]/30" style={{ background: "linear-gradient(135deg, #f97316, #6d28d9)" }} disabled={actingId === "new"}
                    onClick={() => handleStart(undefined, slot)}>
                    {actingId === "new" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                    Démarrer la séance
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {pastSessions.length > 0 && !active.length && !availableSlots.length && completedToday.length === 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-[#64748b]" />
            <h2 className="text-lg font-semibold text-[#64748b]">Séances récentes</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pastSessions.map((s) => (
              <SessionCard key={s.id} session={s} statusColor="muted" muted
                actions={
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 flex-1 rounded-lg"
                    onClick={() => router.push(`/professor/sessions/${s.id}`)}>
                    Détails <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                }
              />
            ))}
          </div>
        </section>
      )}

      {!hasContent && (
        <EmptyState
          pose="reflexion"
          title="Aucune séance aujourd'hui"
          hint="Votre emploi du temps est vide pour aujourd'hui"
        />
      )}

      {sessions.length > 3 && (
        <div className="flex justify-center">
          <Button variant="outline" className="gap-2 rounded-xl border-[#6d28d9]/15 text-[#6d28d9] hover:bg-[#6d28d9]/5" onClick={() => router.push("/professor/history")}>
            <History className="h-4 w-4" />
            Voir tout l&apos;historique
          </Button>
        </div>
      )}

      <Dialog open={!!closeTarget} onOpenChange={(o) => { if (!o) setCloseTarget(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Square className="h-5 w-5 text-[#f97316]" />
              Clôturer la séance
            </DialogTitle>
            <DialogDescription>
              {closeTarget && (
                <div className="space-y-2">
                  <p><strong>{closeTarget.moduleName}</strong> — {closeTarget.starttime} à {closeTarget.endtime}</p>
                  <p className="text-sm text-[#64748b]">
                    Présents : {closeTarget.presentcount} · Absents : {closeTarget.absentcount}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseTarget(null)} className="rounded-lg">Annuler</Button>
            <Button variant="destructive" onClick={handleClose} disabled={closing} className="rounded-lg">
              {closing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer la clôture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value, color, iconColor }: {
  icon: React.ReactNode; label: string; value: number; color: string; iconColor: string;
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

function SessionCard({ session, actions, muted, statusColor }: {
  session: SessionRow; actions: React.ReactNode; muted?: boolean; statusColor: string;
}) {
  const barColor: Record<string, string> = {
    emerald: "bg-emerald-500", muted: "bg-muted-foreground/30",
  };
  return (
    <Card className={cn("border border-[#6d28d9]/[0.06] bg-white overflow-hidden transition-all hover:shadow-md hover:shadow-[#6d28d9]/[0.04]", muted && "opacity-70")}>
      <div className={cn("h-0.5", barColor[statusColor] ?? "bg-muted-foreground/30")} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 text-[#6d28d9]" />
              <h3 className="font-semibold text-sm text-[#1a1a2e] truncate">{session.moduleName}</h3>
            </div>
          </div>
          <SessionStatusBadge status={session.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
          <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{session.starttime} — {session.endtime}</span>
          <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{session.roomName}</span>
          <span className="flex items-center gap-1.5"><Users className="h-3 w-3" />{session.groupName}</span>
        </div>
        <div className="pt-1">{actions}</div>
      </CardContent>
    </Card>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase() ?? "";
  const styles: Record<string, string> = {
    active: "bg-[#f97316]/10 text-[#f97316] border-none",
    scheduled: "bg-[#f8f9fc] text-[#64748b] border-none",
    completed: "bg-[#6d28d9]/10 text-[#6d28d9] border-none",
    cancelled: "bg-red-500/10 text-red-600 border-red-200",
  };
  const labels: Record<string, string> = {
    active: "En cours", scheduled: "Planifié", completed: "Terminé", cancelled: "Annulé",
  };
  return <Badge variant="outline" className={cn("text-[10px] rounded-full", styles[key] ?? "")}>{labels[key] ?? status}</Badge>;
}
