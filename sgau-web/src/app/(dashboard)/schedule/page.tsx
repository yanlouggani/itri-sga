import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScheduleManagement } from "@/components/admin/schedule-management";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: rooms } = await supabase.from("rooms").select("id, name").eq("isactive", true).order("name");
  const { data: groups } = await supabase.from("groups").select("id, name, moduleid, modules(name)").eq("isactive", true).order("name");
  const { data: professors } = await supabase
    .from("users")
    .select("id, firstname, lastname")
    .eq("role", "professor")
    .eq("isactive", true)
    .order("lastname");

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
      rooms={rooms ?? []}
      groups={formattedGroups}
      professors={professorsMapped}
    />
  );
}
