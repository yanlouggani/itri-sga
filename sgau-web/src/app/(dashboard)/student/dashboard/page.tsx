import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin, GraduationCap, AlertTriangle, CheckCircle } from "lucide-react";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");
  if (profile.role !== "student") {
    redirect(profile.role === "admin" ? "/dashboard" : "/professor/dashboard");
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("groupid, groups!inner(name)")
    .eq("studentid", user.id);

  const groupids = enrollments?.map((e: { groupid: string }) => e.groupid) ?? [];
  const groupNames = [...new Set(enrollments?.map((e: Record<string, unknown>) => (e.groups as Record<string, unknown>)?.name as string) ?? [])];

  let todaySessions: Record<string, unknown>[] = [];
  let attendanceMap: Record<string, string> = {};
  let totalAbsences = 0;
  let presentToday = 0;

  try {
    if (groupids.length > 0) {
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("*, modules(name), rooms(name)")
        .in("groupid", groupids)
        .eq("sessiondate", today)
        .order("starttime");
      if (sessionsData) todaySessions = sessionsData as Record<string, unknown>[];
    }

    const { data: attendance } = await supabase
      .from("attendance")
      .select("sessionid, status")
      .eq("studentid", user.id);

    for (const a of attendance ?? []) {
      const rec = a as Record<string, unknown>;
      attendanceMap[rec.sessionid as string] = rec.status as string;
    }

    const { count: absCount } = await supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("studentid", user.id)
      .in("status", ["absent", "late"]);
    totalAbsences = absCount ?? 0;

    if (todaySessions.length > 0) {
      const { count: presCount } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("studentid", user.id)
        .eq("status", "present")
        .in("sessionid", todaySessions.map((s) => s.id as string));
      presentToday = presCount ?? 0;
    }
  } catch (err) {
    console.error("Erreur chargement dashboard étudiant:", err);
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const statusBadge = (status: string | undefined) => {
    switch (status) {
      case "present": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">Présent</Badge>;
      case "absent": return <Badge className="bg-red-500/10 text-red-600 border-red-200 text-xs">Absent</Badge>;
      case "late": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">En retard</Badge>;
      case "justified": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs">Justifié</Badge>;
      default: return <Badge variant="outline" className="text-xs text-muted-foreground">Non marqué</Badge>;
    }
  };

  const formattedSessions = todaySessions.map((s) => ({
    id: s.id as string,
    moduleName: ((s.modules as Record<string, unknown> | null)?.name as string) ?? "",
    roomName: ((s.rooms as Record<string, unknown> | null)?.name as string) ?? "",
    starttime: s.starttime as string,
    endtime: s.endtime as string,
    sessiontype: s.sessiontype as string,
    status: s.status as string,
    attendance: attendanceMap[s.id as string],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight capitalize">{dateStr}</h1>
        <p className="text-muted-foreground">Bonjour, {profile.firstname}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Séances aujourd&apos;hui</CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{formattedSessions.length}</p></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Présent</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-emerald-600">{presentToday}</p></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absences</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-red-600">{totalAbsences}</p></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Groupe</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold truncate">{groupNames.join(", ") || "Non assigné"}</p>
          </CardContent>
        </Card>
      </div>

      {groupids.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-16 w-16 text-amber-500/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Aucun groupe assigné</p>
            <p className="text-sm text-muted-foreground">Contactez votre administration pour être rattaché à un groupe.</p>
          </CardContent>
        </Card>
      ) : formattedSessions.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarDays className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Aucune séance aujourd&apos;hui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Séances du jour</h2>
          {formattedSessions.map((session) => (
            <Card key={session.id} className="border-border/50 overflow-hidden">
              <div className="h-1 bg-primary" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">{session.moduleName}</h3>
                      <Badge variant="outline" className="text-[10px]">{session.sessiontype}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{session.starttime} — {session.endtime}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{session.roomName}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {statusBadge(session.attendance)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


    </div>
  );
}
