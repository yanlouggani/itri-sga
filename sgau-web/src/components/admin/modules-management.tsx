"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { uuid } from "@/lib/uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, MoreHorizontal, Edit, Trash2, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Formation = { id: string; name: string; domainId: string; domainName?: string; isActive: boolean };
type Domain = { id: string; name: string };

export function ModulesManagement({ initialModules, domains }: { initialModules: Formation[]; domains: Domain[] }) {
  const [modules, setModules] = useState<Formation[]>(initialModules);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Formation | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", domainId: "", isActive: true });
  const supabase = createClient();

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", domainId: "", isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (mod: Formation) => {
    setEditing(mod);
    setForm({ name: mod.name, domainId: mod.domainId, isActive: mod.isActive });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await supabase.from("modules").update({ name: form.name, domainId: form.domainId, isActive: form.isActive }).eq("id", editing.id);
        const domain = domains.find((d) => d.id === form.domainId);
        setModules((prev) => prev.map((m) => m.id === editing.id ? { ...m, name: form.name, domainId: form.domainId, domainName: domain?.name ?? m.domainName, isActive: form.isActive } : m));
        toast.success("Formation mise à jour");
      } else {
        const id = uuid();
        const domain = domains.find((d) => d.id === form.domainId);
        await supabase.from("modules").insert({ id, name: form.name, domainId: form.domainId, isActive: form.isActive });
        setModules((prev) => [{ id, name: form.name, domainId: form.domainId, domainName: domain?.name, isActive: form.isActive }, ...prev]);
        toast.success("Formation créée");
      }
      setDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const handleDelete = async (mod: Formation) => {
    if (!confirm(`Supprimer la formation "${mod.name}" ?`)) return;
    try {
      const { data, error } = await supabase.from("modules").delete().eq("id", mod.id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Aucune ligne supprimée (vérifiez les permissions RLS)");
      setModules((prev) => prev.filter((m) => m.id !== mod.id));
      toast.success("Formation supprimée");
    } catch (err) {
      const msg = String(err);
      if (msg.includes("foreign key")) toast.error("Impossible de supprimer cette formation : elle est liée à des groupes ou des séances");
      else toast.error("Erreur", { description: msg });
    }
  };

  const filtered = modules.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Formations</h1>
          <p className="text-muted-foreground">{modules.length} formation(s)</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
      </div>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher par nom..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Formation</TableHead>
                <TableHead className="hidden sm:table-cell">Domaine</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((mod) => (
                <TableRow key={mod.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium">{mod.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {mod.domainName ? (
                      <Badge variant="secondary" className="text-xs">{mod.domainName}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs ${mod.isActive ? "text-emerald-600" : "text-muted-foreground"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${mod.isActive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      {mod.isActive ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>} />
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEdit(mod)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(mod)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
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
              <BookOpen className="h-5 w-5 text-primary" />
              {editing ? "Modifier la formation" : "Ajouter une formation"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez les informations de la formation." : "Créez une nouvelle formation rattachée à un domaine (ex: Langues, Informatique)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Informations</h4>
              <div className="space-y-2">
                <Label htmlFor="mod-name">Nom</Label>
                <Input id="mod-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Anglais technique" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mod-domain">Domaine</Label>
                <Select value={form.domainId} onValueChange={(v) => { if (v) setForm({ ...form, domainId: v }); }}>
                  <SelectTrigger id="mod-domain" className="w-full">
                    <SelectValue placeholder="Sélectionner un domaine">{(v: string) => domains.find((d) => d.id === v)?.name ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    {domains.length === 0 && <p className="text-xs text-muted-foreground p-2 text-center">Aucun domaine disponible</p>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="mod-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <Label htmlFor="mod-active" className="text-sm font-normal">Formation active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.domainId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
