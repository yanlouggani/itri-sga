import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Shield, UserCheck, User, CalendarDays } from "lucide-react";
import { MascotHeader } from "@/components/mascot/MascotHeader";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("groupid, groups!inner(name)")
    .eq("studentid", user.id);
  const groupNames = [...new Set(enrollments?.map((e: Record<string, unknown>) => (e.groups as Record<string, unknown>)?.name as string) ?? [])];

  const initials = `${(profile.firstname?.[0] ?? "").toUpperCase()}${(profile.lastname?.[0] ?? "").toUpperCase()}`;
  const roleLabel = profile.role === "admin" ? "Administrateur" : profile.role === "professor" ? "Professeur" : "Étudiant";
  const RoleIcon = profile.role === "admin" ? Shield : profile.role === "professor" ? UserCheck : User;
  const roleColor = profile.role === "admin"
    ? "bg-[#6d28d9]/10 text-[#6d28d9]"
    : profile.role === "professor"
      ? "bg-[#f97316]/10 text-[#f97316]"
      : "bg-[#0ea5e9]/10 text-[#0ea5e9]";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <MascotHeader
        title="Mon Profil"
        description="Vos informations personnelles"
        pose="bonjour"
        mascotMessage={`Bienvenue, ${profile.firstname} !`}
        badge="Espace Personnel"
      />

      <Card className="border border-[#6d28d9]/10 bg-white shadow-sm shadow-[#6d28d9]/5">
        <CardContent className="flex flex-col items-center py-8">
          <Avatar className="mb-4 h-24 w-24 shadow-lg shadow-[#6d28d9]/15 ring-4 ring-[#6d28d9]/10">
            <AvatarFallback className="text-2xl font-bold gradient-itri text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold tracking-tight text-[#1a1a2e]">
            {profile.firstname} {profile.lastname}
          </h2>
          <Badge className={`mt-2 gap-1.5 border-0 ${roleColor}`} variant="secondary">
            <RoleIcon className="h-3.5 w-3.5" />
            {roleLabel}
          </Badge>
        </CardContent>
      </Card>

      <Card className="border border-[#6d28d9]/10 bg-white shadow-sm shadow-[#6d28d9]/5">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#1a1a2e]">Détails</CardTitle>
          <CardDescription className="text-sm text-[#64748b]">Informations de votre compte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6d28d9]/10">
              <Mail className="h-5 w-5 text-[#6d28d9]" />
            </div>
            <div>
              <p className="text-sm text-[#64748b]">Email</p>
              <p className="font-medium text-[#1a1a2e]">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f97316]/10">
              <CalendarDays className="h-5 w-5 text-[#f97316]" />
            </div>
            <div>
              <p className="text-sm text-[#64748b]">Membre depuis</p>
              <p className="font-medium text-[#1a1a2e]">
                {profile.createdat
                  ? new Date(profile.createdat).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>
          {groupNames.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6d28d9]/10">
                <User className="h-5 w-5 text-[#6d28d9]" />
              </div>
              <div>
                <p className="text-sm text-[#64748b]">Groupe(s)</p>
                <p className="font-medium text-[#1a1a2e]">{groupNames.join(", ")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
