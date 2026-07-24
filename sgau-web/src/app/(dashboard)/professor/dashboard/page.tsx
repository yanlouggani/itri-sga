"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Square, Loader2, ChevronRight, Sparkles, History,
} from "lucide-react";
import { toast } from "sonner";
import { getWeekStart, getEffectiveForWeek } from "@/lib/week";
import { uuid } from "@/lib/uuid";
import type { WeeklyEntry } from "@/types/database";

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
  const todayDow = now.getDay();

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

      const [entriesRes, groupsRes] = await Promise.all([
        supabase.from("weekly_entries").select("*").in("groupid", gids),
        supabase.from("groups").select("id, name, modules(name)").in("id", gids),
      ]);

      const groupMap: Record<string, { name: string; moduleName: string }> = {};
      if (groupsRes.data) {
        for (const g of groupsRes.data as Record<string, unknown>[]) {
          const mod = g.modules as Record<string, unknown> | null;
          groupMap[g.id as string] = {
            name: g.name as string,
            moduleName: mod?.name as string ?? "",
          };
        }
      }

      const ws = getWeekStart(new Date());
      const entries = entriesRes.data as WeeklyEntry[] ?? [];

      const roomsMap: Record<string, string> = {};
      const roomIds = [...new Set(entries.map((e) => e.roomid).filter(Boolean))];
      if (roomIds.length > 0) {
        const { data: rooms } = await supabase.from("rooms").select("id, name").in("id", roomIds);
        if (rooms) for (const r of rooms) roomsMap[r.id] = r.name;
      }

      const slots: ScheduleRow[] = [];
      for (const gid of gids) {
        const eff = getEffectiveForWeek(entries, gid, ws);
        const myEntries = eff.filter((e) => e.professorid === user.id && e.dayofweek === todayDow);
        const g = groupMap[gid];
        for (const e of myEntries) {
          slots.push({
            id: e.id,
            starttime: e.starttime,
            endtime: e.endtime,
            moduleName: g?.moduleName ?? "",
            groupName: g?.name ?? "",
            roomName: roomsMap[e.roomid] ?? "",
            groupid: e.groupid,
            professorid: e.professorid,
            roomid: e.roomid,
          });
        }
      }
      setTodaySlots(slots);

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
  }, []);

  useEffect(() => {
    let mounted = true;
    load();
    const i = setInterval(() => { if (mounted) load(); }, 10000);
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
            session_date: today,
            start_time: entry.starttime,
            end_time: entry.endtime,
            status: "ACTIVE",
            total_students: enrollCount ?? 0,
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

  const hasSessionAt = (t: string) => todaySessions.some((s) => s.starttime === t);
  const availableSlots = todaySlots.filter((s) => !hasSessionAt(s.starttime));

  const pastSessions = completedAll.filter((s) => s.sessiondate !== today).slice(0, 6);
  const hasContent = active.length > 0 || todaySessions.length > 0 || todaySlots.length > 0;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{DAYS[now.getDay()]} {now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          <h1 className="text-3xl font-bold tracking-tight mt-0.5">
            {now.getHours() < 12 ? "Bonjour" : now.getHours() < 18 ? "Bon après-midi" : "Bonsoir"}{profile ? `, ${profile.firstname}` : ""}
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>{todaySlots.length} créneau{todaySlots.length > 1 ? "x" : ""} aujourd&apos;hui</span>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Aujourd'hui" value={todaySlots.length} />
        <StatCard icon={<PlayCircle className="h-5 w-5" />} label="En cours" value={active.length} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Étudiants" value={todaySessions.reduce((s, x) => s + x.totalstudents, 0)} />
        <StatCard icon={<History className="h-5 w-5" />} label="Terminées" value={completedToday.length} />
      </div>

      {active.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-semibold">En cours</h2>
            <Badge variant="secondary" className="text-[10px] font-mono">{active.length}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((s) => (
              <SessionCard key={s.id} session={s} statusColor="emerald"
                actions={
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="default" className="h-8 text-xs gap-1.5 flex-1"
                      onClick={() => router.push(`/professor/sessions/${s.id}`)}>
                      <Users className="h-3.5 w-3.5" />Gérer
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
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
            <h2 className="text-lg font-semibold">Terminées aujourd&apos;hui</h2>
            <Badge variant="secondary" className="text-[10px] font-mono">{completedToday.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {completedToday.map((s) => (
              <SessionCard key={s.id} session={s} statusColor="muted" muted
                actions={
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 flex-1"
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
            <h2 className="text-lg font-semibold">À démarrer</h2>
            <Badge variant="secondary" className="text-[10px] font-mono">{availableSlots.length}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {availableSlots.map((slot) => (
              <Card key={slot.id} className="border-blue-200/50 border-dashed overflow-hidden">
                <div className="h-0.5 bg-blue-300" />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{slot.moduleName}</h3>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{slot.starttime} — {slot.endtime}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{slot.roomName}</span>
                    <span className="flex items-center gap-1.5"><Users className="h-3 w-3" />{slot.groupName}</span>
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs gap-1.5" disabled={actingId === "new"}
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
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-muted-foreground">Séances récentes</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pastSessions.map((s) => (
              <SessionCard key={s.id} session={s} statusColor="muted" muted
                actions={
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 flex-1"
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
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="rounded-full bg-muted p-4 mb-5">
              <CalendarDays className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <p className="text-xl font-semibold text-muted-foreground mb-1">Aucune séance aujourd&apos;hui</p>
            <p className="text-sm text-muted-foreground/60">Votre emploi du temps est vide pour aujourd&apos;hui</p>
          </CardContent>
        </Card>
      )}

      {sessions.length > 3 && (
        <div className="flex justify-center">
          <Button variant="outline" className="gap-2" onClick={() => router.push("/professor/history")}>
            <History className="h-4 w-4" />
            Voir tout l&apos;historique
          </Button>
        </div>
      )}

      <Dialog open={!!closeTarget} onOpenChange={(o) => { if (!o) setCloseTarget(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Square className="h-5 w-5 text-destructive" />
              Clôturer la séance
            </DialogTitle>
            <DialogDescription>
              {closeTarget && (
                <div className="space-y-2">
                  <p><strong>{closeTarget.moduleName}</strong> — {closeTarget.starttime} à {closeTarget.endtime}</p>
                  <p className="text-sm text-muted-foreground">
                    Présents : {closeTarget.presentcount} · Absents : {closeTarget.absentcount}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleClose} disabled={closing}>
              {closing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer la clôture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value }: {
  icon: React.ReactNode; label: string; value: number;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
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
    <Card className={cn("border-border/50 overflow-hidden transition-all hover:shadow-sm", muted && "opacity-70")}>
      <div className={cn("h-0.5", barColor[statusColor] ?? "bg-muted-foreground/30")} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{session.moduleName}</h3>
            </div>
          </div>
          <SessionStatusBadge status={session.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
    active: "bg-primary/10 text-primary",
    scheduled: "bg-muted text-muted-foreground",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-red-500/10 text-red-600 border-red-200",
  };
  const labels: Record<string, string> = {
    active: "En cours", scheduled: "Planifié", completed: "Terminé", cancelled: "Annulé",
  };
  return <Badge variant="outline" className={cn("text-[10px]", styles[key] ?? "")}>{labels[key] ?? status}</Badge>;
}
