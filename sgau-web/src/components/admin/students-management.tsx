"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { uuid } from "@/lib/uuid";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Loader2, GraduationCap, Users, BookOpen } from "lucide-react";
import { toast } from "sonner";

type Enrollment = {
  groupid: string;
  groupName: string;
  moduleName: string;
  status: string;
};

type Student = {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: "student";
  fullName: string;
  initials: string;
  isactive: boolean;
  enrollments: Enrollment[];
};

type GroupItem = {
  id: string;
  name: string;
  moduleName: string;
};

export function StudentsManagement({
  initialStudents,
  groups,
}: {
  initialStudents: Student[];
  groups: GroupItem[];
}) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstname: "",
    lastname: "",
    groupids: [] as string[],
    isactive: true,
  });
  const supabase = createClient();

  const openAdd = () => {
    setEditing(null);
    setForm({ email: "", password: "", firstname: "", lastname: "", groupids: [], isactive: true });
    setDialogOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      email: s.email,
      password: "",
      firstname: s.firstname,
      lastname: s.lastname,
      groupids: s.enrollments.map((e) => e.groupid),
      isactive: s.isactive,
    });
    setDialogOpen(true);
  };

  const toggleGroup = (groupid: string) => {
    setForm((prev) => ({
      ...prev,
      groupids: prev.groupids.includes(groupid)
        ? prev.groupids.filter((id) => id !== groupid)
        : [...prev.groupids, groupid],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const upd: Record<string, unknown> = {
          email: form.email,
          firstname: form.firstname,
          lastname: form.lastname,
          role: "student",
          isactive: form.isactive,
        };
        await supabase.from("users").update(upd).eq("id", editing.id);
        const { data: existingEnrolls } = await supabase
          .from("enrollments")
          .select("groupid, status")
          .eq("studentid", editing.id);
        const statusMap: Record<string, string> = {};
        for (const e of existingEnrolls ?? []) {
          const r = e as Record<string, unknown>;
          statusMap[r.groupid as string] = (r.status as string) ?? "active";
        }
        await supabase.from("enrollments").delete().eq("studentid", editing.id);
        if (form.groupids.length > 0) {
          await supabase.from("enrollments").insert(
            form.groupids.map((groupid) => ({
              id: uuid(),
              studentid: editing.id,
              groupid,
              status: statusMap[groupid] ?? "active",
            }))
          );
        }
        const enrolledGroups = groups.filter((g) => form.groupids.includes(g.id));
        setStudents((prev) =>
          prev.map((s) =>
            s.id === editing.id
              ? {
                  ...s,
                  email: form.email,
                  firstname: form.firstname,
                  lastname: form.lastname,
                  fullName: `${form.firstname} ${form.lastname}`,
                  initials: `${(form.firstname[0] ?? "").toUpperCase()}${(form.lastname[0] ?? "").toUpperCase()}`,
                  isactive: form.isactive,
                  enrollments: enrolledGroups.map((g) => ({
                    groupid: g.id,
                    groupName: g.name,
                    moduleName: g.moduleName,
                    status: statusMap[g.id] ?? "active",
                  })),
                }
              : s
          )
        );
        toast.success("Étudiant mis à jour");
      } else {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { firstname: form.firstname, lastname: form.lastname, role: "student" },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error("Échec de la création");
        await supabase.rpc("admin_finalize_user", { p_uid: data.user.id, p_group_id: null });
        if (form.groupids.length > 0) {
          await supabase.from("enrollments").insert(
            form.groupids.map((groupid) => ({
              id: uuid(),
              studentid: data.user!.id,
              groupid,
              status: "active",
            }))
          );
        }
        const { data: newUser } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (newUser) {
          const u = newUser as Record<string, unknown>;
          const enrolledGroups = groups.filter((g) => form.groupids.includes(g.id));
          setStudents((prev) => [
            {
              id: u.id as string,
              email: u.email as string,
              firstname: u.firstname as string,
              lastname: u.lastname as string,
              role: "student" as const,
              fullName: `${u.firstname as string} ${u.lastname as string}`,
              initials: `${((u.firstname as string)?.[0] ?? "").toUpperCase()}${((u.lastname as string)?.[0] ?? "").toUpperCase()}`,
              isactive: u.isactive as boolean,
              enrollments: enrolledGroups.map((g) => ({
                groupid: g.id,
                groupName: g.name,
                moduleName: g.moduleName,
                status: "active",
              })),
            },
            ...prev,
          ]);
        }
        toast.success("Étudiant créé avec succès");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error("Erreur", { description: String(err) });
    }
    setSaving(false);
  };

  const handleDelete = async (s: Student) => {
    if (!confirm(`Supprimer l'étudiant "${s.fullName}" ?`)) return;
    try {
      const { error } = await supabase.rpc("admin_delete_user", { p_uid: s.id });
      if (error) throw error;
      setStudents((prev) => prev.filter((x) => x.id !== s.id));
      toast.success("Étudiant supprimé");
    } catch (err) {
      toast.error("Erreur", { description: String(err) });
    }
  };

  const filtered = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Mascot Header */}
      <MascotHeader
        title="Gestion des Étudiants"
        description="Consultez, inscrivez et gérez l'affectation des étudiants aux groupes de formation."
        pose="tous"
        mascotMessage={`${students.length} étudiant(s) au total !`}
        badge="Communauté Étudiante"
      >
        <Button
          onClick={openAdd}
          className="h-11 rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-5 font-bold text-white shadow-md shadow-[#6d28d9]/20 hover:shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un Étudiant
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
              title="Aucun étudiant trouvé"
              hint="Aucun profil ne correspond à vos critères de recherche."
            />
          ) : (
            <Table>
              <TableHeader className="bg-[#f8f9fc]">
                <TableRow className="border-b border-[#6d28d9]/5 hover:bg-transparent">
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">
                    Étudiant
                  </TableHead>
                  <TableHead className="hidden py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9] md:table-cell">
                    Groupes Inscrits
                  </TableHead>
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">
                    Statut
                  </TableHead>
                  <TableHead className="w-16 py-4" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((s) => (
                  <TableRow
                    key={s.id}
                    className="border-b border-[#6d28d9]/5 transition-colors hover:bg-[#f3f0ff]/30"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0 rounded-2xl ring-2 ring-[#6d28d9]/20">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                            {s.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-[#1a1a2e]">{s.fullName}</p>
                          <p className="text-xs text-[#64748b]">{s.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden py-4 md:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        {s.enrollments.length === 0 ? (
                          <span className="text-xs text-[#64748b] italic">Aucun groupe</span>
                        ) : (
                          s.enrollments.map((e) => (
                            <Badge
                              key={e.groupid}
                              className="bg-[#6d28d9]/10 text-[#6d28d9] border-none text-[10px] font-bold"
                            >
                              {e.groupName} ({e.moduleName})
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          s.isactive
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            s.isactive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                          }`}
                        />
                        {s.isactive ? "Actif" : "Inactif"}
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
                            onClick={() => openEdit(s)}
                            className="rounded-xl text-xs font-semibold"
                          >
                            <Edit className="mr-2 h-4 w-4 text-[#6d28d9]" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-xl text-xs font-semibold text-rose-600 focus:bg-rose-50"
                            onClick={() => handleDelete(s)}
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
        <DialogContent className="sm:max-w-[520px] rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <Mascot pose="validation" size="sm" />
              <div>
                <DialogTitle className="text-lg font-bold text-[#1a1a2e]">
                  {editing ? "Modifier l'étudiant" : "Nouveau profil étudiant"}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748b]">
                  {editing
                    ? "Mise à jour des informations et inscriptions."
                    : "Création d'un compte étudiant et inscription aux groupes."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="st-first" className="text-xs font-bold text-[#1a1a2e]">
                  Prénom
                </Label>
                <Input
                  id="st-first"
                  value={form.firstname}
                  onChange={(e) => setForm({ ...form, firstname: e.target.value })}
                  placeholder="Sarah"
                  className="rounded-xl border-[#6d28d9]/10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st-last" className="text-xs font-bold text-[#1a1a2e]">
                  Nom
                </Label>
                <Input
                  id="st-last"
                  value={form.lastname}
                  onChange={(e) => setForm({ ...form, lastname: e.target.value })}
                  placeholder="Benali"
                  className="rounded-xl border-[#6d28d9]/10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="st-email" className="text-xs font-bold text-[#1a1a2e]">
                Adresse email
              </Label>
              <Input
                id="st-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="sarah.benali@student.dz"
                className="rounded-xl border-[#6d28d9]/10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="st-password" className="text-xs font-bold text-[#1a1a2e]">
                {editing ? "Nouveau mot de passe" : "Mot de passe"}
              </Label>
              <Input
                id="st-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? "Laisser vide si inchangé" : "Mot de passe initial"}
                className="rounded-xl border-[#6d28d9]/10 text-xs"
              />
            </div>

            {/* Groups Select Checkboxes */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold text-[#1a1a2e]">
                Inscrire aux groupes de formation
              </Label>
              <div className="max-h-40 overflow-y-auto space-y-2 rounded-2xl border border-[#6d28d9]/10 p-3 bg-[#f8f9fc]">
                {groups.length === 0 ? (
                  <p className="text-xs text-[#64748b]">Aucun groupe créé pour le moment.</p>
                ) : (
                  groups.map((g) => (
                    <div key={g.id} className="flex items-center gap-2.5">
                      <Checkbox
                        id={`grp-${g.id}`}
                        checked={form.groupids.includes(g.id)}
                        onCheckedChange={() => toggleGroup(g.id)}
                      />
                      <label
                        htmlFor={`grp-${g.id}`}
                        className="text-xs font-semibold text-[#1a1a2e] cursor-pointer"
                      >
                        {g.name} <span className="text-[#64748b]">({g.moduleName})</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {editing && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="st-active"
                  checked={form.isactive}
                  onChange={(e) => setForm({ ...form, isactive: e.target.checked })}
                  className="rounded border-[#6d28d9]/20 text-[#6d28d9] focus:ring-[#6d28d9]"
                />
                <Label htmlFor="st-active" className="text-xs font-semibold text-[#1a1a2e]">
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
              {editing ? "Enregistrer" : "Créer le profil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
