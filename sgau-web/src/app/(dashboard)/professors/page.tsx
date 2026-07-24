import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfessorsManagement } from "@/components/admin/professors-management";
import type { AppUser } from "@/types/database";

export default async function ProfessorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: professors } = await supabase
    .from("users")
    .select("*")
    .eq("role", "professor")
    .order("lastname");

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, moduleid, modules(name)")
    .eq("isactive", true)
    .order("name");

  const formatted: AppUser[] = (professors ?? []).map((u: Record<string, unknown>) => ({
    id: u.id as string,
    email: u.email as string,
    firstname: u.firstname as string,
    lastname: u.lastname as string,
    role: u.role as "admin" | "professor" | "student",
    isactive: u.isactive as boolean,
    identifier: (u.identifier as string) ?? null,
    get fullName() { return `${this.firstname} ${this.lastname}`; },
    get initials() { return `${(this.firstname[0] ?? "").toUpperCase()}${(this.lastname[0] ?? "").toUpperCase()}`; },
  }));

  const formattedGroups = (groups ?? []).map((g: Record<string, unknown>) => ({
    id: g.id as string,
    name: g.name as string,
    moduleid: g.moduleid as string,
    moduleName: ((g.modules as Record<string, unknown>)?.["name"] as string) ?? "",
  }));

  return (
    <ProfessorsManagement
      initialProfessors={formatted}
      groups={formattedGroups}
    />
  );
}
