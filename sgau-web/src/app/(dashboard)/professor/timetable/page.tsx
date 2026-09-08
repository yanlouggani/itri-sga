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
  Clock, MapPin, Users, ChevronLeft, ChevronRight, Loader2,
  PenLine, XCircle, ExternalLink, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { getWeekStart, getWeekEnd, projectWeek, normalizeTime, toLocalDateStr } from "@/lib/session-masters";
import type { SessionOccurrence } from "@/lib/session-masters";
import { uuid } from "@/lib/uuid";
import { Mascot } from "@/components/mascot/Mascot";
import { EmptyState, LoadingState } from "@/components/mascot/EmptyState";
import { useMascot } from "@/components/mascot/MascotProvider";

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
  type: "session" | "schedule"; groupid: string; roomid: string; professorid: string;
};

function isTimePast(date: string, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d < new Date();
}

export default function ProfessorTimetablePage() {
  const [occurrences, setOccurrences] = useState<SessionOccurrence[]>([]);
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [timeSlots, setTimeSlots] = useState<{ id: string; label: string; starttime: string; endtime: string; orderindex: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [actionTarget, setActionTarget] = useState<DayItem | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const mascot = useMascot();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [linksRes, slotsRes] = await Promise.all([
      supabase.from("professor_groups").select("groupid").eq("professorid", user.id),
      supabase.from("time_slots").select("*").order("orderindex"),
    ]);

    if (slotsRes.data) setTimeSlots(slotsRes.data as typeof timeSlots);

    const gids = (linksRes.data ?? []).map((r: Record<string, unknown>) => r.groupid as string);
    setGroupIds(gids);

    setLoading(false);
  }, [supabase]);

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

  useEffect(() => {
    const loadOccurrences = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await projectWeek(supabase, weekStart, null);
      if (res.ok) setOccurrences(res.data);
    };
    loadOccurrences();
  }, [weekStart, supabase]);

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
  }, [weekStart, groupIds, supabase]);

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
      return toLocalDateStr(d);
    }),
    [weekStart],
  );

  const gridData = useMemo(() => {
    const sessionByDayTime: Record<string, Record<string, Record<string, unknown>>> = {};
    for (const s of sessions) {
      const d = s.sessiondate as string;
      const t = normalizeTime(s.starttime as string);
      if (!sessionByDayTime[d]) sessionByDayTime[d] = {};
      sessionByDayTime[d][t] = s;
    }

    const allStartTimes = [...new Set([
      ...occurrences.map((o) => normalizeTime(o.startTime)),
      ...sessions.map((s) => normalizeTime(s.starttime as string)),
    ])].sort();

    const timeSlotMap = Object.fromEntries(timeSlots.map((ts) => [normalizeTime(ts.starttime), ts]));

    const dayItemsByDay: Record<number, DayItem[]> = {};
    for (const day of DAYS) {
      const dateStr = weekDates[DAYS.indexOf(day)];
      const daySessions = sessions.filter((s) => s.sessiondate === dateStr);
      const hasSessionAt = (t: string) => daySessions.some((s) => normalizeTime(s.starttime as string) === normalizeTime(t));
      const unmatched = occurrences
        .filter((o) => o.occurrenceDate === dateStr && !hasSessionAt(o.startTime))
        .map((o) => ({
          id: `sched-${o.id}`, starttime: normalizeTime(o.startTime), endtime: normalizeTime(o.endTime),
          moduleName: o.moduleName, groupName: o.groupName,
          roomName: o.roomName, status: undefined, sessiondate: o.occurrenceDate,
          dayofweek: new Date(o.occurrenceDate + "T00:00:00").getDay(),
          type: "schedule" as const, groupid: o.groupId, roomid: o.roomId, professorid: o.professorId,
        }));
      dayItemsByDay[day.value] = [
        ...daySessions.map((s) => {
          const mod = s.modules as Record<string, unknown> | null;
          const g = s.groups as Record<string, unknown> | null;
          const r = s.rooms as Record<string, unknown> | null;
          return {
            id: s.id as string, starttime: normalizeTime(s.starttime as string),
            endtime: normalizeTime(s.endtime as string),
            moduleName: mod?.name as string ?? "",
            groupName: g?.name as string ?? "",
            roomName: r?.name as string ?? "",
            status: s.status as string, sessiondate: s.sessiondate as string,
            dayofweek: day.value, type: "session" as const,
            groupid: s.groupid as string, roomid: (s.roomid as string) ?? "",
            professorid: (s.professorid as string) ?? "",
          };
        }),
        ...unmatched,
      ];
    }

    return { allStartTimes, timeSlotMap, dayItemsByDay };
  }, [occurrences, sessions, timeSlots, weekDates]);

  const handleItemClick = (item: DayItem) => {
    if (item.type === "session" && item.id) {
      router.push(`/professor/sessions/${item.id}`);
      return;
    }
    if (item.type === "schedule") {
      setActionTarget(item);
      setDialogOpen(true);
    }
  };

  const handleSaisirPresences = async (item: DayItem) => {
    setActionInProgress(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Non connecté"); return; }

      const { count: enrollCount } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("groupid", item.groupid)
        .eq("status", "active");

      const { data: session, error } = await supabase
        .from("sessions")
        .insert({
          id: uuid(),
          groupid: item.groupid,
          professorid: user.id,
          roomid: item.roomid || null,
          sessiondate: item.sessiondate,
          starttime: item.starttime,
          endtime: item.endtime,
          status: "ACTIVE",
          totalstudents: enrollCount ?? 0,
        })
        .select("id")
        .single();

      if (error) throw error;
      if (session) {
        mascot.show("validation", "Séance créée", "Vous pouvez maintenant saisir les présences.");
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
      const { count: enrollCount } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("groupid", item.groupid)
        .eq("status", "active");

      const { data: session, error } = await supabase
        .from("sessions")
        .insert({
          id: uuid(),
          groupid: item.groupid,
          professorid: item.professorid || null,
          roomid: item.roomid || null,
          sessiondate: item.sessiondate,
          starttime: item.starttime,
          endtime: item.endtime,
          status: "CANCELLED",
          totalstudents: enrollCount ?? 0,
        })
        .select("id")
        .single();

      if (error) throw error;
      mascot.show("validation", "Séance annulée", "Le créneau a été retiré de la semaine.");
      if (session) {
        setSessions((prev) => [
          ...prev,
          {
            id: session.id,
            starttime: item.starttime, endtime: item.endtime,
            moduleName: item.moduleName, groupName: item.groupName,
            roomName: item.roomName, status: "CANCELLED",
            sessiondate: item.sessiondate, groupid: item.groupid,
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

  if (loading) return <LoadingState label="Chargement de l'emploi du temps..." />;

  const totalItems = occurrences.length + sessions.length;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-[#6d28d9]/10 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#1a1a2e]">Mon Emploi du Temps</h1>
          <p className="text-xs font-semibold text-[#64748b] mt-0.5">
            {occurrences.length} créneau{occurrences.length > 1 ? "x" : ""} hebdomadaire{occurrences.length > 1 ? "s" : ""}
            {sessions.length > 0 && ` · ${sessions.length} séance${sessions.length > 1 ? "s" : ""} cette semaine`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-2xl border border-[#6d28d9]/10 bg-[#f8f9fc] p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#6d28d9]" onClick={() => shiftWeek(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[170px] px-2 text-center text-xs font-extrabold text-[#1a1a2e] flex items-center justify-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#6d28d9]" />
              {weekLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#6d28d9]" onClick={() => shiftWeek(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {!isCurrentWeek() && (
            <Button variant="outline" size="sm" className="h-10 rounded-xl border-[#6d28d9]/20 text-xs font-extrabold text-[#6d28d9] hover:bg-[#6d28d9]/10"
              onClick={() => setWeekStart(getWeekStart(new Date()))}>
              Cette semaine
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-[#6d28d9]/15 bg-white p-4 shadow-xs">
        <Mascot pose="eureka" size="sm" animate={false} />
        <p className="text-xs font-semibold text-[#64748b]">
          <strong className="text-[#6d28d9]">Astuce :</strong>{" "}
          cliquez sur un créneau pour valider la séance et saisir les présences des étudiants,
          ou ouvrez une séance existante pour la gérer.
        </p>
      </div>

      {totalItems === 0 ? (
        <EmptyState
          pose="reflexion"
          title="Aucune séance planifiée"
          hint="Contactez l'administration pour configurer votre emploi du temps"
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[#6d28d9]/10 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[#6d28d9]/10 bg-[#f8f9fc]">
                  <th className="sticky left-0 z-20 bg-[#f8f9fc] p-3.5 text-xs font-extrabold text-[#6d28d9] border-r border-[#6d28d9]/10">Créneau</th>
                  {DAYS.map((day, i) => {
                    const dateStr = weekDates[i];
                    const dateDisplay = new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                    const isTodayDay = day.value === todayDow && isCurrentWeek();
                    return (
                      <th key={day.value} className="p-3 text-center border-r border-[#6d28d9]/10 last:border-r-0">
                        <div className={`inline-flex rounded-xl px-3.5 py-1 border ${isTodayDay ? "bg-[#6d28d9] text-white border-none shadow-xs font-extrabold" : "bg-white border-[#6d28d9]/10 text-[#1a1a2e] font-bold"}`}>
                          <span>{day.label}</span>
                          <span className={`ml-1.5 ${isTodayDay ? "text-white/80" : "text-[#64748b]"}`}>{dateDisplay}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {gridData.allStartTimes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-xs font-semibold text-[#64748b]">Aucune séance cette semaine</td>
                  </tr>
                ) : (
                  gridData.allStartTimes.map((starttime) => {
                    const slot = gridData.timeSlotMap[starttime];
                    return (
                      <tr key={starttime} className="border-t border-[#6d28d9]/5">
                        <td className="sticky left-0 z-10 bg-white p-3 text-xs font-bold text-[#64748b] border-r border-[#6d28d9]/10">
                          <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#f3f0ff] px-2.5 py-1 text-[#6d28d9]">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>{slot?.label ?? starttime}</span>
                          </div>
                        </td>
                        {DAYS.map((day) => {
                          const items = gridData.dayItemsByDay[day.value]?.filter((it) => it.starttime === starttime) ?? [];
                          const item = items[0];

                          if (!item) {
                            return <td key={`${day.value}-${starttime}`} className="p-2 border-r border-[#6d28d9]/10 last:border-r-0 min-h-[110px]" />;
                          }

                          const isSession = item.type === "session";
                          const isCancelled = isSession && ((item.status ?? "").toLowerCase() === "cancelled");
                          const isSchedPast = !isSession && isTimePast(item.sessiondate, item.starttime);

                          return (
                            <td
                              key={`${day.value}-${starttime}`}
                              onClick={() => handleItemClick(item)}
                              className="p-2 align-top border-r border-[#6d28d9]/10 last:border-r-0 min-h-[110px]"
                            >
                              <div
                                className={`group relative flex h-full min-h-[95px] cursor-pointer flex-col justify-between rounded-2xl p-3 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md border border-black/5 ${
                                  isCancelled ? "opacity-50" : ""
                                }`}
                                style={!isCancelled ? { borderLeft: `5px solid ${moduleColor(item.moduleName)}`, backgroundColor: `${moduleColor(item.moduleName)}10` } : { backgroundColor: "#fef2f2" }}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between gap-1">
                                    <span className={`text-xs font-extrabold text-[#1a1a2e] line-clamp-2 ${isCancelled ? "line-through text-[#64748b]" : ""}`}>
                                      {item.moduleName}
                                    </span>
                                    {isSession && <ExternalLink className="h-3 w-3 text-[#64748b]/50 shrink-0" />}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b]">
                                    <MapPin className="h-3.5 w-3.5 text-[#f97316] shrink-0" />
                                    <span className="truncate">{item.roomName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b]">
                                    <Users className="h-3.5 w-3.5 text-[#6d28d9] shrink-0" />
                                    <span className="truncate">{item.groupName}</span>
                                  </div>
                                </div>
                                <div className="mt-2 pt-1.5 border-t border-black/5">
                                  {isSession && !isCancelled ? (
                                    <SessionStatusBadge status={item.status ?? ""} />
                                  ) : !isSession && isSchedPast ? (
                                    <Badge className="bg-amber-500/10 text-amber-700 text-[9px] font-extrabold border-none">
                                      <PenLine className="h-3 w-3 mr-0.5" /> À saisir
                                    </Badge>
                                  ) : !isSession ? (
                                    <Badge className="bg-slate-500/10 text-slate-700 text-[9px] font-extrabold border-none">
                                      Planifié
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#1a1a2e]">
              {actionTarget && isTimePast(actionTarget.sessiondate, actionTarget.starttime)
                ? "Saisir les présences"
                : "Annuler la séance"}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-[#64748b]">
              {actionTarget && (
                <>
                  <strong className="text-[#6d28d9]">{actionTarget.moduleName}</strong> — {actionTarget.starttime} à {actionTarget.endtime}
                  <br />
                  {new Date(actionTarget.sessiondate + "T00:00:00").toLocaleDateString("fr-FR", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2.5 pt-4">
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
