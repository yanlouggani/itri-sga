import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RoomsManagement } from "@/components/admin/rooms-management";

export default async function RoomsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: rooms } = await supabase.from("rooms").select("*").order("name");

  return <RoomsManagement initialRooms={rooms ?? []} />;
}
