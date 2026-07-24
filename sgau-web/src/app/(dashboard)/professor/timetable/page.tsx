"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  Clock, MapPin, Users, ChevronLeft, ChevronRight, Loader2, CalendarDays,
  PenLine, XCircle, ExternalLink, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { getWeekStart, getWeekEnd, getEffectiveForWeek } from "@/lib/week";
import { uuid } from "@/lib/uuid";
import type { WeeklyEntry } from "@/types/database";

const DAYS = [
  { value: 0, label: "Dimanche" }, { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" }, { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" }, { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
];

type DayItem = {
  id: string; starttime: string; endtime: string;
  moduleName: string; groupName: string; roomName: string;
  status?: string; sessiondate: string; dayofweek: number;
  type: "session" | "schedule"; groupid: string; scheduleId?: string;
};

function isTimePast(date: string, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d < new Date();
}

export default function ProfessorTimetablePage() {
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [timeSlots, setTimeSlots] = useState<{ id: string; label: string; starttime: string; endtime: string; orderindex: number }[]>([]);
  const [roomMap, setRoomMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [groupMap, setGroupMap] = useState<Record<string, { name: string; moduleName: string }>>({});
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [userId, setUserId] = useState<string>("");
  const [actionTarget, setActionTarget] = useState<DayItem | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const [linksRes, slotsRes, roomsRes] = await Promise.all([
      supabase.from("professor_groups").select("groupid").eq("professorid", user.id),
      supabase.from("time_slots").select("*").order("orderindex"),
      supabase.from("rooms").select("id, name").eq("isactive", true),
    ]);

    if (slotsRes.data) setTimeSlots(slotsRes.data as typeof timeSlots);
    if (roomsRes.data) {
      const map: Record<string, string> = {};
      for (const r of roomsRes.data as Record<string, unknown>[]) map[r.id as string] = r.name as string;
      setRoomMap(map);
    }

    const gids = (linksRes.data ?? []).map((r: Record<string, unknown>) => r.groupid as string);
    setGroupIds(gids);

    if (gids.length > 0) {
      const [entriesRes, groupsRes] = await Promise.all([
        supabase.from("weekly_entries").select("*").in("groupid", gids),
        supabase.from("groups").select("id, name, modules(name)").in("id", gids),
      ]);

      if (entriesRes.data) setEntries(entriesRes.data as WeeklyEntry[]);

      if (groupsRes.data) {
        const map: Record<string, { name: string; moduleName: string }> = {};
        for (const g of groupsRes.data as Record<string, unknown>[]) {
          const mod = g.modules as Record<string, unknown> | null;
          map[g.id as string] = {
            name: g.name as string,
            moduleName: mod?.name as string ?? "",
          };
        }
        setGroupMap(map);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const effectiveEntries = useMemo(() => {
    if (!userId || groupIds.length === 0) return [];
    const result: (WeeklyEntry & { groupName?: string; moduleName?: string })[] = [];
    for (const gid of groupIds) {
      const eff = getEffectiveForWeek(entries, gid, weekStart);
      const g = groupMap[gid];
      for (const e of eff) {
        if (e.professorid !== userId) continue;
        result.push({
          ...e,
          groupName: g?.name ?? "",
          moduleName: g?.moduleName ?? "",
        });
      }
    }
    return result;
  }, [entries, groupIds, weekStart, groupMap, userId]);

  useEffect(() => {
    const loadSessions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || groupIds.length === 0) return;

      const weekEnd = getWeekEnd(weekStart);

      const { data: sessData } = await supabase
        .from("sessions")
        .select("id, sessiondate, starttime, endtime, status, moduleid, modules(name), groups!inner(name), rooms(name)")
        .eq("professorid", user.id)
        .in("groupid", groupIds)
        .gte("sessiondate", weekStart)
        .lte("sessiondate", weekEnd)
        .order("sessiondate").order("starttime");

      if (sessData) setSessions(sessData as Record<string, unknown>[]);
    };
    loadSessions();
  }, [weekStart, groupIds]);

  const shiftWeek = (dir: number) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const weekEndDate = new Date(weekStart + "T00:00:00");
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekLabel = `du ${new Date(weekStart + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })} au ${weekEndDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}`;

  const isCurrentWeek = () => getWeekStart(new Date()) === weekStart;

  const todayDow = new Date().getDay();

  const weekDates = useMemo(() =>
    DAYS.map((day) => {
      const d = new Date(weekStart + "T00:00:00");
      const targetDow = day.value === 0 ? 0 : day.value;
      const diff = targetDow - d.getDay();
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    }),
    [weekStart],
  );

  const gridData = useMemo(() => {
    const sessionByDayTime: Record<string, Record<string, Record<string, unknown>>> = {};
    for (const s of sessions) {
      const d = s.sessiondate as string;
      const t = s.starttime as string;
      if (!sessionByDayTime[d]) sessionByDayTime[d] = {};
      sessionByDayTime[d][t] = s;
    }

    const allStartTimes = [...new Set([
      ...effectiveEntries.map((e) => e.starttime),
      ...sessions.map((s) => s.starttime as string),
    ])].sort();

    const timeSlotMap = Object.fromEntries(timeSlots.map((ts) => [ts.starttime, ts]));

    const dayItemsByDay: Record<number, DayItem[]> = {};
    for (const day of DAYS) {
      const dateStr = weekDates[DAYS.indexOf(day)];
      const daySessions = sessions.filter((s) => s.sessiondate === dateStr);
      const hasSessionAt = (t: string) => daySessions.some((s) => s.starttime === t);
      const unmatched = effectiveEntries
        .filter((e) => e.dayofweek === day.value && !hasSessionAt(e.starttime))
        .map((e) => {
          const m = groupMap[e.groupid];
          return {
            id: `sched-${e.id}`, starttime: e.starttime, endtime: e.endtime,
            moduleName: m?.moduleName ?? "", groupName: m?.name ?? "",
            roomName: roomMap[e.roomid] ?? "", status: undefined, sessiondate: dateStr,
            dayofweek: day.value, type: "schedule" as const, groupid: e.groupid,
            scheduleId: e.id,
          };
        });
      dayItemsByDay[day.value] = [
        ...daySessions.map((s) => {
          const mod = s.modules as Record<string, unknown> | null;
          const g = s.groups as Record<string, unknown> | null;
          const r = s.rooms as Record<string, unknown> | null;
          return {
            id: s.id as string, starttime: s.starttime as string,
            endtime: s.endtime as string,
            moduleName: mod?.name as string ?? "",
            groupName: g?.name as string ?? "",
            roomName: r?.name as string ?? "",
            status: s.status as string, sessiondate: s.sessiondate as string,
            dayofweek: day.value, type: "session" as const,
            groupid: s.groupid as string,
          };
        }),
        ...unmatched,
      ];
    }

    return { allStartTimes, timeSlotMap, dayItemsByDay };
  }, [effectiveEntries, sessions, timeSlots, weekDates, groupMap, roomMap]);

  const handleItemClick = (item: DayItem) => {
    if (item.type === "session" && item.id) {
      router.push(`/professor/sessions/${item.id}`);
      return;
    }
    if (item.type === "schedule" && item.scheduleId) {
      setActionTarget(item);
      setDialogOpen(true);
    }
  };

  const handleSaisirPresences = async (item: DayItem) => {
    setActionInProgress(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Non connecté"); return; }

      const entry = entries.find((e) => e.id === item.scheduleId);
      if (!entry) { toast.error("Créneau introuvable"); return; }

      const { count: enrollCount } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("groupid", entry.groupid)
        .eq("status", "active");

      const { data: session, error } = await supabase
        .from("sessions")
        .insert({
          id: uuid(),
          groupid: entry.groupid,
          professorid: user.id,
          roomid: entry.roomid,
          session_date: item.sessiondate,
          start_time: entry.starttime,
          end_time: entry.endtime,
          status: "ACTIVE",
          total_students: enrollCount ?? 0,
        })
        .select("id")
        .single();

      if (error) throw error;
      if (session) {
        toast.success("Séance créée — vous pouvez maintenant saisir les présences");
        router.push(`/professor/sessions/${session.id}`);
      }
    } catch (err) {
      toast.error("Erreur", { description: String(err) });
    }
    setActionInProgress(false);
    setDialogOpen(false);
    setActionTarget(null);
  };

  const handleAnnuler = async (item: DayItem) => {
    setActionInProgress(true);
    try {
      const entry = entries.find((e) => e.id === item.scheduleId);
      if (!entry) { toast.error("Créneau introuvable"); return; }

      const { count: enrollCount } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("groupid", entry.groupid)
        .eq("status", "active");

      const { data: session, error } = await supabase
        .from("sessions")
        .insert({
          id: uuid(),
          groupid: entry.groupid,
          professorid: entry.professorid,
          roomid: entry.roomid,
          session_date: item.sessiondate,
          start_time: entry.starttime,
          end_time: entry.endtime,
          status: "CANCELLED",
          total_students: enrollCount ?? 0,
        })
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Séance annulée");
      if (session) {
        setSessions((prev) => [
          ...prev,
          {
            id: session.id,
            starttime: item.starttime, endtime: item.endtime,
            moduleName: item.moduleName, groupName: item.groupName,
            roomName: item.roomName, status: "CANCELLED",
            sessiondate: item.sessiondate, groupid: entry.groupid,
          },
        ]);
      }
    } catch (err) {
      toast.error("Erreur", { description: String(err) });
    }
    setActionInProgress(false);
    setDialogOpen(false);
    setActionTarget(null);
  };

  const moduleColor = (moduleName: string) => {
    let hash = 0;
    for (let i = 0; i < moduleName.length; i++) hash = ((hash << 5) - hash) + moduleName.charCodeAt(i);
    const colors = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );

  const totalItems = effectiveEntries.length + sessions.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emploi du temps</h1>
          <p className="text-muted-foreground">
            {effectiveEntries.length} créneau{effectiveEntries.length > 1 ? "x" : ""} hebdomadaire{effectiveEntries.length > 1 ? "s" : ""}
            {sessions.length > 0 && ` · ${sessions.length} séance${sessions.length > 1 ? "s" : ""} cette semaine`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center whitespace-nowrap flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {weekLabel}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentWeek() && (
            <Button variant="secondary" size="sm" className="h-8 text-xs"
              onClick={() => setWeekStart(getWeekStart(new Date()))}>
              Cette semaine
            </Button>
          )}
        </div>
      </div>

      {totalItems === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CalendarDays className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">Aucune séance planifiée</p>
          <p className="text-sm">Contactez l&apos;administration pour configurer votre emploi du temps</p>
        </div>
      ) : (
        <div className="overflow-auto border rounded-lg">
          <div className="min-w-[900px]">
            <div className="grid" style={{ gridTemplateColumns: `100px repeat(${DAYS.length}, 1fr)` }}>
              <div className="sticky left-0 bg-background z-10 border-r border-b p-3 font-semibold text-sm text-muted-foreground">Créneau</div>
              {DAYS.map((day, i) => {
                const dateStr = weekDates[i];
                const dateDisplay = new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric" });
                const isToday = day.value === todayDow && isCurrentWeek();
                return (
                  <div key={day.value} className={`border-r border-b p-3 font-semibold text-sm text-center last:border-r-0 ${isToday ? "bg-primary/5" : "bg-muted/30"}`}>
                    {day.label}
                    <span className={`block text-xs ${isToday ? "text-primary" : "text-muted-foreground"}`}>{dateDisplay}</span>
                  </div>
                );
              })}

              {gridData.allStartTimes.length === 0 ? (
                <div className="col-span-full p-10 text-center text-muted-foreground">Aucune séance cette semaine</div>
              ) : (
                gridData.allStartTimes.map((starttime) => {
                  const slot = gridData.timeSlotMap[starttime];
                  return (
                    <div key={starttime} className="contents">
                      <div className="sticky left-0 bg-background z-10 border-r border-b p-3 text-sm text-muted-foreground whitespace-nowrap flex items-center gap-1.5">
                        <Clock className="h-4 w-4 shrink-0" />
                        {slot?.label ?? starttime}
                      </div>
                      {DAYS.map((day, i) => {
                        const dateStr = weekDates[i];
                        const items = gridData.dayItemsByDay[day.value]?.filter((it) => it.starttime === starttime) ?? [];
                        const item = items[0];

                        if (!item) {
                          return <div key={`${day.value}-${starttime}`} className="border-r border-b last:border-r-0" />;
                        }

                        const isSession = item.type === "session";
                        const isCancelled = isSession && ((item.status ?? "").toLowerCase() === "cancelled");
                        const isSchedPast = !isSession && isTimePast(item.sessiondate, item.starttime);

                        return (
                          <div
                            key={`${day.value}-${starttime}`}
                            onClick={() => handleItemClick(item)}
                            className={`border-r border-b p-2 min-h-[110px] last:border-r-0 transition-colors cursor-pointer hover:bg-accent/30 ${isCancelled ? "opacity-50" : ""}`}
                          >
                            <div className={`h-full flex flex-col gap-1 p-1.5 rounded ${isCancelled ? "bg-red-50/40" : ""}`}
                              style={!isCancelled ? { borderLeft: `4px solid ${moduleColor(item.moduleName)}`, backgroundColor: `${moduleColor(item.moduleName)}08` } : {}}>
                              <div className="flex items-start justify-between gap-1">
                                <span className={`text-sm font-semibold leading-tight line-clamp-2 flex-1 ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
                                  {item.moduleName}
                                </span>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {isCancelled && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-red-600 border-red-200 bg-red-50">Annulé</Badge>}
                                  {isSession && <ExternalLink className="h-3 w-3 text-muted-foreground/40" />}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{item.roomName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Users className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{item.groupName}</span>
                              </div>
                              {isSession && !isCancelled ? (
                                <div className="mt-auto pt-0.5">
                                  <SessionStatusBadge status={item.status ?? ""} />
                                </div>
                              ) : !isSession && isSchedPast ? (
                                <div className="mt-auto pt-0.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-200">
                                    <PenLine className="h-3 w-3 mr-0.5" />À saisir
                                  </Badge>
                                </div>
                              ) : !isSession ? (
                                <div className="mt-auto pt-0.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-slate-500/10 text-slate-500 border-slate-200">
                                    Planifié
                                  </Badge>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {actionTarget && isTimePast(actionTarget.sessiondate, actionTarget.starttime)
                ? "Saisir les présences"
                : "Annuler la séance"}
            </DialogTitle>
            <DialogDescription>
              {actionTarget && (
                <>
                  {actionTarget.moduleName} — {actionTarget.starttime}–{actionTarget.endtime}
                  <br />
                  {new Date(actionTarget.sessiondate + "T00:00:00").toLocaleDateString("fr-FR", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); setActionTarget(null); }}>Retour</Button>
            {actionTarget && isTimePast(actionTarget.sessiondate, actionTarget.starttime) ? (
              <Button onClick={() => handleSaisirPresences(actionTarget)} disabled={actionInProgress}>
                {actionInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <PenLine className="mr-2 h-4 w-4" />Saisir les présences
              </Button>
            ) : actionTarget ? (
              <Button variant="destructive" onClick={() => handleAnnuler(actionTarget)} disabled={actionInProgress}>
                {actionInProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <XCircle className="mr-2 h-4 w-4" />Annuler la séance
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const k = status?.toLowerCase() ?? "";
  const config: Record<string, { label: string; classes: string }> = {
    active: { label: "En cours", classes: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
    completed: { label: "Terminée", classes: "bg-primary/10 text-primary" },
    cancelled: { label: "Annulée", classes: "bg-red-500/10 text-red-600 border-red-200" },
    scheduled: { label: "Planifiée", classes: "bg-muted text-muted-foreground" },
  };
  const c = config[k] ?? { label: k, classes: "bg-muted text-muted-foreground border-border" };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${c.classes} ${k === "active" ? "animate-pulse" : ""}`}>
      {c.label}
    </Badge>
  );
}
