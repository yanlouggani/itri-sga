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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Loader2, LayoutList } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";

type Domain = { id: string; name: string; isActive: boolean };

export function DomainsManagement({ initialDomains }: { initialDomains: Domain[] }) {
  const [domains, setDomains] = useState<Domain[]>(initialDomains);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Domain | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", isActive: true });
  const supabase = createClient();

  const openAdd = () => { setEditing(null); setForm({ name: "", isActive: true }); setDialogOpen(true); };
  const openEdit = (d: Domain) => { setEditing(d); setForm({ name: d.name, isActive: d.isActive }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await supabase.from("domains").update({ name: form.name, isActive: form.isActive }).eq("id", editing.id);
        setDomains((prev) => prev.map((d) => d.id === editing.id ? { ...d, ...form } : d));
        toast.success("Domaine mis à jour");
      } else {
        const id = uuid();
        await supabase.from("domains").insert({ id, name: form.name, isActive: form.isActive });
        setDomains((prev) => [{ id, ...form }, ...prev]);
        toast.success("Domaine créé");
      }
      setDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const handleDelete = async (d: Domain) => {
    if (!confirm(`Supprimer le domaine "${d.name}" ?`)) return;
    try {
      const { data, error } = await supabase.from("domains").delete().eq("id", d.id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Aucune ligne supprimée (vérifiez les permissions RLS)");
      setDomains((prev) => prev.filter((x) => x.id !== d.id));
      toast.success("Domaine supprimé");
    } catch (err) {
      const msg = String(err);
      if (msg.includes("foreign key")) toast.error("Impossible de supprimer ce domaine : il est lié à des formations existantes");
      else toast.error("Erreur", { description: msg });
    }
  };

  const filtered = domains.filter(
    (d) => d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Domaines"
        subtitle={`${domains.length} domaine(s) référencé(s)`}
        icon={<LayoutList className="h-5 w-5" />}
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
            <Input
              placeholder="Rechercher un domaine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-2xl border-[#6d28d9]/15 bg-[#f8f9fc] pl-10 text-xs font-semibold text-[#1a1a2e] focus:border-[#6d28d9] focus:bg-white"
            />
          </div>
        </div>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <LayoutList className="mb-3 h-10 w-10 text-[#6d28d9]/40" />
              <p className="text-sm font-semibold text-[#1a1a2e]">Aucun domaine trouvé</p>
              <p className="text-sm text-[#64748b]">Essayez d’ajuster vos critères de recherche.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#f8f9fc]">
                <TableRow className="border-b border-[#6d28d9]/5 hover:bg-transparent">
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">Domaine</TableHead>
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">Statut</TableHead>
                  <TableHead className="w-16 py-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id} className="border-b border-[#6d28d9]/5 transition-colors hover:bg-[#f3f0ff]/30">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-[#6d28d9]/10 p-2 text-[#6d28d9]">
                          <LayoutList className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold text-[#1a1a2e]">{d.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${d.isActive ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${d.isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                        {d.isActive ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#64748b] hover:bg-[#6d28d9]/10 hover:text-[#6d28d9]"><MoreHorizontal className="h-4 w-4" /></Button>} />
                        <DropdownMenuContent align="end" className="w-44 rounded-2xl p-1.5 shadow-xl">
                          <DropdownMenuItem onClick={() => openEdit(d)} className="rounded-xl text-xs font-semibold">
                            <Edit className="mr-2 h-4 w-4 text-[#6d28d9]" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl text-xs font-semibold text-rose-600 focus:bg-rose-50" onClick={() => handleDelete(d)}>
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
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutList className="h-5 w-5 text-primary" />
              {editing ? "Modifier le domaine" : "Ajouter un domaine"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez les informations du domaine." : "Créez un nouveau domaine de formation (ex: Langues, Informatique)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Informations</h4>
              <div className="space-y-2">
                <Label htmlFor="domain-name">Nom</Label>
                <Input id="domain-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Informatique" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="domain-active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <Label htmlFor="domain-active" className="text-sm font-normal">Domaine actif</Label>
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
