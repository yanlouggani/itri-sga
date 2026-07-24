"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search, GraduationCap, Loader2, Plus, UserCheck, Trash2, Edit, MoreHorizontal, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import type { AppUser } from "@/types/database";

type GroupItem = {
  id: string; name: string; moduleid: string; moduleName: string;
};

type ProfessorWithGroups = AppUser & { groupids: string[] };

export function ProfessorsManagement({
  initialProfessors, groups,
}: {
  initialProfessors: AppUser[];
  groups: GroupItem[];
}) {
  const [professors, setProfessors] = useState<ProfessorWithGroups[]>([]);
  const [search, setSearch] = useState("");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProfessorWithGroups | null>(null);
  const [selectedProf, setSelectedProf] = useState<ProfessorWithGroups | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", firstname: "", lastname: "", isactive: true });
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const enriched: ProfessorWithGroups[] = initialProfessors.map((p) => ({
        ...p,
        fullName: `${p.firstname} ${p.lastname}`,
        initials: `${(p.firstname?.[0] ?? "").toUpperCase()}${(p.lastname?.[0] ?? "").toUpperCase()}`,
        groupids: [],
      }));
      setProfessors(enriched);
      await Promise.all(enriched.map((p) => loadGroups(p)));
    })();
  }, []);

  const loadGroups = async (prof: AppUser) => {
    const { data } = await supabase
      .from("professor_groups")
      .select("groupid")
      .eq("professorid", prof.id);
    if (data) {
      const gids = data.map((r: Record<string, unknown>) => r.groupid as string);
      setProfessors((prev) => prev.map((p) => p.id === prof.id ? { ...p, groupids: gids } : p));
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ email: "", password: "", firstname: "", lastname: "", isactive: true });
    setUserDialogOpen(true);
  };

  const openEdit = (prof: ProfessorWithGroups) => {
    setEditing(prof);
    setForm({ email: prof.email, password: "", firstname: prof.firstname, lastname: prof.lastname, isactive: prof.isactive });
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    setSaving(true);
    try {
      if (editing) {
        const upd: Record<string, unknown> = { email: form.email, firstname: form.firstname, lastname: form.lastname, role: "professor", isactive: form.isactive };
        await supabase.from("users").update(upd).eq("id", editing.id);
        setProfessors((prev) => prev.map((p) =>
          p.id === editing.id ? { ...p, email: form.email, firstname: form.firstname, lastname: form.lastname, fullName: `${form.firstname} ${form.lastname}`, initials: `${(form.firstname[0] ?? "").toUpperCase()}${(form.lastname[0] ?? "").toUpperCase()}`, isactive: form.isactive } : p
        ));
        toast.success("Professeur mis à jour");
      } else {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: { data: { firstname: form.firstname, lastname: form.lastname, role: "professor" } },
        });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error("Échec de la création");
        await supabase.rpc("admin_finalize_user", { p_uid: data.user.id, p_group_id: null });
        const { data: newUser } = await supabase.from("users").select("*").eq("id", data.user.id).maybeSingle();
        if (newUser) {
          const u = newUser as Record<string, unknown>;
          const prof: ProfessorWithGroups = {
            id: u.id as string, email: u.email as string, firstname: u.firstname as string, lastname: u.lastname as string, role: "professor",
            fullName: `${u.firstname as string} ${u.lastname as string}`,
            initials: `${((u.firstname as string)?.[0] ?? "").toUpperCase()}${((u.lastname as string)?.[0] ?? "").toUpperCase()}`,
            isactive: u.isactive as boolean, identifier: null, groupids: [],
          };
          setProfessors((prev) => [prof, ...prev]);
        }
        toast.success("Professeur créé");
      }
      setUserDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const handleDelete = async (prof: ProfessorWithGroups) => {
    if (!confirm(`Supprimer le professeur "${prof.fullName}" ?`)) return;
    try {
      const { data, error } = await supabase.rpc("admin_delete_user", { p_uid: prof.id });
      if (error) throw error;
      setProfessors((prev) => prev.filter((x) => x.id !== prof.id));
      toast.success("Professeur supprimé");
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
  };

  const openGroups = async (prof: ProfessorWithGroups) => {
    setSelectedProf(prof);
    setLoadingGroups(true);
    setSelectedGroupIds(prof.groupids);
    setGroupDialogOpen(true);
    setLoadingGroups(false);
  };

  const toggleGroup = (groupid: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupid) ? prev.filter((id) => id !== groupid) : [...prev, groupid]
    );
  };

  const handleSaveGroups = async () => {
    if (!selectedProf) return;
    setSaving(true);
    try {
      await supabase.from("professor_groups").delete().eq("professorid", selectedProf.id);
      if (selectedGroupIds.length > 0) {
        await supabase.from("professor_groups").insert(
          selectedGroupIds.map((groupid) => ({ professorid: selectedProf.id, groupid }))
        );
      }
      setProfessors((prev) => prev.map((p) =>
        p.id === selectedProf.id ? { ...p, groupids: selectedGroupIds } : p
      ));
      toast.success("Groupes mis à jour");
      setGroupDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const filtered = professors.filter(
    (p) => p.fullName.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
  );

  const assignedGroupsFor = (prof: ProfessorWithGroups) =>
    groups.filter((g) => prof.groupids.includes(g.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Professeurs</h1>
          <p className="text-muted-foreground">{professors.length} professeur(s)</p>
        </div>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher par nom ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((prof) => {
          const assigned = assignedGroupsFor(prof);
          return (
            <Card key={prof.id} className="border-border/50 relative">
              <div className="absolute top-3 right-3 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>} />
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => openEdit(prof)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(prof)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardHeader className="pb-3 cursor-pointer" onClick={() => openGroups(prof)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm font-medium bg-emerald-500/10 text-emerald-600">{prof.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{prof.fullName}</CardTitle>
                      <p className="text-xs text-muted-foreground">{prof.email}</p>
                    </div>
                  </div>
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                </div>
              </CardHeader>
              <CardContent className="cursor-pointer" onClick={() => openGroups(prof)}>
                <div className="flex flex-wrap gap-1.5">
                  {assigned.length === 0 && <span className="text-xs text-muted-foreground">Aucun groupe assigné</span>}
                  {assigned.slice(0, 4).map((g) => (
                    <Badge key={g.id} variant="secondary" className="gap-1 text-xs"><BookOpen className="h-3 w-3" />{g.name}</Badge>
                  ))}
                  {assigned.length > 4 && <Badge variant="outline" className="text-xs">+{assigned.length - 4}</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Aucun professeur trouvé</p>
          </div>
        )}
      </div>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              {editing ? "Modifier le professeur" : "Ajouter un professeur"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez les informations du professeur." : "Créez un nouveau compte professeur avec accès à l'interface enseignant."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Identité</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prof-first">Prénom</Label>
                  <Input id="prof-first" value={form.firstname} onChange={(e) => setForm({ ...form, firstname: e.target.value })} placeholder="Ahmed" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof-last">Nom</Label>
                  <Input id="prof-last" value={form.lastname} onChange={(e) => setForm({ ...form, lastname: e.target.value })} placeholder="Kadi" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prof-email">Adresse email</Label>
                <Input id="prof-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="professeur@univ.dz" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prof-password">{editing ? "Nouveau mot de passe" : "Mot de passe"}</Label>
                <Input id="prof-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Laisser vide pour conserver" : "Mot de passe temporaire"} minLength={editing ? 0 : 8} required={!editing} />
                {editing && <p className="text-xs text-muted-foreground">Laissez vide pour conserver le mot de passe actuel.</p>}
                {!editing && <p className="text-xs text-muted-foreground">Minimum 8 caractères.</p>}
              </div>
            </div>
            {editing && <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="prof-active" checked={form.isactive} onChange={(e) => setForm({ ...form, isactive: e.target.checked })} className="rounded" />
              <Label htmlFor="prof-active" className="text-sm font-normal">Compte actif</Label>
            </div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {selectedProf && `Groupes — ${selectedProf.fullName}`}
            </DialogTitle>
            <DialogDescription>Sélectionnez les groupes que ce professeur peut enseigner.</DialogDescription>
          </DialogHeader>
          {loadingGroups ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-1 py-4 max-h-[400px] overflow-y-auto">
              {groups.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg bg-muted/30">
                  Aucun groupe disponible. Créez d&apos;abord des groupes.
                </div>
              )}
              {groups.map((g) => {
                const checked = selectedGroupIds.includes(g.id);
                return (
                  <label key={g.id} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${checked ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"}`}>
                    <Checkbox checked={checked} onCheckedChange={() => toggleGroup(g.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{g.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{g.moduleName}</p>
                    </div>
                    {checked && <Badge variant="outline" className="shrink-0 text-xs">Assigné</Badge>}
                  </label>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveGroups} disabled={saving || loadingGroups}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
