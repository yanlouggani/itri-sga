"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Clock, MapPin, Users, Loader2, CheckCircle2, XCircle,
  AlertTriangle, PlayCircle, Square, ListRestart, Ban,
} from "lucide-react";
import { toast } from "sonner";

type Student = { id: string; name: string; status: string; avatar: string };
type Session = {
  id: string; moduleName: string; groupName: string; roomName: string;
  starttime: string; endtime: string; status: string; sessiontype: string;
  presentcount: number; absentcount: number; latecount: number; totalstudents: number;
  sourcemode?: string; startedAt?: string; closedAt?: string;
};

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [bulkMarking, setBulkMarking] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const populatedRef = useRef(false);

  const load = useCallback(async () => {
    try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: s } = await supabase
      .from("sessions")
      .select("*, modules(name), groups(name), rooms(name)")
      .eq("professorid", user.id)
      .eq("id", id).maybeSingle();
    if (!s) { setUnauthorized(true); setLoading(false); return; }
    const m = s.modules as Record<string, unknown> | null;
    const g = s.groups as Record<string, unknown> | null;
    const r = s.rooms as Record<string, unknown> | null;
    setSession({
      id: s.id, moduleName: m?.name as string ?? "", groupName: g?.name as string ?? "",
      roomName: r?.name as string ?? "", starttime: s.starttime as string,
      endtime: s.endtime as string, status: s.status as string,
      sessiontype: s.sessiontype as string, presentcount: s.presentcount ?? 0,
      absentcount: s.absentcount ?? 0, latecount: s.latecount ?? 0,
      totalstudents: s.totalstudents ?? 0,
      sourcemode: s.sourcemode as string | undefined,
      startedAt: s.startedat as string | undefined,
      closedAt: s.closedat as string | undefined,
    });
    const isCM = s.sessiontype === "CM";
    if (!isCM) {
      if (!populatedRef.current) {
        await supabase.rpc("populate_session_attendance", { p_session_id: id });
        populatedRef.current = true;
      }
      let attRows = (await supabase
        .from("attendance")
        .select("*, students:users!attendance_studentid_fkey(firstname, lastname)")
        .eq("sessionid", id).order("studentid")).data as Record<string, unknown>[] | null;
      if (attRows && attRows.length > 0) {
        setStudents(attRows.map((a) => {
          const st = a.students as Record<string, unknown> | null;
          return {
            id: a.studentid as string,
            name: st ? `${st.firstname ?? ""} ${st.lastname ?? ""}` : "",
            avatar: ((st?.firstname as string)?.[0] ?? "").toUpperCase(),
            status: a.status as string,
          };
        }));
      } else {
        const gId = s.groupid as string | null;
        if (gId) {
          const { data: groupStudents } = await supabase
            .from("enrollments")
            .select("studentid, users!inner(id, firstname, lastname)")
            .eq("groupid", gId)
            .eq("status", "active");
          if (groupStudents) {
            setStudents(groupStudents.map((e: Record<string, unknown>) => {
              const u = e.users as Record<string, unknown> | null;
              return {
                id: e.studentid as string,
                name: u ? `${u.firstname ?? ""} ${u.lastname ?? ""}`.trim() : "Inconnu",
                avatar: ((u?.firstname as string)?.[0] ?? "").toUpperCase(),
                status: "unmarked",
              };
            }));
          }
        }
      }
    } else {
      setStudents([]);
    }
    } catch (err) {
      toast.error("Erreur chargement session", { description: String(err) });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    load();
    const i = setInterval(() => { if (mounted) load(); }, 5000);
    return () => { mounted = false; clearInterval(i); };
  }, [load]);

  const markAttendance = async (studentid: string, status: string) => {
    const prev = students.find((st) => st.id === studentid)?.status;
    setStudents((prevList) => prevList.map((st) => st.id === studentid ? { ...st, status } : st));
    const { error } = await supabase.from("attendance").upsert({
      sessionid: id, studentid, status,
      markedby: "professor", scanmethod: "manual", markedat: new Date().toISOString(),
    });
    if (error) {
      setStudents((prevList) => prevList.map((st) => st.id === studentid ? { ...st, status: prev ?? "unmarked" } : st));
      toast.error("Erreur de marquage", { description: String(error) });
    }
  };

  const handleBulk = async (status: string) => {
    setBulkMarking(true);
    const targets = students.filter((s) => s.status === "unmarked");
    const results = await Promise.allSettled(targets.map((st) => markAttendance(st.id, status)));
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    if (succeeded === targets.length) {
      toast.success(`${targets.length} étudiant(s) marqués ${status === "present" ? "présent" : "absent"}`);
    } else {
      toast.error(`${succeeded}/${targets.length} marqués — erreur sur ${targets.length - succeeded} étudiant(s)`);
    }
    setBulkMarking(false);
  };

  const handleReset = async () => {
    const targets = students.filter((s) => s.status !== "unmarked");
    const results = await Promise.allSettled(targets.map((st) => markAttendance(st.id, "unmarked")));
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    if (succeeded === targets.length) {
      toast.success("Marquages réinitialisés");
    } else {
      toast.error(`${succeeded}/${targets.length} réinitialisés — erreur sur ${targets.length - succeeded} étudiant(s)`);
    }
  };

  const handleStart = async () => {
    setActing(true);
    try {
      const { data, error } = await supabase.rpc("start_session", { p_session_id: id });
      if (error) throw error;
      toast.success("Séance démarrée");
      if (data && data !== id) router.replace(`/professor/sessions/${data}`);
      load();
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setActing(false);
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Non connecté"); return; }
    const { error } = await supabase.from("sessions").update({ status: "CANCELLED" }).eq("id", id).eq("professorid", user.id);
      if (error) throw error;
      toast.success("Séance annulée");
      setCancelOpen(false);
      load();
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setCancelling(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );
  if (!session) return <p className="text-muted-foreground p-8">Séance introuvable</p>;

  const present = students.filter((s) => s.status === "present").length;
  const late = students.filter((s) => s.status === "late").length;
  const absent = students.filter((s) => s.status === "absent").length;
  const unmarked = students.filter((s) => s.status === "unmarked").length;
  const marked = students.length - unmarked;
  const sStatus = session.status.toLowerCase();
  const isScheduled = sStatus === "scheduled";
  const isactive = sStatus === "active";
  const isCM = session?.sessiontype === "CM";
  const canMark = sStatus !== "cancelled" && !isCM;

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Retour
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusDot status={session.status} className="h-3 w-3" />
            <h1 className="text-3xl font-bold tracking-tight">{session.moduleName}</h1>
            <Badge variant="outline" className="text-xs font-mono">{session.sessiontype}</Badge>
            <SessionStatusBadge status={session.status} />
            {session.sourcemode && (
              <SourceModeBadge mode={session.sourcemode} />
            )}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{session.starttime} — {session.endtime}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{session.roomName}</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{session.groupName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isScheduled && (
            <>
              <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4" />Annuler
              </Button>
              <Button onClick={handleStart} disabled={acting} className="gap-2">
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                Démarrer
              </Button>
            </>
          )}
          {isactive && (
            <Button variant="destructive" className="gap-2" onClick={async () => {
              try {
                const { error } = await supabase.rpc("close_session", { p_session_id: id });
                if (error) throw error;
                toast.success("Séance clôturée");
                load();
              } catch (err) { toast.error("Erreur", { description: String(err) }); }
            }}>
              <Square className="h-4 w-4" />Clôturer
            </Button>
          )}
        </div>
      </div>

      {canMark && students.length > 0 && (
        <Card className="border-border/50 overflow-hidden">
          <div className="h-1.5 bg-muted">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(marked / students.length) * 100}%` }} />
          </div>
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><strong>{present}</strong> Présents</span>
                <span className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-500" /><strong>{late}</strong> Retards</span>
                <span className="flex items-center gap-1.5"><XCircle className="h-4 w-4 text-red-500" /><strong>{absent}</strong> Absents</span>
                <span className="flex items-center gap-1.5 text-muted-foreground"><strong>{unmarked}</strong> Non marqués</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {unmarked > 0 && (
                  <>
                    <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => handleBulk("present")} disabled={bulkMarking}>
                      <CheckCircle2 className="h-3.5 w-3.5" />Tout présent
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => handleBulk("absent")} disabled={bulkMarking}>
                      <XCircle className="h-3.5 w-3.5" />Tout absent
                    </Button>
                  </>
                )}
                {marked > 0 && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-muted-foreground" onClick={handleReset}>
                    <ListRestart className="h-3.5 w-3.5" />Réinitialiser
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isCM ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-medium">CM — Pas de suivi de présence</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Les présences ne sont pas gérées pour les cours magistraux</p>
          </CardContent>
        </Card>
      ) : (
      <Card className="border-border/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Liste des étudiants</h2>
            <Badge variant="secondary" className="text-xs font-mono">{students.length}</Badge>
          </div>
          {canMark && (
            <span className="text-xs text-muted-foreground">
              {marked}/{students.length} marqués
            </span>
          )}
        </div>
        {students.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-medium">Aucun étudiant inscrit</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Les étudiants seront ajoutés automatiquement</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-border/50">
            {students.map((st) => (
              <div key={st.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8 ring-2 ring-border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/5 text-primary">
                      {st.avatar || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{st.name}</p>
                    <p className="text-xs text-muted-foreground">Étudiant</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {canMark && (
                    <>
                      <StatusPill label="P" title="Présent" active={st.status === "present"} color="emerald"
                        onClick={() => markAttendance(st.id, "present")} />
                      <StatusPill label="R" title="Retard" active={st.status === "late"} color="amber"
                        onClick={() => markAttendance(st.id, "late")} />
                      <StatusPill label="A" title="Absent" active={st.status === "absent"} color="red"
                        onClick={() => markAttendance(st.id, "absent")} />
                    </>
                  )}
                  {!canMark && (
                    <StudentStatusBadge status={st.status} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Annuler la séance
            </DialogTitle>
            <DialogDescription>
              <p><strong>{session.moduleName}</strong> — {session.starttime} à {session.endtime}</p>
              <p className="text-sm text-muted-foreground mt-2">Cette action est irréversible.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Retour</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer l&apos;annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusPill({ label, title, active, color, onClick }: {
  label: string; title: string; active: boolean; color: string; onClick: () => void;
}) {
  const colors: Record<string, { base: string; active: string }> = {
    emerald: { base: "border-emerald-200 text-emerald-600 hover:bg-emerald-500/10", active: "bg-emerald-500 text-white border-emerald-500" },
    amber: { base: "border-amber-200 text-amber-600 hover:bg-amber-500/10", active: "bg-amber-500 text-white border-amber-500" },
    red: { base: "border-red-200 text-red-600 hover:bg-red-500/10", active: "bg-red-500 text-white border-red-500" },
  };
  const c = colors[color] ?? { base: "", active: "" };
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-md border text-xs font-medium transition-all cursor-pointer",
        active ? c.active : c.base
      )}
    >
      {label}
    </button>
  );
}

function StatusDot({ status, className }: { status: string; className?: string }) {
  const k = status?.toLowerCase() ?? "";
  const colors: Record<string, string> = {
    active: "bg-emerald-500", scheduled: "bg-blue-500",
    completed: "bg-muted-foreground/40", cancelled: "bg-red-500",
  };
  return <span className={cn("rounded-full", colors[k] ?? "bg-muted-foreground/40", k === "active" && "animate-pulse", className)} />;
}

function SessionStatusBadge({ status }: { status: string }) {
  const k = status?.toLowerCase() ?? "";
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    scheduled: "bg-blue-500/10 text-blue-600 border-blue-200",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-red-500/10 text-red-600 border-red-200",
  };
  const labels: Record<string, string> = {
    active: "En cours", scheduled: "Planifié", completed: "Terminé", cancelled: "Annulé",
  };
  return <Badge variant="outline" className={cn("text-xs", styles[k])}>{labels[k] ?? status}</Badge>;
}

function StudentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    present: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    absent: "bg-red-500/10 text-red-600 border-red-200",
    late: "bg-amber-500/10 text-amber-600 border-amber-200",
    justified: "bg-blue-500/10 text-blue-600 border-blue-200",
    unmarked: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    present: "Présent", absent: "Absent", late: "Retard", justified: "Justifié", unmarked: "Non marqué",
  };
  return <Badge variant="outline" className={cn("text-xs", styles[status])}>{labels[status] ?? status}</Badge>;
}

function SourceModeBadge({ mode }: { mode: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    realtime: { label: "Temps réel", classes: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
    retroactive: { label: "Rétroactif", classes: "bg-amber-500/10 text-amber-600 border-amber-200" },
    override: { label: "Override", classes: "bg-primary/10 text-primary" },
    manual: { label: "Manuel", classes: "bg-slate-500/10 text-slate-600 border-slate-200" },
  };
  const c = config[mode] ?? { label: mode, classes: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={cn("text-[10px]", c.classes)}>{c.label}</Badge>;
}
