import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login");
  }

  const user = {
    id: profile.id,
    fullName: `${profile.firstname} ${profile.lastname}`,
    initials: `${(profile.firstname?.[0] ?? "").toUpperCase()}${(profile.lastname?.[0] ?? "").toUpperCase()}`,
    role: profile.role as "admin" | "professor" | "student",
    email: profile.email ?? "",
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full">
        <AppSidebar user={user} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-12 items-center gap-4 border-b border-border/40 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="-ml-1 size-4" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-auto p-4">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
