"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

type AdminUser = { id: string; email: string; firstname: string; lastname: string; role: "admin"; fullName: string; initials: string; isactive: boolean };

export function AdminsManagement({ initialAdmins }: { initialAdmins: AdminUser[] }) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins.map((a) => ({ ...a, fullName: a.fullName ?? `${a.firstname} ${a.lastname}`, initials: a.initials ?? `${(a.firstname[0] ?? "").toUpperCase()}${(a.lastname[0] ?? "").toUpperCase()}` })));
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", firstname: "", lastname: "", isactive: true });
  const supabase = createClient();

  const openAdd = () => { setEditing(null); setForm({ email: "", password: "", firstname: "", lastname: "", isactive: true }); setDialogOpen(true); };
  const openEdit = (a: AdminUser) => { setEditing(a); setForm({ email: a.email, password: "", firstname: a.firstname, lastname: a.lastname, isactive: a.isactive }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const upd: Record<string, unknown> = { email: form.email, firstname: form.firstname, lastname: form.lastname, role: "admin", isactive: form.isactive };
        await supabase.from("users").update(upd).eq("id", editing.id);
        setAdmins((prev) => prev.map((a) => a.id === editing.id ? { ...a, email: form.email, firstname: form.firstname, lastname: form.lastname, fullName: `${form.firstname} ${form.lastname}`, initials: `${(form.firstname[0] ?? "").toUpperCase()}${(form.lastname[0] ?? "").toUpperCase()}`, isactive: form.isactive } : a));
        toast.success("Administrateur mis à jour");
      } else {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: { data: { firstname: form.firstname, lastname: form.lastname, role: "admin" } },
        });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error("Échec de la création");
        await supabase.rpc("admin_finalize_user", { p_uid: data.user.id, p_group_id: null });
        const { data: newUser } = await supabase.from("users").select("*").eq("id", data.user.id).maybeSingle();
        if (newUser) {
          const u = newUser as Record<string, unknown>;
          setAdmins((prev) => [{
            id: u.id as string, email: u.email as string, firstname: u.firstname as string, lastname: u.lastname as string, role: "admin",
            fullName: `${u.firstname as string} ${u.lastname as string}`,
            initials: `${((u.firstname as string)?.[0] ?? "").toUpperCase()}${((u.lastname as string)?.[0] ?? "").toUpperCase()}`,
            isactive: u.isactive as boolean,
          }, ...prev]);
        }
        toast.success("Administrateur créé");
      }
      setDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const handleDelete = async (a: AdminUser) => {
    if (!confirm(`Supprimer l'administrateur "${a.fullName}" ?`)) return;
    const { data, error } = await supabase.rpc("admin_delete_user", { p_uid: a.id });
    if (error) { toast.error("Erreur", { description: error.message }); return; }
    setAdmins((prev) => prev.filter((x) => x.id !== a.id));
    toast.success("Administrateur supprimé");
  };

  const filtered = admins.filter(
    (a) => a.fullName.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administrateurs</h1>
          <p className="text-muted-foreground">{admins.length} administrateur(s)</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
      </div>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher par nom ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Administrateur</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">{a.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{a.fullName}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">{a.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{a.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs ${a.isactive ? "text-emerald-600" : "text-muted-foreground"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${a.isactive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      {a.isactive ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>} />
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEdit(a)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(a)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
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
              <Shield className="h-5 w-5 text-primary" />
              {editing ? "Modifier l'administrateur" : "Ajouter un administrateur"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez les informations du compte administrateur." : "Créez un nouveau compte administrateur avec accès au panneau d'administration."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Identité</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-first">Prénom</Label>
                  <Input id="admin-first" value={form.firstname} onChange={(e) => setForm({ ...form, firstname: e.target.value })} placeholder="Jean" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-last">Nom</Label>
                  <Input id="admin-last" value={form.lastname} onChange={(e) => setForm({ ...form, lastname: e.target.value })} placeholder="Dupont" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Adresse email</Label>
                <Input id="admin-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@univ.dz" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">{editing ? "Nouveau mot de passe" : "Mot de passe"}</Label>
                <Input id="admin-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Laisser vide pour conserver" : "Mot de passe temporaire"} minLength={editing ? 0 : 8} required={!editing} />
                {editing && <p className="text-xs text-muted-foreground">Laissez vide pour conserver le mot de passe actuel.</p>}
                {!editing && <p className="text-xs text-muted-foreground">Minimum 8 caractères.</p>}
              </div>
            </div>
            {editing && <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="admin-active" checked={form.isactive} onChange={(e) => setForm({ ...form, isactive: e.target.checked })} className="rounded" />
              <Label htmlFor="admin-active" className="text-sm font-normal">Compte actif</Label>
            </div>}
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
