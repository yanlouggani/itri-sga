"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Search, Plus, MoreHorizontal, Edit, Trash2, Loader2, LayoutList, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function DomainsPage() {
  const [rows, setRows] = useState<{ id: string; name: string; isactive: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<typeof rows[0] | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", isactive: true });
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: err } = await supabase.from("domains").select("id, name, isactive").order("name");
    if (err) { setError(err.message); } else { setRows(data ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ name: "", isactive: true }); setDialogOpen(true); };
  const openEdit = (r: typeof rows[0]) => { setEditing(r); setForm({ name: r.name, isactive: r.isactive }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const { error: err } = await supabase.from("domains").update({ name: form.name, isactive: form.isactive }).eq("id", editing.id);
        if (err) throw err;
        setRows((prev) => prev.map((r) => r.id === editing.id ? { ...r, ...form } : r));
        toast.success("Domaine mis à jour");
      } else {
        const id = uuid();
        const { error: err } = await supabase.from("domains").insert({ id, name: form.name, isactive: form.isactive });
        if (err) throw err;
        setRows((prev) => [{ id, ...form }, ...prev]);
        toast.success("Domaine créé");
      }
      setDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const handleDelete = async (r: typeof rows[0]) => {
    if (!confirm(`Supprimer le domaine "${r.name}" ?`)) return;
    const { error: err } = await supabase.from("domains").delete().eq("id", r.id);
    if (err) { toast.error("Erreur", { description: err.message }); return; }
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    toast.success("Domaine supprimé");
  };

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Domaines</h1>
          <p className="text-muted-foreground">{rows.length} domaine(s)</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Erreur de chargement</p>
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
                <TableHead>Domaine</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <LayoutList className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{r.name}</span>
                    </div>
                  </TableCell>
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
              {filtered.length === 0 && !error && (
                <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground">Aucun domaine trouvé</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutList className="h-5 w-5 text-primary" />
              {editing ? "Modifier le domaine" : "Ajouter un domaine"}
            </DialogTitle>
            <DialogDescription>{editing ? "Modifiez les informations." : "Créez un nouveau domaine."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Informatique" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="da" checked={form.isactive} onChange={(e) => setForm({ ...form, isactive: e.target.checked })} className="rounded" />
              <Label htmlFor="da">Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
