"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/browser";
import { uuid } from "@/lib/uuid";
import { MascotHeader } from "@/components/mascot/MascotHeader";
import { Mascot } from "@/components/mascot/Mascot";
import { EmptyState, LoadingState } from "@/components/mascot/EmptyState";
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
  }, [supabase]);

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

  if (loading) return <LoadingState label="Chargement des groupes..." />;

  return (
    <div className="space-y-8 pb-10">
      {/* Mascot Header */}
      <MascotHeader
        title="Gestion des Groupes"
        description="Créez et gérez les groupes d'étudiants, rattachés à leurs formations."
        pose="tous"
        mascotMessage={`${rows.length} groupe(s) référencé(s)`}
        badge="Organisation Pédagogique"
      >
        <Button
          onClick={openAdd}
          className="h-11 rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-5 font-bold text-white shadow-md shadow-[#6d28d9]/20 hover:shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un Groupe
        </Button>
      </MascotHeader>

      {error && (
        <Card className="border border-[#f97316]/30 bg-[#f97316]/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-[#f97316] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#f97316]">Erreur</p>
              <p className="text-xs text-[#64748b]">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={load}>Réessayer</Button>
          </CardContent>
        </Card>
      )}

      {/* Main Table Card */}
      <Card className="overflow-hidden rounded-3xl border border-[#6d28d9]/10 bg-white shadow-xs">
        <div className="p-5 border-b border-[#6d28d9]/5">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d28d9]" />
            <Input placeholder="Rechercher un groupe..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 rounded-2xl border-[#6d28d9]/15 bg-[#f8f9fc] pl-10 text-xs font-semibold text-[#1a1a2e] focus:border-[#6d28d9] focus:bg-white" />
          </div>
        </div>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              pose="reflexion"
              title="Aucun groupe trouvé"
              hint="Aucun groupe ne correspond à vos critères de recherche."
            />
          ) : (
            <Table>
              <TableHeader className="bg-[#f8f9fc]">
                <TableRow className="border-b border-[#6d28d9]/5 hover:bg-transparent">
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">Groupe</TableHead>
                  <TableHead className="hidden py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9] md:table-cell">Formation</TableHead>
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">Statut</TableHead>
                  <TableHead className="w-16 py-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="border-b border-[#6d28d9]/5 transition-colors hover:bg-[#f3f0ff]/30">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-[#6d28d9]/10 p-2">
                          <Users className="h-4 w-4 text-[#6d28d9]" />
                        </div>
                        <span className="text-sm font-bold text-[#1a1a2e]">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-4 md:table-cell">
                      {r.module_name
                        ? <Badge className="rounded-full bg-[#6d28d9]/10 text-xs font-semibold text-[#6d28d9] border-none"><BookOpen className="mr-1 h-3 w-3" />{r.module_name}</Badge>
                        : <span className="text-xs text-[#64748b]">—</span>}
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${r.isactive ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${r.isactive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                        {r.isactive ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#64748b] hover:bg-[#6d28d9]/10 hover:text-[#6d28d9]"><MoreHorizontal className="h-4 w-4" /></Button>} />
                        <DropdownMenuContent align="end" className="w-44 rounded-2xl p-1.5 shadow-xl">
                          <DropdownMenuItem onClick={() => openEdit(r)} className="rounded-xl text-xs font-semibold">
                            <Edit className="mr-2 h-4 w-4 text-[#6d28d9]" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl text-xs font-semibold text-rose-600 focus:bg-rose-50" onClick={() => handleDelete(r)}>
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
                  {editing ? "Modifier" : "Ajouter"} un groupe
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748b]">Rattachez le groupe à un domaine et une formation.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="grp-domain" className="text-xs font-bold text-[#1a1a2e]">Domaine</Label>
              <Select value={form.domainid} onValueChange={(v) => { setForm({ ...form, domainid: v ?? "", moduleid: "" }); }}>
                <SelectTrigger id="grp-domain" className="rounded-xl border-[#6d28d9]/10 text-xs"><SelectValue placeholder="Sélectionner un domaine">{(v: string) => domains.find((d) => d.id === v)?.name ?? v}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les domaines</SelectItem>
                  {domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grp-module" className="text-xs font-bold text-[#1a1a2e]">Formation</Label>
              <Select value={form.moduleid} onValueChange={(v) => { if (v) setForm({ ...form, moduleid: v }); }}>
                <SelectTrigger id="grp-module" className="rounded-xl border-[#6d28d9]/10 text-xs"><SelectValue placeholder={filteredModules.length === 0 ? "Aucune formation disponible" : "Sélectionner une formation"}>{(v: string) => modules.find((m) => m.id === v)?.name ?? v}</SelectValue></SelectTrigger>
                <SelectContent>
                  {filteredModules.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">Aucune formation dans ce domaine</div>
                  ) : filteredModules.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grp-name" className="text-xs font-bold text-[#1a1a2e]">Nom du groupe</Label>
              <Input id="grp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Groupe A" className="rounded-xl border-[#6d28d9]/10 text-xs" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="ga" checked={form.isactive} onChange={(e) => setForm({ ...form, isactive: e.target.checked })} className="rounded border-[#6d28d9]/20 text-[#6d28d9] focus:ring-[#6d28d9]" />
              <Label htmlFor="ga" className="text-xs font-semibold text-[#1a1a2e]">Actif</Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.moduleid} className="rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
