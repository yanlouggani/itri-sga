import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScheduleManagement } from "@/components/admin/schedule-management";
import { getWeekStart } from "@/lib/week";
import type { WeeklyEntry } from "@/types/database";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: entries } = await supabase
    .from("weekly_entries")
    .select("id, groupid, week_start, dayofweek, starttime, endtime, professorid, roomid")
    .order("week_start", { ascending: false })
    .order("dayofweek")
    .order("starttime");

  const { data: rooms } = await supabase.from("rooms").select("*").eq("isactive", true).order("name");
  const { data: groups } = await supabase.from("groups").select("id, name, moduleid, modules(name)").eq("isactive", true).order("name");
  const { data: professors } = await supabase
    .from("users")
    .select("id, firstname, lastname")
    .eq("role", "professor")
    .eq("isactive", true)
    .order("lastname");

  const groupMap = Object.fromEntries((groups ?? []).map((g: Record<string, unknown>) => [g.id, g.name]));
  const groupModuleMap = Object.fromEntries((groups ?? []).map((g: Record<string, unknown>) => [g.id, { moduleid: g.moduleid, moduleName: (g.modules as Record<string, unknown>)?.["name"] ?? "" }]));

  const formattedEntries: WeeklyEntry[] = (entries ?? []).map((e: Record<string, unknown>) => {
    const gid = e.groupid as string;
    const mod = groupModuleMap[gid] ?? { moduleid: "", moduleName: "" };
    return {
      id: e.id as string,
      groupid: gid,
      week_start: e.week_start as string,
      dayofweek: e.dayofweek as number,
      starttime: e.starttime as string,
      endtime: e.endtime as string,
      professorid: e.professorid as string,
      professorName: "",
      roomid: e.roomid as string,
      roomName: "",
      groupName: groupMap[gid] ?? null,
      moduleName: mod.moduleName,
    };
  });

  const modifiedWeeks = [...new Set(formattedEntries.map((e) => e.week_start))].sort();

  const professorsMapped = (professors ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: `${p.firstname as string} ${p.lastname as string}`,
  }));

  const formattedGroups = (groups ?? []).map((g: Record<string, unknown>) => ({
    id: g.id as string,
    name: g.name as string,
    moduleid: g.moduleid as string,
    moduleName: ((g.modules as Record<string, unknown>)?.["name"] as string) ?? "",
  }));

  return (
    <ScheduleManagement
      initialEntries={formattedEntries}
      modifiedWeeks={modifiedWeeks}
      rooms={rooms ?? []}
      groups={formattedGroups}
      professors={professorsMapped}
    />
  );
}
