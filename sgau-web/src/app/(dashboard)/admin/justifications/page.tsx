"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, CheckCircle, XCircle, FileText, CalendarDays, Clock, GraduationCap, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

type Justification = {
  sessionid: string;
  studentid: string;
  studentName: string;
  studentInitials: string;
  moduleName: string;
  sessiondate: string;
  starttime: string;
  reason: string;
  submittedAt: string;
};

export default function AdminJustificationsPage() {
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Justification | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if ((profile as Record<string, unknown> | null)?.role !== "admin") {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    load();
  };

  const load = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("sessionid, studentid, justificationreason, justificationsubmittedat, sessions!inner(sessiondate, starttime, modules(name)), users!inner(firstname, lastname)")
      .eq("justificationstatus", "PENDING")
      .order("justificationsubmittedat", { ascending: false });
    if (data) {
      setJustifications((data as Record<string, unknown>[]).map((a) => {
        const s = a.sessions as Record<string, unknown>;
        const u = a.users as Record<string, unknown>;
        const fn = u.firstname as string;
        const ln = u.lastname as string;
        return {
          sessionid: a.sessionid as string,
          studentid: a.studentid as string,
          studentName: `${fn} ${ln}`,
          studentInitials: `${(fn[0] ?? "").toUpperCase()}${(ln[0] ?? "").toUpperCase()}`,
          moduleName: ((s.modules as Record<string, unknown> | null)?.name as string) ?? "",
          sessiondate: s.sessiondate as string,
          starttime: s.starttime as string,
          reason: (a.justificationreason as string) ?? "",
          submittedAt: (a.justificationsubmittedat as string) ?? "",
        };
      }));
    }
    setLoading(false);
  };

  const handleApprove = async (j: Justification) => {
    setProcessing(j.sessionid + j.studentid);
    try {
      const { error } = await supabase.rpc("process_justification", {
        p_session_id: j.sessionid,
        p_student_id: j.studentid,
        p_approve: true,
      });
      if (error) throw error;
      toast.success("Justification approuvée");
      setJustifications((prev) => prev.filter((x) => x.sessionid !== j.sessionid || x.studentid !== j.studentid));
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setProcessing(null);
  };

  const openReject = (j: Justification) => {
    setRejectTarget(j);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessing(rejectTarget.sessionid + rejectTarget.studentid);
    try {
      const { error } = await supabase.rpc("process_justification", {
        p_session_id: rejectTarget.sessionid,
        p_student_id: rejectTarget.studentid,
        p_approve: false,
        p_reason: rejectReason || null,
      });
      if (error) throw error;
      toast.success("Justification refusée");
      setJustifications((prev) => prev.filter((x) => x.sessionid !== rejectTarget.sessionid || x.studentid !== rejectTarget.studentid));
      setRejectDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setProcessing(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (unauthorized) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-bold">Accès refusé</h2>
      <p className="text-muted-foreground">Vous devez être administrateur pour accéder à cette page.</p>
      <Button onClick={() => router.push("/login")}>Retour à la connexion</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Justifications d'absences</h1>
        <p className="text-muted-foreground">{justifications.length} demande(s) en attente</p>
      </div>

      {justifications.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="h-16 w-16 text-emerald-500/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Aucune demande en attente</p>
            <p className="text-sm text-muted-foreground">Les justifications soumises par les étudiants apparaîtront ici.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {justifications.map((j) => {
            const key = j.sessionid + j.studentid;
            const isProcessing = processing === key;
            return (
              <Card key={key} className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="text-xs font-medium bg-amber-500/10 text-amber-600">{j.studentInitials}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-2 min-w-0">
                        <div>
                          <p className="font-medium">{j.studentName}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{j.sessiondate ? new Date(j.sessiondate).toLocaleDateString("fr-FR") : "—"}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{j.starttime}</span>
                            <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{j.moduleName}</span>
                            <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Soumis le {j.submittedAt ? new Date(j.submittedAt).toLocaleString("fr-FR") : "—"}</span>
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3 text-sm">
                          <p className="text-xs text-muted-foreground mb-1 font-medium">Motif :</p>
                          <p>{j.reason}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" className="h-8 gap-1" disabled={isProcessing} onClick={() => handleApprove(j)}>
                        {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        Approuver
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive" disabled={isProcessing} onClick={() => openReject(j)}>
                        <XCircle className="h-3.5 w-3.5" />
                        Refuser
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Refuser la justification
            </DialogTitle>
            <DialogDescription>
              {rejectTarget && `${rejectTarget.studentName} — ${rejectTarget.moduleName} (${rejectTarget.sessiondate ? new Date(rejectTarget.sessiondate).toLocaleDateString("fr-FR") : "—"})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Motif du refus (optionnel)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Expliquez pourquoi la justification est refusée..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing !== null}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
