"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { uuid } from "@/lib/uuid";
import { MascotHeader } from "@/components/mascot/MascotHeader";
import { Mascot } from "@/components/mascot/Mascot";
import { EmptyState } from "@/components/mascot/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";

type Enrollment = {
  id: string; studentid: string; studentName?: string;
  groupid: string; groupName?: string; moduleName?: string;
  status: "active" | "completed" | "dropped";
  enrolledat: string;
};

type Student = { id: string; firstname: string; lastname: string; fullName: string };
type Group = { id: string; name: string; moduleName: string };

export function EnrollmentsManagement({ initialEnrollments, students, groups }: {
  initialEnrollments: Enrollment[]; students: Student[]; groups: Group[];
}) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>(initialEnrollments);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Enrollment | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ studentid: "", groupid: "", status: "active" as Enrollment["status"] });
  const supabase = createClient();

  const openAdd = () => {
    setEditing(null);
    setForm({ studentid: "", groupid: "", status: "active" });
    setDialogOpen(true);
  };

  const openEdit = (e: Enrollment) => {
    setEditing(e);
    setForm({ studentid: e.studentid, groupid: e.groupid, status: e.status });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!form.studentid || !form.groupid) { toast.error("Veuillez sélectionner un étudiant et un groupe"); setSaving(false); return; }
      const student = students.find((s) => s.id === form.studentid);
      const group = groups.find((g) => g.id === form.groupid);
      if (!student || !group) { toast.error("Étudiant ou groupe introuvable"); setSaving(false); return; }

      const { data: existing } = await supabase
        .from("enrollments")
        .select("id")
        .eq("studentid", form.studentid)
        .eq("groupid", form.groupid);
      const dupes = existing ?? [];

      if (editing) {
        if (dupes.some((d) => d.id !== editing.id)) { toast.error("Cet étudiant est déjà inscrit dans ce groupe"); setSaving(false); return; }
        await supabase.from("enrollments").update({
          studentid: form.studentid, groupid: form.groupid, status: form.status,
        }).eq("id", editing.id);
        setEnrollments((prev) => prev.map((e) => e.id === editing.id ? {
          ...e, studentid: form.studentid, studentName: student.fullName,
          groupid: form.groupid, groupName: group.name, moduleName: group.moduleName,
          status: form.status,
        } : e));
        toast.success("Inscription mise à jour");
      } else {
        if (dupes.length > 0) { toast.error("Cet étudiant est déjà inscrit dans ce groupe"); setSaving(false); return; }
        const id = uuid();
        const enrolledat = new Date().toISOString();
        await supabase.from("enrollments").insert({
          id, studentid: form.studentid, groupid: form.groupid, status: form.status, enrolledat,
        });
        setEnrollments((prev) => [{
          id, studentid: form.studentid, studentName: student.fullName,
          groupid: form.groupid, groupName: group.name, moduleName: group.moduleName,
          status: form.status, enrolledat,
        }, ...prev]);
        toast.success("Inscription créée");
      }
      setDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const handleDelete = async (e: Enrollment) => {
    if (!confirm(`Supprimer l'inscription de "${e.studentName ?? e.studentid}" dans "${e.groupName ?? e.groupid}" ?`)) return;
    try {
      const { data, error } = await supabase.from("enrollments").delete().eq("id", e.id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Aucune ligne supprimée (vérifiez les permissions RLS)");
      setEnrollments((prev) => prev.filter((x) => x.id !== e.id));
      toast.success("Inscription supprimée");
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
  };

  const statusBadge = (status: Enrollment["status"]) => {
    const map = {
      active: { label: "Actif", dot: "bg-emerald-500 animate-pulse", classes: "bg-emerald-50 text-emerald-600" },
      completed: { label: "Terminé", dot: "bg-[#6d28d9]", classes: "bg-[#6d28d9]/10 text-[#6d28d9]" },
      dropped: { label: "Abandonné", dot: "bg-amber-500", classes: "bg-amber-50 text-amber-600" },
    };
    const m = map[status];
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${m.classes}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
        {m.label}
      </span>
    );
  };

  const filtered = enrollments.filter(
    (e) => (e.studentName ?? "").toLowerCase().includes(search.toLowerCase()) ||
           (e.groupName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Mascot Header */}
      <MascotHeader
        title="Gestion des Inscriptions"
        description="Affectez les étudiants aux groupes de formation et suivez le statut de chaque inscription."
        pose="tous"
        mascotMessage={`${enrollments.length} inscription(s) enregistrée(s)`}
        badge="Formation & Inscriptions"
      >
        <Button
          onClick={openAdd}
          className="h-11 rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-5 font-bold text-white shadow-md shadow-[#6d28d9]/20 hover:shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une Inscription
        </Button>
      </MascotHeader>

      {/* Main Table Card */}
      <Card className="overflow-hidden rounded-3xl border border-[#6d28d9]/10 bg-white shadow-xs">
        <div className="p-5 border-b border-[#6d28d9]/5">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d28d9]" />
            <Input
              placeholder="Rechercher par étudiant ou groupe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-2xl border-[#6d28d9]/15 bg-[#f8f9fc] pl-10 text-xs font-semibold text-[#1a1a2e] focus:border-[#6d28d9] focus:bg-white"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              pose="reflexion"
              title="Aucune inscription trouvée"
              hint="Aucune inscription ne correspond à vos critères de recherche."
            />
          ) : (
            <Table>
              <TableHeader className="bg-[#f8f9fc]">
                <TableRow className="border-b border-[#6d28d9]/5 hover:bg-transparent">
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">Étudiant</TableHead>
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">Groupe</TableHead>
                  <TableHead className="hidden py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9] md:table-cell">Formation</TableHead>
                  <TableHead className="hidden py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9] sm:table-cell">Statut</TableHead>
                  <TableHead className="hidden py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9] lg:table-cell">Date d&apos;inscription</TableHead>
                  <TableHead className="w-16 py-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} className="border-b border-[#6d28d9]/5 transition-colors hover:bg-[#f3f0ff]/30">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-[#6d28d9]/10 p-2">
                          <ClipboardList className="h-4 w-4 text-[#6d28d9]" />
                        </div>
                        <p className="text-sm font-bold text-[#1a1a2e]">{e.studentName ?? "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-xs font-semibold text-[#64748b]">{e.groupName ?? "—"}</span>
                    </TableCell>
                    <TableCell className="hidden py-4 md:table-cell">
                      <Badge className="rounded-full bg-[#6d28d9]/10 text-xs font-semibold text-[#6d28d9] border-none">{e.moduleName ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="hidden py-4 sm:table-cell">{statusBadge(e.status)}</TableCell>
                    <TableCell className="hidden py-4 lg:table-cell">
                      <span className="text-xs font-medium text-[#64748b]">
                        {new Date(e.enrolledat).toLocaleDateString("fr-FR")}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#64748b] hover:bg-[#6d28d9]/10 hover:text-[#6d28d9]"><MoreHorizontal className="h-4 w-4" /></Button>} />
                        <DropdownMenuContent align="end" className="w-44 rounded-2xl p-1.5 shadow-xl">
                          <DropdownMenuItem onClick={() => openEdit(e)} className="rounded-xl text-xs font-semibold">
                            <Edit className="mr-2 h-4 w-4 text-[#6d28d9]" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl text-xs font-semibold text-rose-600 focus:bg-rose-50" onClick={() => handleDelete(e)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <Mascot pose="validation" size="sm" />
              <div>
                <DialogTitle className="text-lg font-bold text-[#1a1a2e]">
                  {editing ? "Modifier l'inscription" : "Ajouter une inscription"}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748b]">
                  {editing ? "Modifiez les informations de l'inscription." : "Inscrivez un étudiant à un groupe de formation."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="enr-student" className="text-xs font-bold text-[#1a1a2e]">Étudiant</Label>
              <Select value={form.studentid} onValueChange={(v) => { if (v) setForm({ ...form, studentid: v }); }}>
                <SelectTrigger id="enr-student" className="rounded-xl border-[#6d28d9]/10 text-xs"><SelectValue placeholder="Sélectionner un étudiant">{(v: string) => students.find((s) => s.id === v)?.fullName ?? v}</SelectValue></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enr-group" className="text-xs font-bold text-[#1a1a2e]">Groupe</Label>
              <Select value={form.groupid} onValueChange={(v) => { if (v) setForm({ ...form, groupid: v }); }}>
                <SelectTrigger id="enr-group" className="rounded-xl border-[#6d28d9]/10 text-xs"><SelectValue placeholder="Sélectionner un groupe">{(v: string) => {
                  const g = groups.find((g) => g.id === v);
                  return g ? `${g.name} (${g.moduleName})` : v;
                }}</SelectValue></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="font-medium">{g.name}</span>
                      <span className="text-[#64748b]"> — {g.moduleName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enr-status" className="text-xs font-bold text-[#1a1a2e]">Statut</Label>
              <Select value={form.status} onValueChange={(v) => { if (v) setForm({ ...form, status: v as Enrollment["status"] }); }}>
                <SelectTrigger id="enr-status" className="rounded-xl border-[#6d28d9]/10 text-xs"><SelectValue placeholder="Sélectionner un statut">{(v: string) => {
                  const map: Record<string, string> = { active: "Actif", completed: "Terminé", dropped: "Abandonné" };
                  return map[v] ?? v;
                }}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="dropped">Abandonné</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Enregistrer" : "Créer l'inscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
