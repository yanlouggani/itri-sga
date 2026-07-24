import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Activity,
  ArrowUpRight,
  Clock,
  LayoutList,
  Group,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getDashboardStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") {
    if (profile?.role === "professor") redirect("/professor/dashboard");
    else redirect("/student/dashboard");
  }

  const [
    { count: totalUsers },
    { count: totalstudents },
    { count: totalProfessors },
    { count: totalModules },
    { count: totalDomains },
    { count: totalGroups },
    { count: totalRooms },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "professor"),
    supabase.from("modules").select("*", { count: "exact", head: true }),
    supabase.from("domains").select("*", { count: "exact", head: true }),
    supabase.from("groups").select("*", { count: "exact", head: true }),
    supabase.from("rooms").select("*", { count: "exact", head: true }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const { data: todaySessions } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("sessiondate", today);

  const totalSessionsToday = todaySessions?.length ?? 0;
  const activeSessions = todaySessions?.filter((s) => s.status === "ACTIVE").length ?? 0;

  return {
    totalUsers: totalUsers ?? 0,
    totalstudents: totalstudents ?? 0,
    totalProfessors: totalProfessors ?? 0,
    totalModules: totalModules ?? 0,
    totalSections: totalDomains ?? 0,
    totalGroups: totalGroups ?? 0,
    totalRooms: totalRooms ?? 0,
    totalSessionsToday,
    activeSessionsToday: activeSessions,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    {
      title: "Utilisateurs",
      value: stats.totalUsers,
      sub: `${stats.totalstudents} étudiants · ${stats.totalProfessors} professeurs`,
      icon: Users,
    },
    {
      title: "Modules",
      value: stats.totalModules,
      sub: "Matières enseignées",
      icon: BookOpen,
    },
    {
      title: "Sections",
      value: stats.totalSections,
      sub: `${stats.totalGroups} groupe(s)`,
      icon: LayoutList,
    },
    {
      title: "Séances aujourd'hui",
      value: stats.totalSessionsToday,
      sub: `${stats.activeSessionsToday} active(s)`,
      icon: CalendarCheck,
    },
    {
      title: "Salles",
      value: stats.totalRooms,
      sub: "Espaces disponibles",
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Vue d'ensemble de l'établissement</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-border/50 transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{card.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                {stats.activeSessionsToday > 0
                  ? `${stats.activeSessionsToday} séance(s) en cours actuellement`
                  : "Aucune séance en cours"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              Répartition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Étudiants</span>
                  <span className="font-medium">
                    {((stats.totalstudents / Math.max(stats.totalUsers, 1)) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${(stats.totalstudents / Math.max(stats.totalUsers, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Professeurs</span>
                  <span className="font-medium">
                    {((stats.totalProfessors / Math.max(stats.totalUsers, 1)) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all"
                    style={{
                      width: `${(stats.totalProfessors / Math.max(stats.totalUsers, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
