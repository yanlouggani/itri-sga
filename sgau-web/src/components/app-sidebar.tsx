"use client";

import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Group,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Building2,
  GraduationCap,
  History,
  BarChart3,
  Layers,
  LayoutList,
  School,
  Shield,
  UserCheck,
  FileText,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Administrateurs", href: "/admin/users", icon: Shield },
  { label: "Étudiants", href: "/students", icon: GraduationCap },
  { label: "Professeurs", href: "/professors", icon: UserCheck },
  { label: "Domaines", href: "/domains", icon: LayoutList },
  { label: "Formations", href: "/modules", icon: BookOpen },
  { label: "Groupes", href: "/groups", icon: Group },
  { label: "Inscriptions", href: "/enrollments", icon: ClipboardList },
  { label: "Salles", href: "/rooms", icon: Building2 },
  { label: "Emploi du temps", href: "/schedule", icon: CalendarDays },
  { label: "Justifications", href: "/admin/justifications", icon: FileText },
];

const professorNav: NavItem[] = [
  { label: "Aujourd'hui", href: "/professor/dashboard", icon: Home },
  { label: "Emploi du temps", href: "/professor/timetable", icon: CalendarDays },
  { label: "Historique", href: "/professor/history", icon: History },
  { label: "Statistiques", href: "/professor/analytics", icon: BarChart3 },
];

const studentNav: NavItem[] = [
  { label: "Vue d'ensemble", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "Emploi du temps", href: "/student/timetable", icon: CalendarDays },
  { label: "Mes Absences", href: "/student/absences", icon: ClipboardList },
];

export function AppSidebar({
  user,
}: {
  user: { id: string; fullName: string; initials: string; role: UserRole; email: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const getNavItems = (): NavItem[] => {
    switch (user.role) {
      case "admin":
        return adminNav;
      case "professor":
        return professorNav;
      case "student":
        return studentNav;
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const roleLabel = { admin: "Administrateur", professor: "Professeur", student: "Étudiant" }[user.role];
  const roleColor = { admin: "bg-primary", professor: "bg-primary", student: "bg-primary" }[user.role];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="pb-3">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold leading-tight tracking-tight">ITRI Academy</span>
            <span className="text-[10px] text-muted-foreground">Gestion des Présences</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<a href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        isActive
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Général</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<a href="/profile" />}
                  isActive={pathname === "/profile"}
                  tooltip="Profil"
                  className={cn(
                    pathname === "/profile"
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <KeyRound className="h-4 w-4 shrink-0" />
                  <span>Profil</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 pt-2">
        <div className="flex items-center gap-3 px-2 py-1">
          <Avatar className="h-8 w-8 rounded-lg shrink-0">
            <AvatarFallback className={cn("text-[11px] font-semibold text-white", roleColor)}>
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium leading-tight truncate">{user.fullName}</span>
            <span className="text-[10px] text-muted-foreground">{roleLabel}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-destructive shrink-0 group-data-[collapsible=icon]:hidden"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
