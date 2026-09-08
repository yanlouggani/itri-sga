import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, Calendar } from "lucide-react";
import { getWeekStart, getWeekEnd, normalizeTime, toLocalDateStr } from "@/lib/session-masters";
import { Mascot } from "@/components/mascot/Mascot";
import { EmptyState } from "@/components/mascot/EmptyState";

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

  const { data: timeSlots } = await supabase
    .from("time_slots")
    .select("*")
    .order("orderindex");

  const ws = getWeekStart(new Date());
  const we = getWeekEnd(new Date());
  const weekStart = ws;

  const { data: projected } = await supabase.rpc("project_week", {
    p_week_start: weekStart,
    p_groupid: null,
  });

  const effectiveSchedule = ((projected as Array<Record<string, unknown>> | null) ?? []).map((o) => {
    const date = o.occurrenceDate as string;
    return {
      id: o.id as string,
      dayofweek: new Date(date + "T00:00:00").getDay(),
      starttime: normalizeTime(o.startTime as string),
      endtime: normalizeTime(o.endTime as string),
      moduleName: (o.moduleName as string) ?? "",
      roomName: (o.roomName as string) ?? "",
      groupName: (o.groupName as string) ?? "",
    };
  });

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
    const t = normalizeTime(s.starttime as string);
    if (!sessionMap[d]) sessionMap[d] = {};
    sessionMap[d][t] = s;
  }

  const todayDow = new Date().getDay();
  const timeSlotMap = Object.fromEntries((timeSlots ?? []).map((ts) => [normalizeTime(ts.starttime), ts]));

  const allStartTimes = [...new Set([
    ...effectiveSchedule.map((e) => e.starttime),
    ...Object.values(sessionMap).flatMap((d) => Object.keys(d)),
  ])].sort();

  const weekDates = DAYS.map((day) => {
    const d = new Date(weekStart + "T00:00:00");
    const targetDow = day.value === 0 ? 0 : day.value;
    const diff = targetDow - d.getDay();
    d.setDate(d.getDate() + diff);
    return toLocalDateStr(d);
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
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-[#6d28d9]/10 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#1a1a2e]">Mon Emploi du Temps</h1>
          <p className="text-xs font-semibold text-[#64748b] mt-0.5">
            {groupName || "Mon groupe"}
            {groupids.length === 0 && " — Aucun groupe assigné"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-extrabold text-[#1a1a2e] rounded-2xl border border-[#6d28d9]/10 bg-[#f8f9fc] px-3.5 py-2">
          <Calendar className="h-4 w-4 text-[#6d28d9]" />
          <span>du {new Date(weekStart + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })} au {weekEnd.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>

      {groupids.length === 0 ? (
        <EmptyState
          pose="reflexion"
          title="Aucun groupe assigné"
          hint="Contactez votre administration pour être rattaché à un groupe."
        />
      ) : (
        <>
        <div className="flex items-center gap-3 rounded-2xl border border-[#6d28d9]/15 bg-white p-4 shadow-xs">
          <Mascot pose="eureka" size="sm" animate={false} />
          <p className="text-xs font-semibold text-[#64748b]">
            <strong className="text-[#6d28d9]">Astuce :</strong>{" "}
            les créneaux colorés viennent de votre emploi du temps hebdomadaire.
            Retrouvez-y vos cours, salles et groupes de la semaine.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#6d28d9]/10 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[#6d28d9]/10 bg-[#f8f9fc]">
                  <th className="sticky left-0 z-20 bg-[#f8f9fc] p-3.5 text-xs font-extrabold text-[#6d28d9] border-r border-[#6d28d9]/10">Créneau</th>
                  {DAYS.map((day, i) => {
                    const dateStr = weekDates[i];
                    const dateDisplay = new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                    const isToday = day.value === todayDow;
                    return (
                      <th key={day.value} className="p-3 text-center border-r border-[#6d28d9]/10 last:border-r-0">
                        <div className={`inline-flex rounded-xl px-3.5 py-1 border ${isToday ? "bg-[#6d28d9] text-white border-none shadow-xs font-extrabold" : "bg-white border-[#6d28d9]/10 text-[#1a1a2e] font-bold"}`}>
                          <span>{day.label}</span>
                          <span className={`ml-1.5 ${isToday ? "text-white/80" : "text-[#64748b]"}`}>{dateDisplay}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {allStartTimes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8">
                      <EmptyState
                        compact
                        pose="reflexion"
                        title="Aucune séance cette semaine"
                        hint="Votre emploi du temps sera mis à jour dès qu'un créneau est planifié."
                      />
                    </td>
                  </tr>
                ) : (
                  allStartTimes.map((starttime) => {
                    const slot = timeSlotMap[starttime];
                    return (
                      <tr key={starttime} className="border-t border-[#6d28d9]/5">
                        <td className="sticky left-0 z-10 bg-white p-3 text-xs font-bold text-[#64748b] border-r border-[#6d28d9]/10">
                          <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#f3f0ff] px-2.5 py-1 text-[#6d28d9]">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>{slot?.label ?? starttime}</span>
                          </div>
                        </td>
                        {DAYS.map((day, i) => {
                          const dateStr = weekDates[i];
                          const schedEntry = effectiveSchedule.find((e) => e.dayofweek === day.value && e.starttime === starttime);
                          const realSession = sessionMap[dateStr]?.[starttime] as Record<string, unknown> | undefined;

                          const isSession = !!realSession;
                          const entry = isSession ? realSession : schedEntry;
                          const isCancelled = isSession && ((realSession?.status as string) ?? "").toLowerCase() === "cancelled";

                          if (!entry) {
                            return <td key={`${day.value}-${starttime}`} className="p-2 border-r border-[#6d28d9]/10 last:border-r-0 min-h-[110px]" />;
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
                            <td
                              key={`${day.value}-${starttime}`}
                              className="p-2 align-top border-r border-[#6d28d9]/10 last:border-r-0 min-h-[110px]"
                            >
                              <div
                                className={`group relative flex h-full min-h-[95px] flex-col justify-between rounded-2xl p-3 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md border border-black/5 ${
                                  isCancelled ? "opacity-50" : ""
                                }`}
                                style={!isCancelled ? { borderLeft: `5px solid ${moduleColor(mod)}`, backgroundColor: `${moduleColor(mod)}10` } : { backgroundColor: "#fef2f2" }}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between gap-1">
                                    <span className={`text-xs font-extrabold text-[#1a1a2e] line-clamp-2 ${isCancelled ? "line-through text-[#64748b]" : ""}`}>
                                      {mod}
                                    </span>
                                    {isCancelled && <Badge className="bg-red-500/10 text-red-600 text-[9px] font-extrabold border-none">Annulé</Badge>}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b]">
                                    <MapPin className="h-3.5 w-3.5 text-[#f97316] shrink-0" />
                                    <span className="truncate">{room}</span>
                                  </div>
                                  {grp && (
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b]">
                                      <Users className="h-3.5 w-3.5 text-[#6d28d9] shrink-0" />
                                      <span className="truncate">{grp}</span>
                                    </div>
                                  )}
                                </div>
                                {isSession && !isCancelled && (() => {
                                  const st = (realSession?.status as string ?? "").toLowerCase();
                                  if (st !== "active" && st !== "completed") return null;
                                  return (
                                    <div className="mt-2 pt-1.5 border-t border-black/5">
                                      <Badge className={`text-[9px] font-extrabold border-none ${
                                        st === "active" ? "bg-emerald-500/10 text-emerald-600 animate-pulse" : "bg-[#6d28d9]/10 text-[#6d28d9]"
                                      }`}>
                                        {st === "active" ? "En cours" : "Terminée"}
                                      </Badge>
                                    </div>
                                  );
                                })()}
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
        </>
      )}
    </div>
  );
}
