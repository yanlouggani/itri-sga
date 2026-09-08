import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MascotProvider } from "@/components/mascot/MascotProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
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
    <MascotProvider>
      <SidebarProvider defaultOpen>
        <div className="flex h-screen w-full bg-[#f8f9fc]">
          <AppSidebar user={user} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <header className="flex h-14 items-center gap-4 border-b border-[#6d28d9]/[0.06] bg-white/80 px-6 backdrop-blur-xl">
              <SidebarTrigger className="-ml-1 size-4 text-[#6d28d9]" />
              <div className="flex-1" />
              <div className="hidden md:flex items-center gap-2 text-xs font-medium text-[#64748b] bg-[#f8f9fc] rounded-xl px-3 py-1.5 border border-[#6d28d9]/5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>ITRI Academy · En ligne</span>
              </div>
            </header>
            <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </MascotProvider>
  );
}
