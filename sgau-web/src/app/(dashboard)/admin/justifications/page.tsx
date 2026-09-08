"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  CalendarDays,
  Clock,
  GraduationCap,
  AlertTriangle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { MascotHeader } from "@/components/mascot/MascotHeader";
import { Mascot } from "@/components/mascot/Mascot";
import { EmptyState, LoadingState } from "@/components/mascot/EmptyState";
import { useMascot } from "@/components/mascot/MascotProvider";

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
  const mascot = useMascot();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("attendance")
      .select(
        "sessionid, studentid, justificationreason, justificationsubmittedat, sessions!inner(sessiondate, starttime, modules(name)), users!inner(firstname, lastname)"
      )
      .eq("justificationstatus", "PENDING")
      .order("justificationsubmittedat", { ascending: false });

    if (data) {
      setJustifications(
        (data as Record<string, unknown>[]).map((a) => {
          const s = a.sessions as Record<string, unknown>;
          const u = a.users as Record<string, unknown>;
          const fn = (u?.firstname as string) ?? "";
          const ln = (u?.lastname as string) ?? "";
          return {
            sessionid: a.sessionid as string,
            studentid: a.studentid as string,
            studentName: `${fn} ${ln}`,
            studentInitials: `${(fn[0] ?? "").toUpperCase()}${(ln[0] ?? "").toUpperCase()}`,
            moduleName: ((s?.modules as Record<string, unknown> | null)?.name as string) ?? "Module",
            sessiondate: (s?.sessiondate as string) ?? "",
            starttime: (s?.starttime as string) ?? "",
            reason: (a.justificationreason as string) ?? "",
            submittedAt: (a.justificationsubmittedat as string) ?? "",
          };
        })
      );
    }
    setLoading(false);
  }, [supabase]);

  const checkAccess = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    await load();
  }, [load, router, supabase]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!active) return;
      await checkAccess();
    })();
    return () => {
      active = false;
    };
  }, [checkAccess]);

  const handleApprove = async (j: Justification) => {
    const key = j.sessionid + j.studentid;
    setProcessing(key);
    try {
      const { error } = await supabase.rpc("process_justification", {
        p_session_id: j.sessionid,
        p_student_id: j.studentid,
        p_approve: true,
      });
      if (error) throw error;

      mascot.show("validation", "Justification approuvée !", "L&apos;absence a été officiellement régularisée.");
      toast.success("Demande approuvée avec succès");

      setJustifications((prev) =>
        prev.filter((x) => x.sessionid !== j.sessionid || x.studentid !== j.studentid)
      );
    } catch (err) {
      toast.error("Erreur de traitement", { description: String(err) });
    }
    setProcessing(null);
  };

  const openReject = (j: Justification) => {
    setRejectTarget(j);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    const key = rejectTarget.sessionid + rejectTarget.studentid;
    setProcessing(key);

    try {
      const { error } = await supabase.rpc("process_justification", {
        p_session_id: rejectTarget.sessionid,
        p_student_id: rejectTarget.studentid,
        p_approve: false,
        p_reason: rejectReason || null,
      });
      if (error) throw error;

      mascot.show("reflexion", "Justification refusée", "La décision et la raison ont été enregistrées.");
      toast.info("Demande refusée");

      setJustifications((prev) =>
        prev.filter(
          (x) => x.sessionid !== rejectTarget.sessionid || x.studentid !== rejectTarget.studentid
        )
      );
      setRejectDialogOpen(false);
    } catch (err) {
      toast.error("Erreur de traitement", { description: String(err) });
    }
    setProcessing(null);
  };

  if (loading) return <LoadingState label="Chargement des justifications d&apos;absence..." />;

  if (unauthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8 text-center">
        <Mascot pose="reflexion" size="lg" />
        <h2 className="text-xl font-bold text-[#1a1a2e]">Accès réservé aux administrateurs</h2>
        <p className="text-sm text-[#64748b] max-w-md">
          Vous ne disposez pas des autorisations nécessaires pour valider les justifications d&apos;absence.
        </p>
        <Button onClick={() => router.push("/login")} className="bg-[#6d28d9] hover:bg-[#5b21b6]">
          Retour à la connexion
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header Banner with Mascot Validation Pose */}
      <MascotHeader
        title="Validation des Justifications"
        description="Examinez et traitez les demandes de régularisation d'absences soumises par les étudiants."
        pose="validation"
        mascotMessage={
          justifications.length > 0
            ? `${justifications.length} dossier(s) à examiner !`
            : "Tous les dossiers sont traités !"
        }
        badge="Absences & Justificatifs"
      >
        <span className="inline-flex items-center gap-2 rounded-2xl border border-[#6d28d9]/10 bg-white px-4 py-2 text-xs font-bold text-[#6d28d9] shadow-xs">
          <FileText className="h-4 w-4 text-[#f97316]" />
          <span>En attente : {justifications.length}</span>
        </span>
      </MascotHeader>

      {/* Main Content */}
      {justifications.length === 0 ? (
        <EmptyState
          pose="celebration"
          title="Aucune demande en attente !"
          hint="Toutes les justifications d'absence des étudiants ont été traitées avec succès."
        />
      ) : (
        <div className="grid gap-4">
          {justifications.map((j) => {
            const key = j.sessionid + j.studentid;
            const isProcessing = processing === key;

            return (
              <Card
                key={key}
                className="overflow-hidden border border-[#6d28d9]/10 bg-white shadow-xs rounded-2xl transition-all hover:shadow-md hover:shadow-[#6d28d9]/5"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    {/* Student & Session Info */}
                    <div className="flex items-start gap-4 min-w-0">
                      <Avatar className="h-12 w-12 shrink-0 rounded-2xl ring-2 ring-[#6d28d9]/20">
                        <AvatarFallback className="bg-gradient-to-br from-[#6d28d9] to-[#8b5cf6] text-sm font-bold text-white">
                          {j.studentInitials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-2 min-w-0 flex-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-[#1a1a2e]">
                              {j.studentName}
                            </h3>
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                              En attente
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#64748b] mt-1">
                            <span className="flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5 text-[#6d28d9]" />
                              {j.sessiondate
                                ? new Date(j.sessiondate).toLocaleDateString("fr-FR", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-[#f97316]" />
                              {j.starttime}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <GraduationCap className="h-3.5 w-3.5 text-[#6d28d9]" />
                              {j.moduleName}
                            </span>
                          </div>
                        </div>

                        {/* Reason Box */}
                        <div className="rounded-xl border border-[#6d28d9]/10 bg-[#f8f9fc] p-3 text-xs text-[#1a1a2e]">
                          <span className="font-extrabold text-[#6d28d9] uppercase tracking-wider text-[10px] block mb-0.5">
                            Motif indiqué :
                          </span>
                          <p className="leading-relaxed">{j.reason}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleApprove(j)}
                        className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 px-4 shadow-sm"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        <span>Approuver</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isProcessing}
                        onClick={() => openReject(j)}
                        className="h-10 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold gap-1.5 px-4"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Refuser</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <Mascot pose="reflexion" size="sm" />
              <div>
                <DialogTitle className="text-lg font-bold text-[#1a1a2e]">
                  Refuser la demande de justification
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748b]">
                  {rejectTarget &&
                    `${rejectTarget.studentName} — ${rejectTarget.moduleName}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="reject-reason" className="text-xs font-bold text-[#1a1a2e]">
                Motif du refus (optionnel)
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="rounded-xl border-[#6d28d9]/10 text-xs focus:ring-[#6d28d9]"
                placeholder="Explication ou pièce justificative manquante..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing !== null}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
