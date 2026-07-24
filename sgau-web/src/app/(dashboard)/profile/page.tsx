import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Shield, UserCheck, User, CalendarDays } from "lucide-react";

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profil</h1>
        <p className="text-muted-foreground">Vos informations personnelles</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center py-8">
          <Avatar className="h-24 w-24 mb-4 shadow-lg">
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold">{profile.firstname} {profile.lastname}</h2>
          <Badge variant="secondary" className="mt-2 gap-1.5">
            <RoleIcon className="h-3.5 w-3.5" />
            {roleLabel}
          </Badge>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Détails</CardTitle>
          <CardDescription>Informations de votre compte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Membre depuis</p>
              <p className="font-medium">
                {profile.createdat
                  ? new Date(profile.createdat).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>
          {groupNames.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Groupe(s)</p>
                <p className="font-medium">{groupNames.join(", ")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
