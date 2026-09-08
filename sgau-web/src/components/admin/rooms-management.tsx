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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Monitor,
  Projector,
  Loader2,
  DoorOpen,
} from "lucide-react";
import { toast } from "sonner";
import type { UniversityRoom } from "@/types/database";

type FormData = {
  name: string;
  code: string;
  capacity: number;
  hasprojector: boolean;
  hascomputers: boolean;
  isactive: boolean;
};

const emptyForm: FormData = {
  name: "",
  code: "",
  capacity: 0,
  hasprojector: false,
  hascomputers: false,
  isactive: true,
};

export function RoomsManagement({
  initialRooms,
}: {
  initialRooms: UniversityRoom[];
}) {
  const [rooms, setRooms] = useState<UniversityRoom[]>(initialRooms);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<UniversityRoom | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const filtered = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingRoom(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (room: UniversityRoom) => {
    setEditingRoom(room);
    setForm({
      name: room.name,
      code: room.code,
      capacity: room.capacity,
      hasprojector: room.hasprojector,
      hascomputers: room.hascomputers,
      isactive: room.isactive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingRoom) {
        const { error } = await supabase
          .from("rooms")
          .update(form)
          .eq("id", editingRoom.id);
        if (error) throw error;
        setRooms((prev) =>
          prev.map((r) =>
            r.id === editingRoom.id ? { ...r, ...form } : r
          )
        );
        toast.success("Salle mise à jour");
      } else {
        const { data, error } = await supabase
          .from("rooms")
          .insert({ ...form, id: uuid() })
          .select()
          .single();
        if (error) throw error;
        setRooms((prev) => [data, ...prev]);
        toast.success("Salle créée");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error("Erreur", { description: String(err) });
    }
    setSaving(false);
  };

  const handleDelete = async (room: UniversityRoom) => {
    if (!confirm(`Supprimer la salle ${room.name} ?`)) return;
    try {
      const { data, error } = await supabase.from("rooms").delete().eq("id", room.id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Aucune ligne supprimée (vérifiez les permissions RLS)");
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      toast.success("Salle supprimée");
    } catch (err) {
      const msg = String(err);
      if (msg.includes("foreign key")) toast.error("Impossible de supprimer cette salle : elle est utilisée dans des séances planifiées");
      else toast.error("Erreur", { description: msg });
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Mascot Header */}
      <MascotHeader
        title="Gestion des Salles"
        description="Référencez les salles de cours, leur capacité et les équipements disponibles."
        pose="tous"
        mascotMessage={`${rooms.length} salle(s) référencée(s)`}
        badge="Infrastructures"
      >
        <Button
          onClick={openAdd}
          className="h-11 rounded-2xl bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] px-5 font-bold text-white shadow-md shadow-[#6d28d9]/20 hover:shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une Salle
        </Button>
      </MascotHeader>

      {/* Main Table Card */}
      <Card className="overflow-hidden rounded-3xl border border-[#6d28d9]/10 bg-white shadow-xs">
        <div className="p-5 border-b border-[#6d28d9]/5">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6d28d9]" />
            <Input
              placeholder="Rechercher par nom ou code..."
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
              title="Aucune salle trouvée"
              hint="Aucune salle ne correspond à vos critères de recherche."
            />
          ) : (
            <Table>
              <TableHeader className="bg-[#f8f9fc]">
                <TableRow className="border-b border-[#6d28d9]/5 hover:bg-transparent">
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">Salle</TableHead>
                  <TableHead className="py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">Capacité</TableHead>
                  <TableHead className="hidden py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9] sm:table-cell">Équipement</TableHead>
                  <TableHead className="hidden py-4 text-xs font-extrabold uppercase tracking-wider text-[#6d28d9] sm:table-cell">Statut</TableHead>
                  <TableHead className="w-16 py-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((room) => (
                  <TableRow key={room.id} className="border-b border-[#6d28d9]/5 transition-colors hover:bg-[#f3f0ff]/30">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-[#6d28d9]/10 p-2">
                          <DoorOpen className="h-4 w-4 text-[#6d28d9]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1a1a2e]">{room.name}</p>
                          <p className="text-xs font-mono text-[#64748b] mt-0.5">{room.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge className="rounded-full bg-[#f8f9fc] px-3 py-1 text-xs font-bold text-[#6d28d9] border border-[#6d28d9]/10">{room.capacity}</Badge>
                    </TableCell>
                    <TableCell className="hidden py-4 sm:table-cell">
                      <div className="flex items-center gap-2">
                        {room.hasprojector && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                            <Projector className="h-3.5 w-3.5" />
                            Proj.
                          </span>
                        )}
                        {room.hascomputers && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#6d28d9]/10 px-2.5 py-0.5 text-xs font-semibold text-[#6d28d9]">
                            <Monitor className="h-3.5 w-3.5" />
                            PC
                          </span>
                        )}
                        {!room.hasprojector && !room.hascomputers && (
                          <span className="text-xs text-[#64748b]">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-4 sm:table-cell">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${room.isactive ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${room.isactive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                        {room.isactive ? "Actif" : "Inactif"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#64748b] hover:bg-[#6d28d9]/10 hover:text-[#6d28d9]">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-44 rounded-2xl p-1.5 shadow-xl">
                          <DropdownMenuItem onClick={() => openEdit(room)} className="rounded-xl text-xs font-semibold">
                            <Edit className="mr-2 h-4 w-4 text-[#6d28d9]" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-xl text-xs font-semibold text-rose-600 focus:bg-rose-50"
                            onClick={() => handleDelete(room)}
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
        <DialogContent className="sm:max-w-[550px] rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <Mascot pose="validation" size="sm" />
              <div>
                <DialogTitle className="text-lg font-bold text-[#1a1a2e]">
                  {editingRoom ? "Modifier la salle" : "Ajouter une salle"}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748b]">
                  {editingRoom ? "Modifiez les informations de la salle." : "Remplissez les informations pour créer une nouvelle salle de cours."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="room-name" className="text-xs font-bold text-[#1a1a2e]">Nom</Label>
                <Input id="room-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Amphi 1" className="rounded-xl border-[#6d28d9]/10 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-code" className="text-xs font-bold text-[#1a1a2e]">Code</Label>
                <Input id="room-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A1" className="rounded-xl border-[#6d28d9]/10 text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-capacity" className="text-xs font-bold text-[#1a1a2e]">Capacité</Label>
              <Input id="room-capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} placeholder="50" className="rounded-xl border-[#6d28d9]/10 text-xs" />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#1a1a2e] cursor-pointer">
                <Checkbox id="room-projector" checked={form.hasprojector} onCheckedChange={(checked: boolean) => setForm({ ...form, hasprojector: checked })} />
                Projecteur
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#1a1a2e] cursor-pointer">
                <Checkbox id="room-computers" checked={form.hascomputers} onCheckedChange={(checked: boolean) => setForm({ ...form, hascomputers: checked })} />
                Ordinateurs
              </label>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox id="room-active" checked={form.isactive} onCheckedChange={(checked: boolean) => setForm({ ...form, isactive: checked })} />
              <Label htmlFor="room-active" className="text-xs font-semibold text-[#1a1a2e]">Salle active</Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRoom ? "Enregistrer" : "Créer la salle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
