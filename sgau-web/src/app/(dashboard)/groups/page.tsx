"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Search, Plus, MoreHorizontal, Edit, Trash2, Users, Loader2, BookOpen, Globe, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type GroupRow = {
  id: string; name: string; moduleid: string | null; module_name: string | null; isactive: boolean;
};

export default function GroupsPage() {
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [domains, setDomains] = useState<{ id: string; name: string }[]>([]);
  const [modules, setModules] = useState<{ id: string; name: string; domainid: string | null; isactive: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GroupRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ domainid: "", moduleid: "", name: "", isactive: true });
  type Form = typeof form;
  const supabase = createClient();

  const filteredModules = modules.filter((m) => !form.domainid || m.domainid === form.domainid);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [grpRes, modRes, domRes] = await Promise.all([
      supabase.from("groups").select("id, name, moduleid, isactive, modules(name)").order("name"),
      supabase.from("modules").select("id, name, domainid, isactive").eq("isactive", true).order("name"),
      supabase.from("domains").select("id, name").eq("isactive", true).order("name"),
    ]);
    if (grpRes.error) { setError(grpRes.error.message); setLoading(false); return; }
    if (modRes.error) { setError(modRes.error.message); setLoading(false); return; }
    if (domRes.error) { setError(domRes.error.message); setLoading(false); return; }
    setRows((grpRes.data ?? []).map((g: Record<string, unknown>) => ({
      id: g.id as string, name: g.name as string,
      moduleid: (g.moduleid as string) ?? null,
      module_name: ((g.modules as unknown as { name: string })?.name ?? null) as string | null,
      isactive: g.isactive as boolean,
    })));
    setModules(modRes.data ?? []);
    setDomains(domRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ domainid: "", moduleid: "", name: "", isactive: true });
    setDialogOpen(true);
  };

  const openEdit = (r: GroupRow) => {
    setEditing(r);
    const mod = modules.find((m) => m.id === r.moduleid);
    setForm({ domainid: mod?.domainid ?? "", moduleid: r.moduleid ?? "", name: r.name, isactive: r.isactive });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const { error: err } = await supabase.from("groups").update({
          moduleid: form.moduleid || null,
          name: form.name, isactive: form.isactive,
        }).eq("id", editing.id);
        if (err) throw err;
        const mod = modules.find((m) => m.id === form.moduleid);
        setRows((prev) => prev.map((r) => r.id === editing.id ? {
          ...r, moduleid: form.moduleid || null, module_name: mod?.name ?? null,
          name: form.name, isactive: form.isactive,
        } : r));
        toast.success("Groupe mis à jour");
      } else {
        const id = uuid();
        const { error: err } = await supabase.from("groups").insert({
          id, moduleid: form.moduleid || null,
          name: form.name, isactive: form.isactive,
        });
        if (err) throw err;
        const mod = modules.find((m) => m.id === form.moduleid);
        setRows((prev) => [{
          id, moduleid: form.moduleid || null, module_name: mod?.name ?? null,
          name: form.name, isactive: form.isactive,
        }, ...prev]);
        toast.success("Groupe créé");
      }
      setDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const handleDelete = async (r: GroupRow) => {
    if (!confirm(`Supprimer le groupe "${r.name}" ?`)) return;
    const { data: del, error: err } = await supabase.from("groups").delete().eq("id", r.id).select();
    if (err) { toast.error("Erreur", { description: err.message }); return; }
    if (!del || del.length === 0) { toast.error("Erreur", { description: "Aucune ligne supprimée (vérifiez les permissions RLS)" }); return; }
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    toast.success("Groupe supprimé");
  };

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <Loader2 className="mx-auto mt-20 h-8 w-8 animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groupes</h1>
          <p className="text-muted-foreground">{rows.length} groupe(s)</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Erreur</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={load}>Réessayer</Button>
          </CardContent>
        </Card>
      )}

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
                <TableHead>Groupe</TableHead>
                <TableHead className="hidden md:table-cell">Formation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><p className="text-sm font-medium">{r.name}</p></TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-xs gap-1"><BookOpen className="h-3 w-3" />{r.module_name || "—"}</Badge></TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs ${r.isactive ? "text-emerald-600" : "text-muted-foreground"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${r.isactive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      {r.isactive ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>} />
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(r)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && !error && <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Aucun groupe trouvé</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{editing ? "Modifier" : "Ajouter"} un groupe</DialogTitle>
            <DialogDescription>Rattachez le groupe à un domaine et une formation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Domaine</Label>
              <Select value={form.domainid} onValueChange={(v) => { setForm({ ...form, domainid: v ?? "", moduleid: "" }); }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un domaine">{(v: string) => domains.find((d) => d.id === v)?.name ?? v}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les domaines</SelectItem>
                  {domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formation</Label>
              <Select value={form.moduleid} onValueChange={(v) => { if (v) setForm({ ...form, moduleid: v }); }}>
                <SelectTrigger><SelectValue placeholder={filteredModules.length === 0 ? "Aucune formation disponible" : "Sélectionner une formation"}>{(v: string) => modules.find((m) => m.id === v)?.name ?? v}</SelectValue></SelectTrigger>
                <SelectContent>
                  {filteredModules.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">Aucune formation dans ce domaine</div>
                  ) : filteredModules.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nom du groupe</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Groupe A" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ga" checked={form.isactive} onChange={(e) => setForm({ ...form, isactive: e.target.checked })} className="rounded" />
              <Label htmlFor="ga">Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.moduleid}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
