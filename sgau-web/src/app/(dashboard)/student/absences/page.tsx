"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle, Clock, XCircle,
  FileText, Loader2, GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { useMascot } from "@/components/mascot/MascotProvider";
import { EmptyState, LoadingState } from "@/components/mascot/EmptyState";

type Record_ = {
  id: string; sessionid: string; sessiondate: string; starttime: string;
  moduleName: string; status: string;
  justificationstatus: string | null; justificationreason: string | null;
};

export default function StudentAbsencesPage() {
  const [records, setRecords] = useState<Record_[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Record_ | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const mascot = useMascot();

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("attendance")
      .select("*, sessions!inner(id, sessiondate, starttime, modules(name))")
      .eq("studentid", user.id)
      .in("status", ["absent", "late", "justified"])
      .order("sessiondate", { referencedTable: "sessions", ascending: false })
      .order("starttime", { referencedTable: "sessions", ascending: false })
      .limit(200);
    if (data) {
      setRecords((data as Record<string, unknown>[]).map((a) => {
        const s = a.sessions as Record<string, unknown>;
        return {
          id: a.id as string,
          sessionid: s.id as string,
          sessiondate: s.sessiondate as string,
          starttime: s.starttime as string,
          moduleName: ((s.modules as Record<string, unknown> | null)?.name as string) ?? "",
          status: a.status as string,
          justificationstatus: (a.justificationstatus as string) ?? null,
          justificationreason: (a.justificationreason as string) ?? null,
          justificationfile: (a.justificationfile as string) ?? null,
        };
      }));
    }
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!active) return;
      await load();
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const openJustify = (r: Record_) => {
    setSelectedRecord(r);
    setReason(r.justificationreason ?? "");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedRecord || !reason.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Non connecté"); return; }

      const { error } = await supabase
        .from("attendance")
        .update({
          justificationreason: reason.trim(),
          justificationstatus: "PENDING",
          justificationsubmittedat: new Date().toISOString(),
        })
        .eq("id", selectedRecord.id)
        .eq("studentid", user.id)
        .in("status", ["absent", "late"])
        .is("justificationstatus", null)
        .or("justificationstatus.eq.REJECTED");

      if (error) throw error;

      mascot.show("validation", "Justification soumise", "Elle sera examinée par votre administration.");
      setDialogOpen(false);
      load();
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "absent": return <Badge className="bg-red-500/10 text-red-600 border-red-200 text-xs">Absent</Badge>;
      case "late": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">En retard</Badge>;
      case "justified": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs">Justifié</Badge>;
      default: return <Badge variant="outline" className="text-xs text-muted-foreground">{status}</Badge>;
    }
  };

  const justifyBadge = (js: string | null) => {
    switch (js) {
      case "PENDING": return <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-200">En attente</Badge>;
      case "APPROVED": return <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-200">Approuvée</Badge>;
      case "REJECTED": return <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-200">Refusée</Badge>;
      default: return null;
    }
  };

  const totalAbsences = records.filter((r) => r.status === "absent").length;
  const totalLate = records.filter((r) => r.status === "late").length;
  const totalJustified = records.filter((r) => r.status === "justified").length;
  const pendingJustifications = records.filter((r) => r.justificationstatus === "PENDING").length;

  if (loading) return <LoadingState label="Chargement de vos absences..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Absences</h1>
        <p className="text-muted-foreground">Absences, retards et justifications</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absences</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-red-600">{totalAbsences}</p></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Retards</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-amber-600">{totalLate}</p></CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Justifiés</CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{totalJustified}</p>
            {pendingJustifications > 0 && <p className="text-xs text-amber-600 mt-1">{pendingJustifications} en attente</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Historique des absences</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState
              compact
              pose="celebration"
              title="Aucune absence à signaler"
              hint="Continuez sur cette lancée, votre assiduité est parfaite."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Module</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Horaire</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Statut</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Justification</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                      <td className="py-3 px-4">{r.sessiondate ? new Date(r.sessiondate).toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-primary" />
                          {r.moduleName}
                        </span>
                      </td>
                      <td className="py-3 px-4">{r.starttime ?? "—"}</td>
                      <td className="py-3 px-4">{statusBadge(r.status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {justifyBadge(r.justificationstatus) ?? <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {(r.status === "absent" || r.status === "late") && (!r.justificationstatus || r.justificationstatus === "REJECTED") && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openJustify(r)}>
                            <FileText className="h-3 w-3" />Justifier
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Justifier une absence
            </DialogTitle>
            <DialogDescription>
              {selectedRecord && `Séance du ${selectedRecord.sessiondate ? new Date(selectedRecord.sessiondate).toLocaleDateString("fr-FR") : "—"} — ${selectedRecord.moduleName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="justify-reason">Motif de l&apos;absence</Label>
              <Textarea
                id="justify-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Décrivez la raison de votre absence (ex: motif médical, transport, etc.)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saving || !reason.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
