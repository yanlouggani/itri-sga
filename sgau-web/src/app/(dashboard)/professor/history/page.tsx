"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Clock, MapPin, Users, CalendarDays, Search, Loader2, ChevronRight, GraduationCap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Session = {
  id: string; moduleName: string; groupName: string; roomName: string;
  starttime: string; endtime: string; sessiondate: string;
  status: string; sessiontype: string;
  presentcount: number; totalstudents: number;
};

export default function ProfessorHistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const supabase = createClient();
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("sessions")
        .select("*, modules(name), groups(name), rooms(name)")
        .eq("professorid", user.id)
        .order("sessiondate", { ascending: false })
        .order("starttime", { ascending: false })
        .limit(100);
      if (data) {
        setSessions((data as Record<string, unknown>[]).map((s) => ({
          id: s.id as string,
          moduleName: ((s.modules as Record<string, unknown> | null)?.name as string) ?? "",
          groupName: ((s.groups as Record<string, unknown> | null)?.name as string) ?? "",
          roomName: ((s.rooms as Record<string, unknown> | null)?.name as string) ?? "",
          starttime: s.starttime as string,
          endtime: s.endtime as string,
          sessiondate: s.sessiondate as string,
          status: s.status as string,
          sessiontype: s.sessiontype as string,
          presentcount: (s.presentcount as number) ?? 0,
          totalstudents: (s.totalstudents as number) ?? 0,
        })));
      }
    } catch (err) {
      console.error("Erreur chargement historique", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = sessions.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.moduleName.toLowerCase().includes(q) && !s.groupName.toLowerCase().includes(q)) return false;
    }
    if (statusFilter && s.status?.toLowerCase() !== statusFilter) return false;
    return true;
  });

  const grouped: Record<string, Session[]> = {};
  for (const s of filtered) {
    const key = s.sessiondate;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Chargement de l&apos;historique...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historique</h1>
        <p className="text-muted-foreground">{filtered.length} séance{filtered.length > 1 ? "s" : ""}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par module, groupe..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        {["", "completed", "active", "scheduled", "cancelled"].map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" className="h-7 text-xs"
            onClick={() => setStatusFilter(s)}>
            {s === "" ? "Tous" : s === "active" ? "En cours" : s === "completed" ? "Terminé" : s === "scheduled" ? "Planifié" : "Annulé"}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="rounded-full bg-muted p-4 mb-5">
              <CalendarDays className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <p className="text-xl font-semibold text-muted-foreground mb-1">Aucune séance trouvée</p>
            <p className="text-sm text-muted-foreground/60">{sessions.length === 0 ? "Commencez par planifier des séances" : "Essayez de modifier vos filtres"}</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([date, daySessions]) => (
          <section key={date}>
            <div className="flex items-center gap-3 mb-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground">
                {format(new Date(date + "T00:00:00"), "EEEE d MMMM yyyy", { locale: fr })}
              </h2>
              <Badge variant="secondary" className="text-[10px] font-mono">{daySessions.length}</Badge>
            </div>
            <div className="space-y-2">
              {daySessions.map((s) => (
                <Card key={s.id} className="border-border/50 overflow-hidden transition-all hover:shadow-sm cursor-pointer"
                  onClick={() => router.push(`/professor/sessions/${s.id}`)}>
                  <div className={cn("h-0.5", {
                    "bg-emerald-500": s.status?.toLowerCase() === "active",
                    "bg-blue-500": s.status?.toLowerCase() === "scheduled",
                    "bg-muted-foreground/30": s.status?.toLowerCase() === "completed",
                    "bg-red-500": s.status?.toLowerCase() === "cancelled",
                  })} />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn("rounded-lg p-2 shrink-0", {
                          "bg-emerald-500/10": s.status?.toLowerCase() === "active",
                          "bg-blue-500/10": s.status?.toLowerCase() === "scheduled",
                          "bg-muted": s.status?.toLowerCase() === "completed",
                          "bg-red-500/10": s.status?.toLowerCase() === "cancelled",
                        })}>
                          <GraduationCap className={cn("h-4 w-4", {
                            "text-emerald-600": s.status?.toLowerCase() === "active",
                            "text-blue-600": s.status?.toLowerCase() === "scheduled",
                            "text-muted-foreground": s.status?.toLowerCase() === "completed",
                            "text-red-600": s.status?.toLowerCase() === "cancelled",
                          })} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{s.moduleName}</p>
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">{s.sessiontype}</Badge>
                            <SessionLabel status={s.status} />
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.starttime}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.roomName}</span>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.groupName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {s.totalstudents > 0 && (
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold tabular-nums">{s.presentcount}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">/{s.totalstudents}</p>
                          </div>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function SessionLabel({ status }: { status: string }) {
  const k = status?.toLowerCase() ?? "";
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600",
    scheduled: "bg-blue-500/10 text-blue-600",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-red-500/10 text-red-600",
  };
  const labels: Record<string, string> = {
    active: "En cours", scheduled: "Planifié", completed: "Terminé", cancelled: "Annulé",
  };
  return <Badge variant="outline" className={cn("text-[10px]", styles[k])}>{labels[k] ?? status}</Badge>;
}
