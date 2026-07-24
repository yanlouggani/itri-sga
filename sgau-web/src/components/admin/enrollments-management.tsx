"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { uuid } from "@/lib/uuid";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
      active: { label: "Actif", classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
      completed: { label: "Terminé", classes: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
      dropped: { label: "Abandonné", classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    };
    const m = map[status];
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.classes}`}>{m.label}</span>;
  };

  const filtered = enrollments.filter(
    (e) => (e.studentName ?? "").toLowerCase().includes(search.toLowerCase()) ||
           (e.groupName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inscriptions</h1>
          <p className="text-muted-foreground">{enrollments.length} inscription(s)</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
      </div>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher par étudiant ou groupe..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead>Groupe</TableHead>
                <TableHead className="hidden md:table-cell">Formation</TableHead>
                <TableHead className="hidden sm:table-cell">Niveau</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden lg:table-cell">Date d'inscription</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{e.studentName ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{e.groupName ?? "—"}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">{e.moduleName ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                  </TableCell>
                  <TableCell>{statusBadge(e.status)}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.enrolledat).toLocaleDateString("fr-FR")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>} />
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEdit(e)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(e)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {editing ? "Modifier l'inscription" : "Ajouter une inscription"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez les informations de l'inscription." : "Inscrivez un étudiant à un groupe."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Étudiant & Groupe</h4>
              <div className="space-y-2">
                <Label htmlFor="enr-student">Étudiant</Label>
                <Select value={form.studentid} onValueChange={(v) => { if (v) setForm({ ...form, studentid: v }); }}>
                  <SelectTrigger id="enr-student"><SelectValue placeholder="Sélectionner un étudiant">{(v: string) => students.find((s) => s.id === v)?.fullName ?? v}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="enr-group">Groupe</Label>
                <Select value={form.groupid} onValueChange={(v) => { if (v) setForm({ ...form, groupid: v }); }}>
                  <SelectTrigger id="enr-group"><SelectValue placeholder="Sélectionner un groupe">{(v: string) => {
                    const g = groups.find((g) => g.id === v);
                    return g ? `${g.name} (${g.moduleName})` : v;
                  }}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        <span className="font-medium">{g.name}</span>
                        <span className="text-muted-foreground"> — {g.moduleName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enr-status">Statut</Label>
              <Select value={form.status} onValueChange={(v) => { if (v) setForm({ ...form, status: v as Enrollment["status"] }); }}>
                <SelectTrigger id="enr-status"><SelectValue placeholder="Sélectionner un statut">{(v: string) => {
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
