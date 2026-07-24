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
import { Search, Plus, MoreHorizontal, Edit, Trash2, Loader2, LayoutList, Layers } from "lucide-react";
import { toast } from "sonner";

type Section = { id: string; levelId: string; levelName: string; name: string; code: string; isActive: boolean };
type Level = { id: string; name: string; code: string; isActive: boolean };

export function SectionsManagement({ initialSections, levels }: { initialSections: Section[]; levels: Level[] }) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ levelId: "", name: "", code: "", isActive: true });
  const supabase = createClient();

  const openAdd = () => { setEditing(null); setForm({ levelId: levels[0]?.id ?? "", name: "", code: "", isActive: true }); setDialogOpen(true); };
  const openEdit = (s: Section) => { setEditing(s); setForm({ levelId: s.levelId, name: s.name, code: s.code, isActive: s.isActive }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await supabase.from("sections").update({ levelId: form.levelId, name: form.name, code: form.code, isActive: form.isActive }).eq("id", editing.id);
        const lvl = levels.find((l) => l.id === form.levelId);
        setSections((prev) => prev.map((s) => s.id === editing.id ? { ...s, ...form, levelName: lvl?.name ?? "" } : s));
        toast.success("Section mise à jour");
      } else {
        const id = uuid();
        await supabase.from("sections").insert({ id, levelId: form.levelId, name: form.name, code: form.code, isActive: form.isActive });
        const lvl = levels.find((l) => l.id === form.levelId);
        setSections((prev) => [{ id, ...form, levelName: lvl?.name ?? "" }, ...prev]);
        toast.success("Section créée");
      }
      setDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const handleDelete = async (s: Section) => {
    if (!confirm(`Supprimer la section "${s.name}" ?`)) return;
    try {
      const { data, error } = await supabase.from("sections").delete().eq("id", s.id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Aucune ligne supprimée (vérifiez les permissions RLS)");
      setSections((prev) => prev.filter((x) => x.id !== s.id));
      toast.success("Section supprimée");
    } catch (err) {
      const msg = String(err);
      if (msg.includes("foreign key")) toast.error("Impossible de supprimer cette section : elle est liée à des éléments existants");
      else toast.error("Erreur", { description: msg });
    }
  };

  const filtered = sections.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sections</h1>
          <p className="text-muted-foreground">{sections.length} section(s)</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
      </div>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead className="hidden md:table-cell">Code</TableHead>
                <TableHead className="hidden sm:table-cell">Niveau</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <LayoutList className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="font-mono text-xs text-muted-foreground">{s.code}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-xs gap-1">
                      <Layers className="h-3 w-3" />
                      {s.levelName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs ${s.isActive ? "text-emerald-600" : "text-muted-foreground"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.isActive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      {s.isActive ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>} />
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEdit(s)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(s)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
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
              <LayoutList className="h-5 w-5 text-primary" />
              {editing ? "Modifier la section" : "Ajouter une section"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez les informations de la section." : "Créez une nouvelle section rattachée à un niveau (ex: Section A du L1-INFO)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Rattachement</h4>
              <div className="space-y-2">
                <Label htmlFor="section-level">Niveau</Label>
                <Select value={form.levelId} onValueChange={(v) => { if (v) setForm({ ...form, levelId: v }); }}>
                  <SelectTrigger id="section-level"><SelectValue placeholder="Sélectionner un niveau">{(v: string) => levels.find(l => l.id === v)?.name ?? v}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {levels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Identité</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="section-name">Nom</Label>
                  <Input id="section-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Section A" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section-code">Code</Label>
                  <Input id="section-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="section-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <Label htmlFor="section-active" className="text-sm font-normal">Section active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
