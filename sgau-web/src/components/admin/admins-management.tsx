"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { MascotHeader } from "@/components/mascot/MascotHeader";
import { Mascot } from "@/components/mascot/Mascot";
import { EmptyState } from "@/components/mascot/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Loader2, Shield, UserCheck } from "lucide-react";
import { toast } from "sonner";

type AdminUser = {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: "admin";
  fullName: string;
  initials: string;
  isactive: boolean;
};

export function AdminsManagement({ initialAdmins }: { initialAdmins: AdminUser[] }) {
  const [admins, setAdmins] = useState<AdminUser[]>(
    initialAdmins.map((a) => ({
      ...a,
      fullName: a.fullName ?? `${a.firstname} ${a.lastname}`,
      initials:
        a.initials ??
        `${(a.firstname[0] ?? "").toUpperCase()}${(a.lastname[0] ?? "").toUpperCase()}`,
    }))
  );
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstname: "",
    lastname: "",
    isactive: true,
  });
  const supabase = createClient();

  const openAdd = () => {
    setEditing(null);
    setForm({ email: "", password: "", firstname: "", lastname: "", isactive: true });
    setDialogOpen(true);
  };
  const openEdit = (a: AdminUser) => {
    setEditing(a);
    setForm({
      email: a.email,
      password: "",
      firstname: a.firstname,
      lastname: a.lastname,
      isactive: a.isactive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const upd: Record<string, unknown> = {
          email: form.email,
          firstname: form.firstname,
          lastname: form.lastname,
          role: "admin",
          isactive: form.isactive,
        };
        await supabase.from("users").update(upd).eq("id", editing.id);
        setAdmins((prev) =>
          prev.map((a) =>
            a.id === editing.id
              ? {
                  ...a,
                  email: form.email,
                  firstname: form.firstname,
                  lastname: form.lastname,
                  fullName: `${form.firstname} ${form.lastname}`,
                  initials: `${(form.firstname[0] ?? "").toUpperCase()}${(form.lastname[0] ?? "").toUpperCase()}`,
                  isactive: form.isactive,
                }
              : a
          )
        );
        toast.success("Administrateur mis à jour");
      } else {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { firstname: form.firstname, lastname: form.lastname, role: "admin" },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error("Échec de la création");
        await supabase.rpc("admin_finalize_user", { p_uid: data.user.id, p_group_id: null });
        const { data: newUser } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (newUser) {
          const u = newUser as Record<string, unknown>;
          setAdmins((prev) => [
            {
              id: u.id as string,
              email: u.email as string,
              firstname: u.firstname as string,
              lastname: u.lastname as string,
              role: "admin",
              fullName: `${u.firstname as string} ${u.lastname as string}`,
              initials: `${((u.firstname as string)?.[0] ?? "").toUpperCase()}${((u.lastname as string)?.[0] ?? "").toUpperCase()}`,
              isactive: u.isactive as boolean,
            },
            ...prev,
          ]);
        }
        toast.success("Administrateur créé avec succès");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error("Erreur", { description: String(err) });
    }
    setSaving(false);
  };

  const handleDelete = async (a: AdminUser) => {
    if (!confirm(`Supprimer l'administrateur "${a.fullName}" ?`)) return;
    const { error } = await supabase.rpc("admin_delete_user", { p_uid: a.id });
    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }
    setAdmins((prev) => prev.filter((x) => x.id !== a.id));
    toast.success("Administrateur supprimé");
  };

  const filtered = admins.filter(
    (a) =>
      a.fullName.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Mascot Header */}
      <MascotHeader
        title="Gestion des Administrateurs"
        description="Gérez les comptes d'accès complet au panneau d'administration de l'établissement."
        pose="tous"
        mascotMessage={`${admins.length} administrateur(s) enregistré(s)`}
        badge="Accès & Sécurité"
      >
        <Button
          onClick={openAdd}
          className="h-11 rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-5 font-bold text-white shadow-md shadow-[#6d28d9]/20 hover:shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Compte
        </Button>
      </MascotHeader>

      {/* Main Table Card */}
      <Card className="overflow-hidden rounded-3xl border border-[#6d28d9]/10 bg-white shadow-xs">
        <div className="p-5 border-b border-[#6d28d9]/5">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d28d9]" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-2xl border-[#6d28d9]/15 bg-[#f8f9fc] pl-10 text-xs font-semibold text-[#1a1a2e] focus:border-[#6d28d9] focus:bg-white"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              pose="reflexion"
              title="Aucun administrateur trouvé"
              hint="Essayez d'ajuster vos critères de recherche."
            />
          ) : (
            <Table>
              <TableHeader className="bg-[#f8f9fc]">
                <TableRow className="border-b border-[#6d28d9]/5 hover:bg-transparent">
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">
                    Administrateur
                  </TableHead>
                  <TableHead className="hidden py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9] md:table-cell">
                    Email
                  </TableHead>
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">
                    Statut
                  </TableHead>
                  <TableHead className="w-16 py-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow
                    key={a.id}
                    className="border-b border-[#6d28d9]/5 transition-colors hover:bg-[#f3f0ff]/30"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0 rounded-2xl ring-2 ring-[#6d28d9]/20">
                          <AvatarFallback className="bg-gradient-to-br from-[#6d28d9] to-[#8b5cf6] text-xs font-bold text-white">
                            {a.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-[#1a1a2e]">{a.fullName}</p>
                          <p className="text-xs text-[#64748b] md:hidden">{a.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden py-4 text-xs font-semibold text-[#64748b] md:table-cell">
                      {a.email}
                    </TableCell>

                    <TableCell className="py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          a.isactive
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            a.isactive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                          }`}
                        />
                        {a.isactive ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>

                    <TableCell className="py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl text-[#64748b] hover:bg-[#6d28d9]/10 hover:text-[#6d28d9]"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-44 rounded-2xl p-1.5 shadow-xl">
                          <DropdownMenuItem
                            onClick={() => openEdit(a)}
                            className="rounded-xl text-xs font-semibold"
                          >
                            <Edit className="mr-2 h-4 w-4 text-[#6d28d9]" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-xl text-xs font-semibold text-rose-600 focus:bg-rose-50"
                            onClick={() => handleDelete(a)}
                          >
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
                  {editing ? "Modifier l'administrateur" : "Nouveau compte administrateur"}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748b]">
                  {editing
                    ? "Mise à jour des accès et informations personnelles."
                    : "Création d'un nouvel administrateur système."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-first" className="text-xs font-bold text-[#1a1a2e]">
                  Prénom
                </Label>
                <Input
                  id="admin-first"
                  value={form.firstname}
                  onChange={(e) => setForm({ ...form, firstname: e.target.value })}
                  placeholder="Jean"
                  className="rounded-xl border-[#6d28d9]/10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-last" className="text-xs font-bold text-[#1a1a2e]">
                  Nom
                </Label>
                <Input
                  id="admin-last"
                  value={form.lastname}
                  onChange={(e) => setForm({ ...form, lastname: e.target.value })}
                  placeholder="Dupont"
                  className="rounded-xl border-[#6d28d9]/10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-xs font-bold text-[#1a1a2e]">
                Adresse email
              </Label>
              <Input
                id="admin-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@itri.dz"
                className="rounded-xl border-[#6d28d9]/10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password" className="text-xs font-bold text-[#1a1a2e]">
                {editing ? "Nouveau mot de passe" : "Mot de passe"}
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? "Laisser vide si inchangé" : "Mot de passe sécurisé"}
                className="rounded-xl border-[#6d28d9]/10 text-xs"
              />
            </div>

            {editing && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="admin-active"
                  checked={form.isactive}
                  onChange={(e) => setForm({ ...form, isactive: e.target.checked })}
                  className="rounded border-[#6d28d9]/20 text-[#6d28d9] focus:ring-[#6d28d9]"
                />
                <Label htmlFor="admin-active" className="text-xs font-semibold text-[#1a1a2e]">
                  Compte actif
                </Label>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Enregistrer" : "Créer le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
