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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, MoreHorizontal, Edit, Trash2, BookOpen, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ModulesPage() {
  const [rows, setRows] = useState<{ id: string; name: string; domainid: string; domain_name?: string; isactive: boolean }[]>([]);
  const [domains, setDomains] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<typeof rows[0] | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", domainid: "", isactive: true });
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [modRes, domRes] = await Promise.all([
      supabase.from("modules").select("id, name, domainid, isactive").order("name"),
      supabase.from("domains").select("id, name").order("name"),
    ]);
    if (modRes.error) { setError(modRes.error.message); setLoading(false); return; }
    if (domRes.error) { setError(domRes.error.message); setLoading(false); return; }
    const dm = new Map(domRes.data?.map((d: { id: string; name: string }) => [d.id, d.name]) ?? []);
    setRows((modRes.data ?? []).map((m: Record<string, unknown>) => ({ id: m.id as string, name: m.name as string, domainid: m.domainid as string, domain_name: dm.get(m.domainid as string), isactive: m.isactive as boolean })));
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

  const openAdd = () => { setEditing(null); setForm({ name: "", domainid: domains[0]?.id ?? "", isactive: true }); setDialogOpen(true); };
  const openEdit = (r: typeof rows[0]) => { setEditing(r); setForm({ name: r.name, domainid: r.domainid, isactive: r.isactive }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const { error: err } = await supabase.from("modules").update({ name: form.name, domainid: form.domainid, isactive: form.isactive }).eq("id", editing.id);
        if (err) throw err;
        const d = domains.find((x) => x.id === form.domainid);
        setRows((prev) => prev.map((r) => r.id === editing.id ? { ...r, ...form, domain_name: d?.name } : r));
        toast.success("Formation mise à jour");
      } else {
        const id = uuid();
        const { error: err } = await supabase.from("modules").insert({ id, name: form.name, domainid: form.domainid, isactive: form.isactive });
        if (err) throw err;
        const d = domains.find((x) => x.id === form.domainid);
        setRows((prev) => [{ id, ...form, domain_name: d?.name }, ...prev]);
        toast.success("Formation créée");
      }
      setDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const handleDelete = async (r: typeof rows[0]) => {
    if (!confirm(`Supprimer la formation "${r.name}" ?`)) return;
    const { error: err } = await supabase.from("modules").delete().eq("id", r.id);
    if (err) { toast.error("Erreur", { description: err.message }); return; }
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    toast.success("Formation supprimée");
  };

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingState label="Chargement des formations..." />;

  return (
    <div className="space-y-8 pb-10">
      {/* Mascot Header */}
      <MascotHeader
        title="Gestion des Formations"
        description="Référencez les formations (modules) et rattachez-les à leurs domaines d'études."
        pose="tous"
        mascotMessage={`${rows.length} formation(s) référencée(s)`}
        badge="Catalogue Académique"
      >
        <Button
          onClick={openAdd}
          className="h-11 rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-5 font-bold text-white shadow-md shadow-[#6d28d9]/20 hover:shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une Formation
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
            <Input placeholder="Rechercher une formation..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 rounded-2xl border-[#6d28d9]/15 bg-[#f8f9fc] pl-10 text-xs font-semibold text-[#1a1a2e] focus:border-[#6d28d9] focus:bg-white" />
          </div>
        </div>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              pose="reflexion"
              title="Aucune formation trouvée"
              hint="Aucune formation ne correspond à vos critères de recherche."
            />
          ) : (
            <Table>
              <TableHeader className="bg-[#f8f9fc]">
                <TableRow className="border-b border-[#6d28d9]/5 hover:bg-transparent">
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">Formation</TableHead>
                  <TableHead className="hidden py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9] sm:table-cell">Domaine</TableHead>
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
                          <BookOpen className="h-4 w-4 text-[#6d28d9]" />
                        </div>
                        <span className="text-sm font-bold text-[#1a1a2e]">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-4 sm:table-cell">
                      {r.domain_name
                        ? <Badge className="rounded-full bg-[#f97316]/10 text-xs font-semibold text-[#f97316] border-none">{r.domain_name}</Badge>
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
                  {editing ? "Modifier" : "Ajouter"} une formation
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748b]">Rattachée à un domaine d&apos;études.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="mod-name" className="text-xs font-bold text-[#1a1a2e]">Nom</Label>
              <Input id="mod-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Anglais technique" className="rounded-xl border-[#6d28d9]/10 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mod-domain" className="text-xs font-bold text-[#1a1a2e]">Domaine</Label>
              <Select value={form.domainid} onValueChange={(v) => { if (v) setForm({ ...form, domainid: v }); }}>
                <SelectTrigger id="mod-domain" className="rounded-xl border-[#6d28d9]/10 text-xs"><SelectValue placeholder="Sélectionner">{(v: string) => domains.find((d) => d.id === v)?.name ?? v}</SelectValue></SelectTrigger>
                <SelectContent>{domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="ma" checked={form.isactive} onChange={(e) => setForm({ ...form, isactive: e.target.checked })} className="rounded border-[#6d28d9]/20 text-[#6d28d9] focus:ring-[#6d28d9]" />
              <Label htmlFor="ma" className="text-xs font-semibold text-[#1a1a2e]">Active</Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.domainid} className="rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
