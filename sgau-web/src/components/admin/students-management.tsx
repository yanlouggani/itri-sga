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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Loader2, GraduationCap, Users } from "lucide-react";
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
        const { data: existingEnrolls } = await supabase.from("enrollments")
          .select("groupid, status").eq("studentid", editing.id);
        const statusMap: Record<string, string> = {};
        for (const e of existingEnrolls ?? []) {
          const r = e as Record<string, unknown>;
          statusMap[r.groupid as string] = (r.status as string) ?? "active";
        }
        const { data: delData, error: delErr } = await supabase.from("enrollments").delete().eq("studentid", editing.id).select();
        if (delErr) throw delErr;
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
          options: { data: { firstname: form.firstname, lastname: form.lastname, role: "student" } },
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
        const { data: newUser } = await supabase.from("users").select("*").eq("id", data.user.id).maybeSingle();
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
        toast.success("Étudiant créé");
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
      const { data, error } = await supabase.rpc("admin_delete_user", { p_uid: s.id });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Étudiants</h1>
          <p className="text-muted-foreground">{students.length} étudiant(s)</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter
        </Button>
      </div>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Groupes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs font-medium bg-amber-500/10 text-amber-600">
                          {s.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{s.fullName}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{s.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {s.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.enrollments.length > 0 ? (
                        s.enrollments.map((e) => (
                          <Badge key={e.groupid} variant="outline" className="text-xs gap-1">
                            <Users className="h-3 w-3" />
                            {e.groupName}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${
                        s.isactive ? "text-emerald-600" : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          s.isactive ? "bg-emerald-500" : "bg-muted-foreground"
                        }`}
                      />
                      {s.isactive ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEdit(s)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
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
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              {editing ? "Modifier l'étudiant" : "Ajouter un étudiant"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Modifiez les informations et les inscriptions de l'étudiant."
                : "Créez un nouveau compte étudiant et inscrivez-le à des groupes."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
                Identité
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stud-first">Prénom</Label>
                  <Input
                    id="stud-first"
                    value={form.firstname}
                    onChange={(e) => setForm({ ...form, firstname: e.target.value })}
                    placeholder="Sofia"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stud-last">Nom</Label>
                  <Input
                    id="stud-last"
                    value={form.lastname}
                    onChange={(e) => setForm({ ...form, lastname: e.target.value })}
                    placeholder="Bennani"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stud-email">Adresse email</Label>
                <Input
                  id="stud-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="etudiant@univ.dz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stud-password">
                  {editing ? "Mot de passe (laisser vide)" : "Mot de passe"}
                </Label>
                  <Input
                  id="stud-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editing ? "Conserver l'actuel" : "Mot de passe temporaire"}
                  minLength={editing ? 0 : 8} required={!editing}
                />
                {!editing && <p className="text-xs text-muted-foreground">Minimum 8 caractères.</p>}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
                Inscriptions aux groupes
              </h4>
              <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-1">
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun groupe disponible</p>
                ) : (
                  groups.map((g) => (
                    <label
                      key={g.id}
                      className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={form.groupids.includes(g.id)}
                        onCheckedChange={() => toggleGroup(g.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{g.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                            {g.moduleName}

                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
            {editing && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="stud-active"
                  checked={form.isactive}
                  onChange={(e) => setForm({ ...form, isactive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="stud-active" className="text-sm font-normal">
                  Compte actif
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
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
