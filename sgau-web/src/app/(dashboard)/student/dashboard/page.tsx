import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin, GraduationCap, AlertTriangle, CheckCircle } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { EmptyState } from "@/components/mascot/EmptyState";

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
  const attendanceMap: Record<string, string> = {};
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
      case "present": return <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-xs rounded-full">Présent</Badge>;
      case "absent": return <Badge className="bg-red-500/10 text-red-600 border-none text-xs rounded-full">Absent</Badge>;
      case "late": return <Badge className="bg-amber-500/10 text-amber-600 border-none text-xs rounded-full">En retard</Badge>;
      case "justified": return <Badge className="bg-blue-500/10 text-blue-600 border-none text-xs rounded-full">Justifié</Badge>;
      default: return <Badge variant="outline" className="text-xs text-[#64748b] rounded-full">Non marqué</Badge>;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] capitalize">{dateStr}</h1>
          <p className="text-sm text-[#64748b]">Bonjour, {profile.firstname}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#6d28d9]/10 bg-gradient-to-r from-[#6d28d9]/5 via-white to-[#f97316]/5 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Mascot pose={formattedSessions.length > 0 ? (presentToday === formattedSessions.length ? "celebration" : "bonjour") : "bonjour"} size="md" animate={false} />
          <div>
            <p className="text-base font-bold text-[#1a1a2e]">
              {formattedSessions.length === 0
                ? "Pas de cours aujourd'hui"
                : presentToday === formattedSessions.length
                  ? "Parfait, vous êtes au top !"
                  : `${presentToday} séance(s) marquée(s) présente`}
            </p>
            <p className="text-sm text-[#64748b]">
              {formattedSessions.length === 0
                ? "Profitez de votre temps libre, ou consultez votre emploi du temps."
                : presentToday === formattedSessions.length
                  ? `Présent(e) à toutes vos ${formattedSessions.length} séance(s) du jour.`
                  : "Continuez comme ça, la mascotte est avec vous."}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#6d28d9]/10 shadow-sm">
            <Mascot pose="eureka" size="xs" animate={false} />
            <span className="text-xs text-[#64748b]">Restez assidu(e), ça compte !</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-[#6d28d9]/[0.06] bg-white hover:shadow-lg hover:shadow-[#6d28d9]/[0.04] transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-[#64748b]">Séances aujourd&apos;hui</CardTitle>
            <div className="rounded-xl bg-[#6d28d9]/10 p-2 text-[#6d28d9]"><CalendarDays className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-[#1a1a2e]">{formattedSessions.length}</p></CardContent>
        </Card>
        <Card className="border border-[#6d28d9]/[0.06] bg-white hover:shadow-lg hover:shadow-[#6d28d9]/[0.04] transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-[#64748b]">Présent</CardTitle>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600"><CheckCircle className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-emerald-600">{presentToday}</p></CardContent>
        </Card>
        <Card className="border border-[#6d28d9]/[0.06] bg-white hover:shadow-lg hover:shadow-[#6d28d9]/[0.04] transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-[#64748b]">Absences</CardTitle>
            <div className="rounded-xl bg-red-500/10 p-2 text-red-600"><AlertTriangle className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-red-600">{totalAbsences}</p></CardContent>
        </Card>
        <Card className="border border-[#6d28d9]/[0.06] bg-white hover:shadow-lg hover:shadow-[#6d28d9]/[0.04] transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-[#64748b]">Groupe</CardTitle>
            <div className="rounded-xl bg-[#f59e0b]/10 p-2 text-[#f59e0b]"><GraduationCap className="h-4 w-4" /></div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-[#1a1a2e] truncate">{groupNames.join(", ") || "Non assigné"}</p>
          </CardContent>
        </Card>
      </div>

      {groupids.length === 0 ? (
        <EmptyState
          pose="reflexion"
          title="Aucun groupe assigné"
          hint="Contactez votre administration pour être rattaché à un groupe."
        />
      ) : formattedSessions.length === 0 ? (
        <EmptyState
          pose="bonjour"
          title="Aucune séance aujourd'hui"
          hint="Profitez de votre temps libre !"
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Séances du jour</h2>
          {formattedSessions.map((session) => (
            <Card key={session.id} className="border border-[#6d28d9]/[0.06] bg-white overflow-hidden hover:shadow-md hover:shadow-[#6d28d9]/[0.04] transition-all">
              <div className="h-1 bg-gradient-to-r from-[#f97316] to-[#6d28d9]" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-[#6d28d9]" />
                      <h3 className="font-semibold text-[#1a1a2e]">{session.moduleName}</h3>
                      <Badge variant="outline" className="text-[10px] rounded-full bg-[#6d28d9]/5 border-[#6d28d9]/10 text-[#6d28d9]">{session.sessiontype}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-[#64748b]">
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

      {formattedSessions.length > 0 && (
        <div className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-white border border-[#6d28d9]/10">
          <Mascot pose={presentToday === formattedSessions.length ? "celebration" : "bonjour"} size="sm" animate={false} />
          <span className="text-sm text-[#64748b]">
            {presentToday === formattedSessions.length && formattedSessions.length > 0
              ? <span className="font-semibold text-emerald-600">Parfait ! Vous êtes présent(e) à toutes vos séances aujourd&apos;hui.</span>
              : `Vous êtes présent(e) à ${presentToday} séance(s) aujourd'hui`}
          </span>
        </div>
      )}
    </div>
  );
}
