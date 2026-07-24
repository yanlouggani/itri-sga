"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/browser";
import { uuid } from "@/lib/uuid";
import { getWeekStart, addWeeks } from "@/lib/week";
import type { TimeSlot, WeeklyEntry } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Edit, Trash2, Clock, MapPin, Users, GraduationCap,
  Loader2, Calendar, ChevronLeft, ChevronRight, AlertTriangle, History,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DAYS = [
  { value: 0, label: "Dim" }, { value: 1, label: "Lun" },
  { value: 2, label: "Mar" }, { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" }, { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
];

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];

type Room = { id: string; name: string };
type GroupItem = { id: string; name: string; moduleid: string; moduleName: string };
type Professor = { id: string; name: string };

function getModuleColor(moduleid: string | undefined): string {
  const id = moduleid ?? "";
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInheritedEntries(allEntries: WeeklyEntry[], groupId: string, weekStart: string): WeeklyEntry[] {
  const map = new Map<string, WeeklyEntry>();
  const sorted = [...allEntries]
    .filter((e) => e.groupid === groupId && e.week_start < weekStart && e.professorid)
    .sort((a, b) => a.week_start.localeCompare(b.week_start));
  for (const e of sorted) {
    map.set(`${e.dayofweek}-${e.starttime}`, e);
  }
  return Array.from(map.values());
}

function getEffectiveForWeek(allEntries: WeeklyEntry[], groupId: string, weekStart: string): WeeklyEntry[] {
  const direct = allEntries.filter((e) => e.groupid === groupId && e.week_start === weekStart);
  if (direct.length > 0) {
    const map = new Map<string, WeeklyEntry>();
    for (const e of direct) {
      if (e.professorid) map.set(`${e.dayofweek}-${e.starttime}`, e);
    }
    return Array.from(map.values());
  }
  return getInheritedEntries(allEntries, groupId, weekStart);
}

export function ScheduleManagement({
  initialEntries, modifiedWeeks, rooms, groups, professors,
}: {
  initialEntries: WeeklyEntry[];
  modifiedWeeks: string[];
  rooms: Room[];
  groups: GroupItem[];
  professors: Professor[];
}) {
  const supabase = createClient();
  const [entries, setEntries] = useState<WeeklyEntry[]>(initialEntries);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [profGroupLinks, setProfGroupLinks] = useState<Record<string, string[]>>({});
  const [profLinksLoading, setProfLinksLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeeklyEntry | null>(null);
  const [clickedDay, setClickedDay] = useState<number | null>(null);
  const [clickedSlotId, setClickedSlotId] = useState<string | null>(null);
  const [form, setForm] = useState({
    timeslotid: "", professorid: "", roomid: "",
  });
  const [saving, setSaving] = useState(false);
  const [localModifiedWeeks, setLocalModifiedWeeks] = useState<string[]>(modifiedWeeks);

  useEffect(() => {
    supabase.from("time_slots").select("*").order("orderindex").then(({ data }) => {
      if (data) setTimeSlots(data as TimeSlot[]);
    });
  }, []);

  const loadProfLinks = useCallback(async () => {
    setProfLinksLoading(true);
    const { data, error } = await supabase.from("professor_groups").select("professorid, groupid");
    if (!error && data) {
      const map: Record<string, string[]> = {};
      for (const r of data as Record<string, unknown>[]) {
        const pid = r.professorid as string;
        const gid = r.groupid as string;
        if (!map[gid]) map[gid] = [];
        map[gid].push(pid);
      }
      setProfGroupLinks(map);
    }
    setProfLinksLoading(false);
  }, []);

  useEffect(() => { loadProfLinks(); }, [loadProfLinks]);
  useEffect(() => { if (selectedGroupId) loadProfLinks(); }, [selectedGroupId, loadProfLinks]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const effectiveEntries = useMemo(
    () => getEffectiveForWeek(entries, selectedGroupId, currentWeekStart),
    [entries, selectedGroupId, currentWeekStart],
  );

  const allWeekEffective = useMemo(() => {
    const groups = [...new Set(entries.map(e => e.groupid))];
    const result: WeeklyEntry[] = [];
    for (const gid of groups) {
      result.push(...getEffectiveForWeek(entries, gid, currentWeekStart));
    }
    return result;
  }, [entries, currentWeekStart]);

  const entryMap = useMemo(() => {
    const m: Record<string, Record<string, WeeklyEntry>> = {};
    for (const e of effectiveEntries) {
      if (!m[e.dayofweek]) m[e.dayofweek] = {};
      m[e.dayofweek][e.starttime] = e;
    }
    return m;
  }, [effectiveEntries]);

  const sortedSlots = useMemo(() => {
    const seen = new Set<string>();
    const slots: TimeSlot[] = [];
    for (const ts of timeSlots) {
      if (!seen.has(ts.starttime)) { seen.add(ts.starttime); slots.push(ts); }
    }
    return slots.sort((a, b) => a.orderindex - b.orderindex);
  }, [timeSlots]);

  const getSlotById = (id: string) => timeSlots.find((ts) => ts.id === id);
  const slot = getSlotById(form.timeslotid);
  const day = editingEntry ? editingEntry.dayofweek : (clickedDay ?? 0);

  const availableProfessors = useMemo(() => {
    const pids = profGroupLinks[selectedGroupId] ?? [];
    return professors.filter((p) => pids.includes(p.id));
  }, [profGroupLinks, selectedGroupId, professors]);

  const existingForKey = useMemo(() => {
    const key = `${day}-${slot?.starttime ?? ""}`;
    return effectiveEntries.find((e) => `${e.dayofweek}-${e.starttime}` === key) ?? null;
  }, [effectiveEntries, day, slot]);

  const conflicts = useMemo(() => {
    if (!form.professorid && !form.roomid) return [];
    const result: string[] = [];
    const newStart = slot?.starttime;
    const newEnd = slot?.endtime;
    for (const e of allWeekEffective) {
      if (editingEntry && e.id === editingEntry.id) continue;
      if (e.dayofweek !== day) continue;
      if (!e.professorid) continue;
      const overlap = newStart && newEnd && e.starttime && e.endtime
        ? newStart < e.endtime && newEnd > e.starttime
        : false;
      if (!overlap) continue;
      if (e.professorid === form.professorid) {
        const pn = professors.find((p) => p.id === e.professorid)?.name ?? e.professorid;
        result.push(`Professeur déjà occupé : ${pn} (${DAYS.find(d => d.value === e.dayofweek)?.label} ${e.starttime}-${e.endtime})`);
      }
      if (e.roomid === form.roomid) {
        const rn = rooms.find((r) => r.id === e.roomid)?.name ?? e.roomid;
        result.push(`Salle déjà occupée : ${rn} (${DAYS.find(d => d.value === e.dayofweek)?.label} ${e.starttime}-${e.endtime})`);
      }
    }
    return [...new Set(result)];
  }, [form.professorid, form.roomid, day, slot?.starttime, slot?.endtime, allWeekEffective, editingEntry, professors, rooms]);

  const weekLabel = useMemo(() => {
    const s = new Date(currentWeekStart + "T00:00:00");
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    const sameYear = s.getFullYear() === e.getFullYear();
    const startFmt = format(s, "EEEE d MMMM" + (sameYear ? "" : " yyyy"), { locale: fr });
    const endFmt = format(e, "EEEE d MMMM yyyy", { locale: fr });
    return `du ${startFmt} au ${endFmt}`;
  }, [currentWeekStart]);

  const openAdd = async (day?: number, starttime?: string) => {
    if (!selectedGroup) return;
    setEditingEntry(null);
    setClickedDay(day ?? null);
    setProfLinksLoading(true);
    const { data: linkData } = await supabase
      .from("professor_groups")
      .select("professorid")
      .eq("groupid", selectedGroupId);
    const pids = (linkData ?? []).map((r: Record<string, unknown>) => r.professorid as string);
    if (pids.length > 0) {
      setProfGroupLinks((prev) => ({ ...prev, [selectedGroupId]: pids }));
    }
    setProfLinksLoading(false);
    const ts = starttime ? timeSlots.find((t) => t.starttime === starttime) : timeSlots[0];
    setClickedSlotId(ts?.id ?? null);

    const key = `${day}-${starttime ?? ts?.starttime ?? ""}`;
    const existing = effectiveEntries.find((e) => `${e.dayofweek}-${e.starttime}` === key) ?? null;

    const tsId = ts?.id ?? "";
    const finalTimeslotId = tsId || (existing && timeSlots.find((t) => t.starttime === existing.starttime)?.id) || "";
    const autoProf = pids.length === 1 ? pids[0] : existing?.professorid ?? "";
    setForm({
      timeslotid: finalTimeslotId,
      professorid: autoProf,
      roomid: existing?.roomid ?? "",
    });
    setDialogOpen(true);
  };

  const openEdit = (e: WeeklyEntry) => {
    setEditingEntry(e);
    setClickedDay(e.dayofweek);
    setClickedSlotId(e.starttime ? (timeSlots.find((t) => t.starttime === e.starttime)?.id ?? null) : null);
    setForm({
      timeslotid: timeSlots.find((t) => t.starttime === e.starttime)?.id ?? "",
      professorid: e.professorid,
      roomid: e.roomid,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ts = getSlotById(form.timeslotid);
      if (!ts) { toast.error("Sélectionnez un créneau"); setSaving(false); return; }
      if (!selectedGroup) { toast.error("Aucun groupe sélectionné"); setSaving(false); return; }
      if (!form.professorid || !form.roomid) { toast.error("Sélectionnez un professeur et une salle"); setSaving(false); return; }

      if (editingEntry && editingEntry.week_start !== currentWeekStart) {
        await ensureFork({ dayofweek: editingEntry.dayofweek, starttime: editingEntry.starttime });
      } else if (!editingEntry) {
        await ensureFork();
      }

      const payload = {
        id: uuid(),
        groupid: selectedGroupId,
        week_start: currentWeekStart,
        dayofweek: editingEntry ? editingEntry.dayofweek : (clickedDay ?? 1),
        starttime: ts.starttime,
        endtime: ts.endtime,
        professorid: form.professorid,
        roomid: form.roomid,
      };

      if (editingEntry && editingEntry.week_start === currentWeekStart) {
        const { error: delErr } = await supabase.from("weekly_entries").delete().eq("id", editingEntry.id).select();
        if (delErr) throw delErr;
      }

      const { error } = await supabase.from("weekly_entries").insert(payload);
      if (error) throw error;

      const prof = professors.find((p) => p.id === form.professorid);
      const room = rooms.find((r) => r.id === form.roomid);
      const newEntry: WeeklyEntry = { ...payload, professorName: prof?.name, roomName: room?.name, groupName: selectedGroup.name, moduleName: selectedGroup.moduleName };

      setEntries((prev) => {
        let filtered = prev;
        if (editingEntry) filtered = filtered.filter((e) => e.id !== editingEntry.id);
        filtered = filtered.filter((e) =>
          !(e.groupid === selectedGroupId && e.week_start === currentWeekStart && e.dayofweek === newEntry.dayofweek && e.starttime === newEntry.starttime)
        );
        return [...filtered, newEntry];
      });

      setLocalModifiedWeeks((prev) => prev.includes(currentWeekStart) ? prev : [...prev, currentWeekStart]);

      toast.success(editingEntry ? "Créneau mis à jour pour cette semaine" : "Créneau ajouté");
      setDialogOpen(false);
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
    setSaving(false);
  };

  const handleDelete = async (entry: WeeklyEntry) => {
    try {
      if (entry.week_start === currentWeekStart) {
        const { error } = await supabase.from("weekly_entries").delete().eq("id", entry.id);
        if (error) throw error;
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      } else {
        await ensureFork({ dayofweek: entry.dayofweek, starttime: entry.starttime });
      }
      setLocalModifiedWeeks((prev) => prev.includes(currentWeekStart) ? prev : [...prev, currentWeekStart]);
      toast.success("Créneau supprimé pour cette semaine");
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
  };

  const handleRevert = async (day: number, starttime: string) => {
    try {
      const toDelete = entries.filter(
        (e) => e.groupid === selectedGroupId && e.week_start === currentWeekStart && e.dayofweek === day && e.starttime === starttime
      );
      for (const e of toDelete) {
        await supabase.from("weekly_entries").delete().eq("id", e.id);
      }
      setEntries((prev) => prev.filter((e) => !toDelete.find((d) => d.id === e.id)));
      toast.success("Créneau réinitialisé pour cette semaine");
    } catch (err) { toast.error("Erreur", { description: String(err) }); }
  };

  const getModuleNameByGroup = (gid: string) => {
    const g = groups.find((g) => g.id === gid);
    return g?.moduleName ?? "";
  };
  const getProfessorName = (id: string | null | undefined) => {
    if (!id) return "—";
    return professors.find((p) => p.id === id)?.name ?? id;
  };
  const getRoomName = (id: string | null | undefined) => {
    if (!id) return "—";
    return rooms.find((r) => r.id === id)?.name ?? id;
  };

  const ensureFork = useCallback(async (excludeSlot?: { dayofweek: number; starttime: string }) => {
    if (!selectedGroupId) return false;
    const hasDirect = entries.some(e => e.groupid === selectedGroupId && e.week_start === currentWeekStart);
    if (hasDirect) return false;

    const inherited = getInheritedEntries(entries, selectedGroupId, currentWeekStart);
    const toCopy = excludeSlot
      ? inherited.filter(e => !(e.dayofweek === excludeSlot.dayofweek && e.starttime === excludeSlot.starttime))
      : inherited;
    if (toCopy.length === 0) return false;

    const copies = toCopy.map(e => ({
      id: uuid(), groupid: e.groupid, week_start: currentWeekStart,
      dayofweek: e.dayofweek, starttime: e.starttime, endtime: e.endtime,
      professorid: e.professorid, roomid: e.roomid,
    }));

    const { error } = await supabase.from("weekly_entries").insert(copies);
    if (error) throw error;

    setEntries(prev => [...prev, ...copies.map(c => ({
      ...c,
      professorName: professors.find(p => p.id === c.professorid)?.name,
      roomName: rooms.find(r => r.id === c.roomid)?.name,
      groupName: selectedGroup?.name,
      moduleName: selectedGroup?.moduleName || getModuleNameByGroup(c.groupid),
    } as WeeklyEntry))]);

    return true;
  }, [entries, selectedGroupId, currentWeekStart, selectedGroup, professors, rooms]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emploi du temps</h1>
           <p className="text-muted-foreground">{entries.length} entrée(s) dans {localModifiedWeeks.length} semaine(s)</p>
        </div>
        <Select value={selectedGroupId} onValueChange={(v) => { if (v) setSelectedGroupId(v); }}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Sélectionner un groupe…">
              {(v: string) => groups.find((g) => g.id === v) ? `${groups.find((g) => g.id === v)?.name} - ${groups.find((g) => g.id === v)?.moduleName}` : v}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name} - {g.moduleName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedGroupId ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Calendar className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">Sélectionnez un groupe</p>
          <p className="text-sm">pour voir et modifier son emploi du temps</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selectedGroup?.name}</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-muted-foreground">{effectiveEntries.filter(e => e.professorid).length} créneau(x)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-3 min-w-[200px] text-center">
                  {weekLabel}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}>
                Aujourd&apos;hui
              </Button>
              {localModifiedWeeks.length > 0 && (
                       <Select value="" onValueChange={(v) => { if (v) setCurrentWeekStart(v); }}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue placeholder="Semaines modifiées">
                      {(v: string) => v ? `Semaine du ${format(new Date(v + "T00:00:00"), "dd/MM", { locale: fr })}` : "Semaines modifiées"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {localModifiedWeeks.sort().map((ws) => (
                      <SelectItem key={ws} value={ws}>{format(new Date(ws + "T00:00:00"), "dd/MM/yy", { locale: fr })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>


          <div className="overflow-auto border rounded-lg">
            <div className="min-w-[900px]">
              <div className="grid" style={{ gridTemplateColumns: `100px repeat(${DAYS.length}, 1fr)` }}>
                <div className="sticky left-0 bg-background z-10 border-r border-b p-3 font-semibold text-sm text-muted-foreground">Créneau</div>
                {DAYS.map((day) => (
                  <div key={day.value} className="border-r border-b p-3 font-semibold text-sm text-center bg-muted/30 last:border-r-0">
                    {day.label}
                  </div>
                ))}

                {sortedSlots.map((slotItem) => (
                  <div key={slotItem.id} className="contents">
                    <div className="sticky left-0 bg-background z-10 border-r border-b p-3 text-sm text-muted-foreground whitespace-nowrap flex items-center gap-1.5">
                      <Clock className="h-4 w-4 shrink-0" />
                      {slotItem.label}
                    </div>
                    {DAYS.map((d) => {
                      const entry = entryMap[d.value]?.[slotItem.starttime];
                      const hasEntry = entry && entry.professorid;
                      return (
                          <div
                            key={`${d.value}-${slotItem.id}`}
                            className={`border-r border-b p-2 min-h-[110px] last:border-r-0 transition-colors
                              ${hasEntry ? "cursor-pointer hover:bg-accent/50" : "cursor-pointer hover:bg-accent/30"}
                            `}
                            onClick={() => hasEntry ? openEdit(entry) : openAdd(d.value, slotItem.starttime)}
                          >
                            {hasEntry ? (
                              <div className="h-full flex flex-col gap-1 p-1.5 rounded relative group/cell" style={{
                                borderLeft: `4px solid ${getModuleColor(getModuleNameByGroup(entry.groupid))}`,
                                backgroundColor: `${getModuleColor(getModuleNameByGroup(entry.groupid))}08`,
                              }}>
                                <span className="text-sm font-semibold leading-tight line-clamp-2">
                                  {getModuleNameByGroup(entry.groupid)}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{getProfessorName(entry.professorid)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{getRoomName(entry.roomid)}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-auto">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200">
                                    {format(new Date(entry.week_start + "T00:00:00"), "dd/MM")}
                                  </Badge>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(entry);
                                    }}
                                    className="ml-auto p-1 hover:text-destructive transition-colors"
                                    title="Supprimer ce créneau"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center">
                                <Plus className="h-6 w-6 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors" />
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {effectiveEntries.filter(e => e.professorid).length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                Voir tous les créneaux en liste
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left p-2 font-medium">Jour</th>
                      <th className="text-left p-2 font-medium">Horaire</th>
                      <th className="text-left p-2 font-medium">Module</th>
                      <th className="text-left p-2 font-medium">Prof</th>
                      <th className="text-left p-2 font-medium">Salle</th>
                      <th className="text-left p-2 font-medium">Semaine</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveEntries
                      .filter((entry) => entry.professorid)
                      .sort((a, b) => a.dayofweek - b.dayofweek || a.starttime.localeCompare(b.starttime))
                      .map((entry) => (
                          <tr key={entry.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-2">{DAYS.find(d => d.value === entry.dayofweek)?.label}</td>
                            <td className="p-2 whitespace-nowrap">{entry.starttime}–{entry.endtime}</td>
                            <td className="p-2 font-medium">{getModuleNameByGroup(entry.groupid)}</td>
                            <td className="p-2 text-muted-foreground">{getProfessorName(entry.professorid)}</td>
                            <td className="p-2 text-muted-foreground">{getRoomName(entry.roomid)}</td>
                            <td className="p-2">
                              <span className="text-[10px] font-mono">
                                {format(new Date(entry.week_start + "T00:00:00"), "dd/MM")}
                              </span>
                            </td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                <button onClick={() => openEdit(entry)} className="p-1 hover:text-primary"><Edit className="h-3.5 w-3.5" /></button>
                                <button onClick={() => handleDelete(entry)} className="p-1 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {editingEntry ? "Modifier le créneau" : "Ajouter un créneau"}
            </DialogTitle>
            {selectedGroup && (
              <DialogDescription>
                {DAYS.find(d => d.value === day)?.label} {slot?.label ?? ""} — {selectedGroup.name}
                {editingEntry ? "" : ` (semaine du ${weekLabel})`}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Module</Label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {selectedGroup?.moduleName || "—"}
              </div>
            </div>

            {existingForKey && !editingEntry && existingForKey.professorid && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
                <History className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  Un créneau existe déjà pour ce jour/heure dans une semaine antérieure
                  ({getProfessorName(existingForKey.professorid)}, {getRoomName(existingForKey.roomid)}).
                  L&apos;ajout créera une version pour <strong>cette semaine uniquement</strong>.
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sched-prof">Professeur</Label>
                <Select value={form.professorid} onValueChange={(v) => { if (v && v !== "__none__") setForm({ ...form, professorid: v }); }}>
                  <SelectTrigger id="sched-prof">
                    <SelectValue placeholder="Sélectionner…">{(v: string) => professors.find((p) => p.id === v)?.name ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {profLinksLoading ? (
                      <SelectItem value="__loading__" disabled>Chargement…</SelectItem>
                    ) : availableProfessors.length === 0 ? (
                      <SelectItem value="__none__" disabled>Aucun prof assigné à ce groupe</SelectItem>
                    ) : (
                      availableProfessors.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
                {availableProfessors.length === 0 && (
                  <p className="text-xs text-amber-600">Assignez des professeurs à ce groupe depuis l&apos;onglet Profs</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sched-room">Salle</Label>
                <Select value={form.roomid} onValueChange={(v) => { if (v) setForm({ ...form, roomid: v }); }}>
                  <SelectTrigger id="sched-room">
                    <SelectValue placeholder="Sélectionner…">{(v: string) => rooms.find((r) => r.id === v)?.name ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {conflicts.length > 0 && (
              <div className="space-y-1.5 bg-destructive/5 border border-destructive/20 rounded-md p-3">
                {conflicts.map((msg, i) => (
                  <p key={i} className="text-xs text-destructive flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {msg}
                  </p>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground border-t pt-3">
              Ce changement s&apos;applique à la semaine du <strong>{weekLabel}</strong>.
              Les semaines suivantes hériteront de ces créneaux sauf modification.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.professorid || !form.roomid || conflicts.length > 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingEntry ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
