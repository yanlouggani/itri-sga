import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, GraduationCap, Calendar } from "lucide-react";
import { getWeekStart, getWeekEnd, getEffectiveForWeek } from "@/lib/week";

const DAYS = [
  { value: 0, label: "Dim" }, { value: 1, label: "Lun" },
  { value: 2, label: "Mar" }, { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" }, { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
];

export default async function StudentTimetablePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "student") redirect(profile?.role === "admin" ? "/dashboard" : "/professor/dashboard");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("groupid, groups!inner(name, moduleid, modules(name))")
    .eq("studentid", user.id);

  const groupids = enrollments?.map((e: { groupid: string }) => e.groupid) ?? [];
  const groupArr = enrollments?.[0]?.groups as Record<string, unknown> | undefined;
  const groupName = (groupArr?.name as string) ?? "";
  const today = new Date().toISOString().slice(0, 10);

  const { data: timeSlots } = await supabase
    .from("time_slots")
    .select("*")
    .order("orderindex");

  const { data: allEntries } = groupids.length > 0 ? await supabase
    .from("weekly_entries")
    .select("*")
    .in("groupid", groupids) : { data: null };

  const ws = getWeekStart(new Date());
  const we = getWeekEnd(new Date());
  const weekStart = ws;

  const effectiveSchedule = (groupids.flatMap((gid: string) => {
    const eff = getEffectiveForWeek(allEntries ?? [], gid, weekStart);
    return eff.map((e) => {
      const groupInfo = enrollments?.find((enr: { groupid: string; groups: unknown }) => enr.groupid === gid)?.groups as Record<string, unknown> | undefined;
      const modInfo = groupInfo?.modules as Record<string, unknown> | undefined;
      return {
        id: e.id, dayofweek: e.dayofweek, starttime: e.starttime, endtime: e.endtime,
        moduleName: modInfo?.name as string ?? "",
        roomName: "", groupName: groupInfo?.name as string ?? "",
      };
    });
  }) ?? []);

  const roomsMap: Record<string, string> = {};
  if (effectiveSchedule.length > 0) {
    const roomIds = [...new Set((allEntries ?? []).map((e) => e.roomid))];
    if (roomIds.length > 0) {
      const { data: rooms } = await supabase.from("rooms").select("id, name").in("id", roomIds);
      if (rooms) for (const r of rooms) roomsMap[r.id] = r.name;
    }
  }

  for (const e of effectiveSchedule) {
    const entry = (allEntries ?? []).find((ae) => ae.id === e.id);
    if (entry) e.roomName = roomsMap[entry.roomid] ?? "";
  }

  const sessionsQuery = groupids.length > 0 ? supabase
    .from("sessions")
    .select("*, modules(name), rooms(name), groups!inner(name)")
    .in("groupid", groupids)
    .gte("sessiondate", ws)
    .lte("sessiondate", we)
    .order("sessiondate").order("starttime") : null;

  const { data: realSessions } = sessionsQuery ? await sessionsQuery : { data: null };

  const sessionMap: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const s of (realSessions ?? []) as Record<string, unknown>[]) {
    const d = s.sessiondate as string;
    const t = s.starttime as string;
    if (!sessionMap[d]) sessionMap[d] = {};
    sessionMap[d][t] = s;
  }

  const todayDow = new Date().getDay();
  const timeSlotMap = Object.fromEntries((timeSlots ?? []).map((ts) => [ts.starttime, ts]));

  const allStartTimes = [...new Set([
    ...effectiveSchedule.map((e) => e.starttime),
    ...Object.values(sessionMap).flatMap((d) => Object.keys(d)),
  ])].sort();

  const weekDates = DAYS.map((day) => {
    const d = new Date(weekStart + "T00:00:00");
    const targetDow = day.value === 0 ? 0 : day.value;
    const diff = targetDow - d.getDay();
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  });

  const moduleColor = (moduleName: string) => {
    let hash = 0;
    for (let i = 0; i < moduleName.length; i++) hash = ((hash << 5) - hash) + moduleName.charCodeAt(i);
    const colors = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];
    return colors[Math.abs(hash) % colors.length];
  };

  const weekEnd = new Date(weekStart + "T00:00:00");
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emploi du temps</h1>
          <p className="text-muted-foreground">
            {groupName || "Mon groupe"}
            {groupids.length === 0 && " — Aucun groupe assigné"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>du {new Date(weekStart + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })} au {weekEnd.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>

      {groupids.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Users className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Aucun groupe assigné</p>
            <p className="text-sm text-muted-foreground">Contactez votre administration pour être rattaché à un groupe.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-auto border rounded-lg">
          <div className="min-w-[900px]">
            <div className="grid" style={{ gridTemplateColumns: `100px repeat(${DAYS.length}, 1fr)` }}>
              <div className="sticky left-0 bg-background z-10 border-r border-b p-3 font-semibold text-sm text-muted-foreground">Créneau</div>
              {DAYS.map((day, i) => {
                const dateStr = weekDates[i];
                const dateDisplay = new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric" });
                const isToday = day.value === todayDow;
                return (
                  <div key={day.value} className={`border-r border-b p-3 font-semibold text-sm text-center last:border-r-0 ${isToday ? "bg-primary/5" : "bg-muted/30"}`}>
                    {day.label}
                    <span className={`block text-xs ${isToday ? "text-primary" : "text-muted-foreground"}`}>{dateDisplay}</span>
                  </div>
                );
              })}

              {allStartTimes.length === 0 ? (
                <div className="col-span-full p-10 text-center text-muted-foreground">Aucune séance cette semaine</div>
              ) : (
                allStartTimes.map((starttime) => {
                  const slot = timeSlotMap[starttime];
                  return (
                    <div key={starttime} className="contents">
                      <div className="sticky left-0 bg-background z-10 border-r border-b p-3 text-sm text-muted-foreground whitespace-nowrap flex items-center gap-1.5">
                        <Clock className="h-4 w-4 shrink-0" />
                        {slot?.label ?? starttime}
                      </div>
                      {DAYS.map((day, i) => {
                        const dateStr = weekDates[i];
                        const schedEntry = effectiveSchedule.find((e) => e.dayofweek === day.value && e.starttime === starttime);
                        const realSession = sessionMap[dateStr]?.[starttime] as Record<string, unknown> | undefined;

                        const isSession = !!realSession;
                        const entry = isSession ? realSession : schedEntry;
                        const isCancelled = isSession && ((realSession?.status as string) ?? "").toLowerCase() === "cancelled";

                        if (!entry) {
                          return <div key={`${day.value}-${starttime}`} className="border-r border-b last:border-r-0" />;
                        }

                        const mod = isSession
                          ? ((realSession?.modules as Record<string, unknown> | null)?.name as string ?? "")
                          : (schedEntry?.moduleName ?? "");
                        const room = isSession
                          ? ((realSession?.rooms as Record<string, unknown> | null)?.name as string ?? "")
                          : (schedEntry?.roomName ?? "");
                        const grp = isSession
                          ? ((realSession?.groups as Record<string, unknown> | null)?.name as string ?? "")
                          : (schedEntry?.groupName ?? "");

                        return (
                          <div
                            key={`${day.value}-${starttime}`}
                            className={`border-r border-b p-2 min-h-[110px] last:border-r-0 transition-colors ${isCancelled ? "opacity-50" : ""}`}
                          >
                            <div className={`h-full flex flex-col gap-1 p-1.5 rounded ${isCancelled ? "bg-red-50/40" : ""}`}
                              style={!isCancelled ? { borderLeft: `4px solid ${moduleColor(mod)}`, backgroundColor: `${moduleColor(mod)}08` } : {}}>
                              <div className="flex items-start justify-between gap-1">
                                <span className={`text-sm font-semibold leading-tight line-clamp-2 flex-1 ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
                                  {mod}
                                </span>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {isCancelled && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-red-600 border-red-200 bg-red-50">Annulé</Badge>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{room}</span>
                              </div>
                              {grp && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Users className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{grp}</span>
                                </div>
                              )}
                              {isSession && !isCancelled && (() => {
                                const st = (realSession?.status as string ?? "").toLowerCase();
                                if (st !== "active" && st !== "completed") return null;
                                return (
                                  <div className="mt-auto pt-0.5">
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${
                                      st === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-blue-500/10 text-blue-600 border-blue-200"
                                    }`}>
                                      {st === "active" ? "En cours" : "Terminée"}
                                    </Badge>
                                  </div>
                                );
                              })()}
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
    </div>
  );
}
