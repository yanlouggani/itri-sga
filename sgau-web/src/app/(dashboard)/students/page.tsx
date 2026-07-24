import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudentsManagement } from "@/components/admin/students-management";

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: students } = await supabase
    .from("users")
    .select("*")
    .eq("role", "student")
    .order("lastname");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, groups(name, modules(name))")
    .in("status", ["active", "completed"]);

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, modules(name)")
    .eq("isactive", true)
    .order("name");

  const enrollmentMap: Record<string, Array<{ groupid: string; groupName: string; moduleName: string; status: string }>> = {};
  for (const e of enrollments ?? []) {
    const row = e as Record<string, unknown>;
    const sid = row.studentid as string;
    const grp = row.groups as Record<string, unknown> | null;
    if (!enrollmentMap[sid]) enrollmentMap[sid] = [];
    enrollmentMap[sid].push({
      groupid: row.groupid as string,
      groupName: (grp?.["name"] as string) ?? "",
      moduleName: ((grp?.["modules"] as Record<string, unknown>)?.["name"] as string) ?? "",
      status: row.status as string,
    });
  }

  const formattedStudents = (students ?? []).map((u: Record<string, unknown>) => ({
    id: u.id as string,
    email: u.email as string,
    firstname: u.firstname as string,
    lastname: u.lastname as string,
    role: "student" as const,
    isactive: u.isactive as boolean,
    fullName: `${u.firstname as string} ${u.lastname as string}`,
    initials: `${((u.firstname as string)?.[0] ?? "").toUpperCase()}${((u.lastname as string)?.[0] ?? "").toUpperCase()}`,
    enrollments: enrollmentMap[u.id as string] ?? [],
  }));

  const formattedGroups = (groups ?? []).map((g: Record<string, unknown>) => ({
    id: g.id as string,
    name: g.name as string,
    moduleName: ((g.modules as Record<string, unknown>)?.["name"] as string) ?? "",
  }));

  return <StudentsManagement initialStudents={formattedStudents} groups={formattedGroups} />;
}
