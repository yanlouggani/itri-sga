"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import { MascotHeader } from "@/components/mascot/MascotHeader";
import { Mascot } from "@/components/mascot/Mascot";
import { EmptyState } from "@/components/mascot/EmptyState";
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
  Search, Loader2, Plus, UserCheck, Trash2, Edit, MoreHorizontal, BookOpen,
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

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!active) return;
      const enriched: ProfessorWithGroups[] = initialProfessors.map((p) => ({
        ...p,
        fullName: `${p.firstname} ${p.lastname}`,
        initials: `${(p.firstname?.[0] ?? "").toUpperCase()}${(p.lastname?.[0] ?? "").toUpperCase()}`,
        groupids: [],
      }));
      setProfessors(enriched);
      await Promise.all(enriched.map((p) => loadGroups(p)));
    })();
    return () => {
      active = false;
    };
  }, [initialProfessors, supabase]);

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
      const { error } = await supabase.rpc("admin_delete_user", { p_uid: prof.id });
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
    <div className="space-y-8 pb-10">
      {/* Mascot Header */}
      <MascotHeader
        title="Gestion des Professeurs"
        description="Créez des comptes enseignants, gérez leurs informations et assignez les groupes qu'ils encadrent."
        pose="tous"
        mascotMessage={`${professors.length} professeur(s) référencé(s)`}
        badge="Équipe Enseignante"
      >
        <Button
          onClick={openAdd}
          className="h-11 rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-5 font-bold text-white shadow-md shadow-[#6d28d9]/20 hover:shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un Professeur
        </Button>
      </MascotHeader>

      {/* Search Bar */}
      <div className="rounded-3xl border border-[#6d28d9]/10 bg-white p-5 shadow-xs">
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

      {/* Professors Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((prof) => {
          const assigned = assignedGroupsFor(prof);
          return (
            <Card key={prof.id} className="overflow-hidden rounded-3xl border border-[#6d28d9]/10 bg-white shadow-xs hover:shadow-md transition-all relative">
              <div className="absolute top-3 right-3 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#64748b] hover:bg-[#6d28d9]/10 hover:text-[#6d28d9]"><MoreHorizontal className="h-4 w-4" /></Button>} />
                  <DropdownMenuContent align="end" className="w-44 rounded-2xl p-1.5 shadow-xl">
                    <DropdownMenuItem onClick={() => openEdit(prof)} className="rounded-xl text-xs font-semibold">
                      <Edit className="mr-2 h-4 w-4 text-[#6d28d9]" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl text-xs font-semibold text-rose-600 focus:bg-rose-50" onClick={() => handleDelete(prof)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardHeader className="pb-3 cursor-pointer" onClick={() => openGroups(prof)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-2xl ring-2 ring-[#6d28d9]/20">
                      <AvatarFallback className="bg-gradient-to-br from-[#6d28d9] to-[#8b5cf6] text-xs font-bold text-white">{prof.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-bold text-[#1a1a2e]">{prof.fullName}</CardTitle>
                      <p className="text-xs text-[#64748b]">{prof.email}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#6d28d9]/10 p-2">
                    <UserCheck className="h-4 w-4 text-[#6d28d9]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="cursor-pointer" onClick={() => openGroups(prof)}>
                <div className="flex flex-wrap gap-1.5">
                  {assigned.length === 0 && <span className="text-xs text-[#64748b]">Aucun groupe assigné</span>}
                  {assigned.slice(0, 4).map((g) => (
                    <Badge key={g.id} className="gap-1 rounded-full bg-[#6d28d9]/10 text-xs font-semibold text-[#6d28d9] border-none"><BookOpen className="h-3 w-3" />{g.name}</Badge>
                  ))}
                  {assigned.length > 4 && <Badge variant="outline" className="rounded-full text-xs border-[#6d28d9]/20 text-[#6d28d9]">+{assigned.length - 4}</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              pose="reflexion"
              title="Aucun professeur trouvé"
              hint="Aucun profil ne correspond à vos critères de recherche."
            />
          </div>
        )}
      </div>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <Mascot pose="validation" size="sm" />
              <div>
                <DialogTitle className="text-lg font-bold text-[#1a1a2e]">
                  {editing ? "Modifier le professeur" : "Nouveau compte professeur"}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748b]">
                  {editing ? "Modifiez les informations du professeur." : "Créez un compte avec accès à l'interface enseignant."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prof-first" className="text-xs font-bold text-[#1a1a2e]">Prénom</Label>
                <Input id="prof-first" value={form.firstname} onChange={(e) => setForm({ ...form, firstname: e.target.value })} placeholder="Ahmed" className="rounded-xl border-[#6d28d9]/10 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prof-last" className="text-xs font-bold text-[#1a1a2e]">Nom</Label>
                <Input id="prof-last" value={form.lastname} onChange={(e) => setForm({ ...form, lastname: e.target.value })} placeholder="Kadi" className="rounded-xl border-[#6d28d9]/10 text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-email" className="text-xs font-bold text-[#1a1a2e]">Adresse email</Label>
              <Input id="prof-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="professeur@univ.dz" className="rounded-xl border-[#6d28d9]/10 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-password" className="text-xs font-bold text-[#1a1a2e]">{editing ? "Nouveau mot de passe" : "Mot de passe"}</Label>
              <Input id="prof-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Laisser vide pour conserver" : "Mot de passe temporaire"} minLength={editing ? 0 : 8} required={!editing} className="rounded-xl border-[#6d28d9]/10 text-xs" />
              <p className="text-xs text-[#64748b]">{editing ? "Laissez vide pour conserver le mot de passe actuel." : "Minimum 8 caractères."}</p>
            </div>
            {editing && (
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="prof-active" checked={form.isactive} onChange={(e) => setForm({ ...form, isactive: e.target.checked })} className="rounded border-[#6d28d9]/20 text-[#6d28d9] focus:ring-[#6d28d9]" />
                <Label htmlFor="prof-active" className="text-xs font-semibold text-[#1a1a2e]">Compte actif</Label>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setUserDialogOpen(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleSaveUser} disabled={saving} className="rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Enregistrer" : "Créer le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Groups Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <Mascot pose="eureka" size="sm" />
              <div>
                <DialogTitle className="text-lg font-bold text-[#1a1a2e]">
                  {selectedProf && `Groupes — ${selectedProf.fullName}`}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748b]">Sélectionnez les groupes que ce professeur peut enseigner.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {loadingGroups ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#6d28d9]" /></div>
          ) : (
            <div className="space-y-1.5 py-3 max-h-[400px] overflow-y-auto">
              {groups.length === 0 && (
                <EmptyState compact pose="reflexion" title="Aucun groupe disponible" hint="Créez d'abord des groupes de formation." />
              )}
              {groups.map((g) => {
                const checked = selectedGroupIds.includes(g.id);
                return (
                  <label key={g.id} className={`flex items-center gap-3 rounded-2xl border p-3 cursor-pointer transition-colors ${checked ? "bg-[#6d28d9]/5 border-[#6d28d9]/30" : "border-[#6d28d9]/10 hover:bg-[#f8f9fc]"}`}>
                    <Checkbox checked={checked} onCheckedChange={() => toggleGroup(g.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a1a2e]">{g.name}</p>
                      <p className="text-xs text-[#64748b] truncate">{g.moduleName}</p>
                    </div>
                    {checked && <Badge className="shrink-0 rounded-full bg-[#6d28d9]/10 text-xs font-semibold text-[#6d28d9] border-none">Assigné</Badge>}
                  </label>
                );
              })}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleSaveGroups} disabled={saving || loadingGroups} className="rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
