import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EnrollmentsManagement } from "@/components/admin/enrollments-management";

export default async function EnrollmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, users(firstname, lastname), groups(name, modules(name))")
    .order("enrolledat", { ascending: false });

  const { data: allStudents } = await supabase
    .from("users")
    .select("id, firstname, lastname")
    .eq("role", "student")
    .order("lastname");

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, modules(name)")
    .eq("isactive", true)
    .order("name");

  const formatted = (enrollments ?? []).map((e: Record<string, unknown>) => {
    const student = e.users as Record<string, unknown> | null;
    const group = e.groups as Record<string, unknown> | null;
    return {
      id: e.id as string,
      studentid: e.studentid as string,
      studentName: student ? `${student["firstname"] as string} ${student["lastname"] as string}` : "",
      groupid: e.groupid as string,
      groupName: (group?.["name"] as string) ?? "",
      moduleName: ((group?.["modules"] as Record<string, unknown>)?.["name"] as string) ?? "",
      status: e.status as "active" | "completed" | "dropped",
      enrolledat: e.enrolledat as string,
    };
  });

  const formattedStudents = (allStudents ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    firstname: s.firstname as string,
    lastname: s.lastname as string,
    fullName: `${s.firstname as string} ${s.lastname as string}`,
  }));

  const formattedGroups = (groups ?? []).map((g: Record<string, unknown>) => ({
    id: g.id as string,
    name: g.name as string,
    moduleName: ((g.modules as Record<string, unknown>)?.["name"] as string) ?? "",
  }));

  return (
    <EnrollmentsManagement
      initialEnrollments={formatted}
      students={formattedStudents}
      groups={formattedGroups}
    />
  );
}
