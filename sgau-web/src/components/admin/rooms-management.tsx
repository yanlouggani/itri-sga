"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { uuid } from "@/lib/uuid";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Salles</h1>
          <p className="text-muted-foreground">{rooms.length} salle(s)</p>
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
              placeholder="Rechercher par nom, code ou bâtiment..."
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
                <TableHead>Salle</TableHead>
                <TableHead>Capacité</TableHead>
                <TableHead className="hidden sm:table-cell">Équipement</TableHead>
                <TableHead className="hidden sm:table-cell">Statut</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <DoorOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{room.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{room.code}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{room.capacity}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      {room.hasprojector && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <Projector className="h-3.5 w-3.5" />
                          Proj.
                        </span>
                      )}
                      {room.hascomputers && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                          <Monitor className="h-3.5 w-3.5" />
                          PC
                        </span>
                      )}
                      {!room.hasprojector && !room.hascomputers && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${
                        room.isactive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          room.isactive ? "bg-emerald-500" : "bg-muted-foreground"
                        }`}
                      />
                      {room.isactive ? "Actif" : "Inactif"}
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
                        <DropdownMenuItem onClick={() => openEdit(room)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
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
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-primary" />
              {editingRoom ? "Modifier la salle" : "Ajouter une salle"}
            </DialogTitle>
            <DialogDescription>
              {editingRoom ? "Modifiez les informations de la salle." : "Remplissez les informations pour créer une nouvelle salle de cours."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Localisation</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name">Nom</Label>
                  <Input id="room-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Amphi 1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-code">Code</Label>
                  <Input id="room-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-capacity">Capacité</Label>
                <Input id="room-capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} placeholder="50" />
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">Équipement</h4>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox id="room-projector" checked={form.hasprojector} onCheckedChange={(checked: boolean) => setForm({ ...form, hasprojector: checked })} />
                  Projecteur
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox id="room-computers" checked={form.hascomputers} onCheckedChange={(checked: boolean) => setForm({ ...form, hascomputers: checked })} />
                  Ordinateurs
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox id="room-active" checked={form.isactive} onCheckedChange={(checked: boolean) => setForm({ ...form, isactive: checked })} />
              <Label htmlFor="room-active" className="text-sm font-normal">Salle active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRoom ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
