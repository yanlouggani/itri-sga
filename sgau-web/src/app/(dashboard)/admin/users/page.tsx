import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminsManagement } from "@/components/admin/admins-management";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: admins } = await supabase
    .from("users")
    .select("*")
    .eq("role", "admin")
    .order("lastname");

  const formatted = (admins ?? []).map((u: Record<string, unknown>) => ({
    id: u.id as string,
    email: u.email as string,
    firstname: u.firstname as string,
    lastname: u.lastname as string,
    role: "admin" as const,
    isactive: u.isactive as boolean,
    get fullName() { return `${this.firstname} ${this.lastname}`; },
    get initials() { return `${(this.firstname[0] ?? "").toUpperCase()}${(this.lastname[0] ?? "").toUpperCase()}`; },
  }));

  return <AdminsManagement initialAdmins={formatted} />;
}
