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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Users, Loader2, BookOpen, Layers } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";

type Group = {
  id: string; moduleId: string | null; moduleName: string | null;
  levelId: string | null; levelName: string | null;
  name: string; isActive: boolean;
};
type Module = { id: string; name: string; isActive: boolean };
type Level = { id: string; name: string; isActive: boolean };

export function GroupsManagement({ initialGroups, modules, levels }: {
  initialGroups: Group[]; modules: Module[]; levels: Level[];
}) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ moduleId: "", levelId: "", name: "", isActive: true });
  const supabase = createClient();

  const openAdd = () => {
    setEditing(null);
    setForm({ moduleId: modules[0]?.id ?? "", levelId: levels[0]?.id ?? "", name: "", isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditing(g);
    setForm({ moduleId: g.moduleId ?? "", levelId: g.levelId ?? "", name: g.name, isActive: g.isActive });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await supabase.from("groups").update({
          moduleId: form.moduleId || null, levelId: form.levelId || null,
          name: form.name, isActive: form.isActive,
        }).eq("id", editing.id);
        const mod = modules.find((m) => m.id === form.moduleId);
        const lvl = levels.find((l) => l.id === form.levelId);
        setGroups((prev) => prev.map((g) => g.id === editing.id ? {
          ...g, moduleId: form.moduleId || null, moduleName: mod?.name ?? null,
          levelId: form.levelId || null, levelName: lvl?.name ?? null,
          name: form.name, isActive: form.isActive,
        } : g));
        toast.success("Groupe mis à jour");
      } else {
        const id = uuid();
        await supabase.from("groups").insert({
          id, moduleId: form.moduleId || null, levelId: form.levelId || null,
          name: form.name, isActive: form.isActive,
        });
        const mod = modules.find((m) => m.id === form.moduleId);
        const lvl = levels.find((l) => l.id === form.levelId);
        setGroups((prev) => [{ id, moduleId: form.moduleId || null, moduleName: mod?.name ?? null, levelId: form.levelId || null, levelName: lvl?.name ?? null, name: form.name, isActive: form.isActive }, ...prev]);
        toast.success("Groupe créé");
      }
      setDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const handleDelete = async (g: Group) => {
    if (!confirm(`Supprimer le groupe "${g.name}" ?`)) return;
    try {
      const { data, error } = await supabase.from("groups").delete().eq("id", g.id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Aucune ligne supprimée (vérifiez les permissions RLS)");
      setGroups((prev) => prev.filter((x) => x.id !== g.id));
      toast.success("Groupe supprimé");
    } catch (err) {
      const msg = String(err);
      if (msg.includes("foreign key")) toast.error("Impossible de supprimer ce groupe : il contient des inscriptions ou des séances");
      else toast.error("Erreur", { description: msg });
    }
  };

  const filtered = groups.filter(
    (g) => g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Groupes"
        subtitle={`${groups.length} groupe(s) référencé(s)`}
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button onClick={openAdd} className="h-11 rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-5 font-bold text-white shadow-md shadow-[#6d28d9]/20 hover:shadow-lg">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter
          </Button>
        }
      />
      <Card className="overflow-hidden rounded-3xl border border-[#6d28d9]/10 bg-white shadow-xs">
        <div className="border-b border-[#6d28d9]/5 p-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d28d9]" />
            <Input placeholder="Rechercher un groupe..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 rounded-2xl border-[#6d28d9]/15 bg-[#f8f9fc] pl-10 text-xs font-semibold text-[#1a1a2e] focus:border-[#6d28d9] focus:bg-white" />
          </div>
        </div>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Users className="mb-3 h-10 w-10 text-[#6d28d9]/40" />
              <p className="text-sm font-semibold text-[#1a1a2e]">Aucun groupe trouvé</p>
              <p className="text-sm text-[#64748b]">Essayez d’ajuster vos critères de recherche.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#f8f9fc]">
                <TableRow className="border-b border-[#6d28d9]/5 hover:bg-transparent">
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">Groupe</TableHead>
                  <TableHead className="hidden py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9] md:table-cell">Formation</TableHead>
                  <TableHead className="hidden py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9] sm:table-cell">Niveau</TableHead>
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">Statut</TableHead>
                  <TableHead className="w-16 py-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((g) => (
                  <TableRow key={g.id} className="border-b border-[#6d28d9]/5 transition-colors hover:bg-[#f3f0ff]/30">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-[#6d28d9]/10 p-2 text-[#6d28d9]">
                          <Users className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-semibold text-[#1a1a2e]">{g.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-4 md:table-cell">
                      <Badge variant="outline" className="gap-1 rounded-full border-[#6d28d9]/10 bg-[#6d28d9]/10 text-[#6d28d9] text-xs"><BookOpen className="h-3 w-3" />{g.moduleName || "—"}</Badge>
                    </TableCell>
                    <TableCell className="hidden py-4 sm:table-cell">
                      <Badge variant="outline" className="gap-1 rounded-full border-[#6d28d9]/10 bg-[#f8f9fc] text-xs"><Layers className="h-3 w-3" />{g.levelName || "—"}</Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${g.isActive ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${g.isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                        {g.isActive ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#64748b] hover:bg-[#6d28d9]/10 hover:text-[#6d28d9]"><MoreHorizontal className="h-4 w-4" /></Button>} />
                        <DropdownMenuContent align="end" className="w-44 rounded-2xl p-1.5 shadow-xl">
                          <DropdownMenuItem onClick={() => openEdit(g)} className="rounded-xl text-xs font-semibold">
                            <Edit className="mr-2 h-4 w-4 text-[#6d28d9]" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl text-xs font-semibold text-rose-600 focus:bg-rose-50" onClick={() => handleDelete(g)}>
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {editing ? "Modifier le groupe" : "Ajouter un groupe"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez les informations du groupe." : "Créez un nouveau groupe rattaché à une formation et un niveau."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Rattachement</h4>
              <div className="space-y-2">
                <Label htmlFor="grp-module">Formation</Label>
                <Select value={form.moduleId} onValueChange={(v) => { if (v) setForm({ ...form, moduleId: v }); }}>
                  <SelectTrigger id="grp-module"><SelectValue placeholder="Sélectionner une formation">{(v: string) => modules.find(m => m.id === v)?.name ?? v}</SelectValue></SelectTrigger>
                  <SelectContent>{modules.filter((m) => m.isActive).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grp-level">Niveau</Label>
                <Select value={form.levelId} onValueChange={(v) => { if (v) setForm({ ...form, levelId: v }); }}>
                  <SelectTrigger id="grp-level"><SelectValue placeholder="Sélectionner un niveau">{(v: string) => levels.find(l => l.id === v)?.name ?? v}</SelectValue></SelectTrigger>
                  <SelectContent>{levels.filter((l) => l.isActive).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Identité</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grp-name">Nom</Label>
                  <Input id="grp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Groupe 1" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="grp-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <Label htmlFor="grp-active" className="text-sm font-normal">Groupe actif</Label>
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
