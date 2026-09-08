"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/browser";
import {
  getWeekStart, addWeeks, weekdayOnOrAfter, occurrenceDay, normalizeTime, cellKey, toLocalDateStr,
  projectWeek, createSeries, editOccurrence, deleteOccurrence,
  editSeriesFromDate, deleteSeriesFromDate, archiveSeries,
  type SessionOccurrence, type SessionErrorCode, type SessionResult,
} from "@/lib/session-masters";
import type { TimeSlot } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Clock, Users, GraduationCap, Grid3X3,
  Loader2, Calendar, ChevronLeft, ChevronRight, AlertTriangle,
  Search, Download, X, Building2, Trash2, Archive, CalendarX2, History,
} from "lucide-react";
import { toast } from "sonner";
import { MascotHeader } from "@/components/mascot/MascotHeader";
import { EmptyState } from "@/components/mascot/EmptyState";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from "date-fns";
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

const ERROR_TITLES: Record<SessionErrorCode, string> = {
  CONFLICT_TEACHER: "Conflit professeur",
  CONFLICT_ROOM: "Conflit salle",
  CONFLICT_GROUP: "Conflit groupe",
  SERIES_NOT_FOUND: "Série introuvable",
  OCCURRENCE_NOT_FOUND: "Occurrence introuvable",
  INVALID_SCOPE: "Demande invalide",
  PAST_OCCURRENCE_LOCKED: "Séance passée verrouillée",
  FORBIDDEN: "Accès refusé",
  UNKNOWN: "Erreur",
};

function sessionToast<T>(res: SessionResult<T>, successMessage: string) {
  if (res.ok) { toast.success(successMessage); return true; }
  toast.error(ERROR_TITLES[res.code] ?? "Erreur", { description: res.message });
  return false;
}

function isPast(dateStr: string, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d < new Date();
}

/* ═══════════════════ MINI CALENDAR ═══════════════════ */

function MiniCalendar({
  currentWeekStart, onSelectWeek, onClose,
}: {
  currentWeekStart: string;
  onSelectWeek: (ws: string) => void;
  onClose: () => void;
}) {
  const [viewDate, setViewDate] = useState(new Date(currentWeekStart + "T00:00:00"));
  const monthStart = startOfMonth(viewDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="absolute right-0 top-full mt-2 z-50 bg-popover border rounded-xl shadow-xl p-4 w-[320px]">
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold capitalize">{format(viewDate, "MMMM yyyy", { locale: fr })}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-muted-foreground mb-1">
        {["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const ws = getWeekStart(day);
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isTodayDay = isToday(day);
          const isCurrent = ws === currentWeekStart;
          return (
            <button
              key={day.toISOString()}
              onClick={() => { onSelectWeek(ws); onClose(); }}
              className={`relative h-8 rounded-md text-xs transition-colors
                ${!isCurrentMonth ? "text-muted-foreground/40" : ""}
                ${isTodayDay ? "bg-primary text-primary-foreground font-bold" : ""}
                ${!isTodayDay && isCurrent ? "bg-[#6d28d9]/15 text-[#6d28d9] font-bold" : ""}
                ${!isTodayDay && !isCurrent ? "hover:bg-accent" : ""}`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { onSelectWeek(getWeekStart(new Date())); onClose(); }}>
          Aujourd&apos;hui
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════ CONFIRM DIALOG ═══════════════════ */

function ConfirmDialog({
  open, onOpenChange, title, message, confirmLabel, onConfirm, loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-3xl border border-[#6d28d9]/15 bg-white p-6 shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-extrabold text-[#1a1a2e]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold leading-relaxed text-[#64748b]">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2.5 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-10 rounded-xl border-[#6d28d9]/20 px-5 text-xs font-bold text-[#64748b] hover:bg-[#f8f9fc]"
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="h-10 rounded-xl bg-red-600 px-5 text-xs font-extrabold shadow-md hover:bg-red-700"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */

export function ScheduleManagement({
  rooms, groups, professors,
}: {
  rooms: Room[];
  groups: GroupItem[];
  professors: Professor[];
}) {
  const supabase = createClient();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [profGroupLinks, setProfGroupLinks] = useState<Record<string, string[]>>({});
  const [profLinksLoading, setProfLinksLoading] = useState(false);
  const [holidays, setHolidays] = useState<{ id: string; name: string; date_start: string; date_end: string; type: string }[]>([]);
  const [profAbsences, setProfAbsences] = useState<{ id: string; professorid: string; date_start: string; date_end: string; reason: string; status: string; replacement_professorid?: string | null }[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const [occurrences, setOccurrences] = useState<SessionOccurrence[]>([]);
  const [loading, setLoading] = useState(true);

  const [groupSearch, setGroupSearch] = useState("");
  const [groupSearchOpen, setGroupSearchOpen] = useState(false);
  const [miniCalOpen, setMiniCalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"group" | "professor" | "room">("group");
  const [selectedProfessorId, setSelectedProfessorId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [scope, setScope] = useState<"occurrence" | "series">("occurrence");
  const [target, setTarget] = useState<SessionOccurrence | null>(null);
  const [form, setForm] = useState({ day: 0, overrideDate: "", professorid: "", roomid: "", timeslotid: "" });
  const [saving, setSaving] = useState(false);

  const [draggedOcc, setDraggedOcc] = useState<SessionOccurrence | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const handleDropOccurrence = async (occ: SessionOccurrence, targetDay: number, targetSlot: TimeSlot, targetDate: string) => {
    if (isPast(targetDate, targetSlot.starttime)) {
      toast.error("Impossible de déplacer un cours vers un créneau passé.");
      return;
    }
    const targetSlotId = targetSlot.id;
    if (occ.weekday === targetDay && getSlot(occ.startTime)?.id === targetSlotId && occ.occurrenceDate === targetDate) {
      return; // même emplacement
    }

    runConfirm({
      title: "Déplacer le cours (Glisser-Déposer)",
      message: `Voulez-vous déplacer « ${occ.moduleName} » vers le ${DAYS.find(d => d.value === targetDay)?.label} (${targetDate}) à ${targetSlot.label} ?`,
      confirmLabel: "Confirmer le déplacement",
      run: async () => {
        const res = await editOccurrence(supabase, {
          masterId: occ.masterId,
          occurrenceDate: occ.occurrenceDate,
          overrideDate: targetDate,
          startTime: targetSlot.starttime,
          endTime: targetSlot.endtime,
          professorId: occ.professorId,
          roomId: occ.roomId,
        });
        if (sessionToast(res, "Cours déplacé avec succès !")) {
          await loadProjection(currentWeekStart);
        }
      },
    });
  };

  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    run: () => Promise<void>;
  }>({ open: false, title: "", message: "", confirmLabel: "", run: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const groupSearchRef = useRef<HTMLDivElement>(null);

  const loadProjection = useCallback(async (ws: string) => {
    setLoading(true);
    const res = await projectWeek(supabase, ws, null);
    if (res.ok) setOccurrences(res.data);
    else toast.error(ERROR_TITLES[res.code] ?? "Erreur", { description: res.message });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [{ data: slots }, { data: hol }, { data: abs }] = await Promise.all([
        supabase.from("time_slots").select("*").order("orderindex"),
        supabase.from("holidays").select("*").eq("isactive", true),
        supabase.from("professor_absences").select("*").eq("status", "approved"),
      ]);
      if (!active) return;
      if (slots) setTimeSlots(slots as TimeSlot[]);
      if (hol) setHolidays(hol);
      if (abs) setProfAbsences(abs);
    })();
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await loadProjection(currentWeekStart);
      if (!active) return;
    })();
    return () => { active = false; };
  }, [loadProjection, currentWeekStart]);

  const loadProfLinks = useCallback(async (groupId?: string) => {
    if (groupId) {
      const { data } = await supabase.from("professor_groups").select("professorid").eq("groupid", groupId);
      const pids = (data ?? []).map((r: Record<string, unknown>) => r.professorid as string);
      if (pids.length > 0) setProfGroupLinks((prev) => ({ ...prev, [groupId]: pids }));
      return;
    }
    setProfLinksLoading(true);
    const { data } = await supabase.from("professor_groups").select("professorid, groupid");
    if (data) {
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
  }, [supabase]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const filteredGroups = useMemo(() => {
    if (!groupSearch) return groups;
    const q = groupSearch.toLowerCase();
    return groups.filter((g) =>
      g.name.toLowerCase().includes(q) ||
      g.moduleName.toLowerCase().includes(q)
    );
  }, [groups, groupSearch]);

  const visibleOccurrences = useMemo(() => {
    if (viewMode === "professor") return occurrences.filter((o) => o.professorId === selectedProfessorId);
    if (viewMode === "room") return occurrences.filter((o) => o.roomId === selectedRoomId);
    return occurrences.filter((o) => o.groupId === selectedGroupId);
  }, [viewMode, occurrences, selectedProfessorId, selectedRoomId, selectedGroupId]);

  const cellMap = useMemo(() => {
    const m: Record<string, SessionOccurrence[]> = {};
    for (const o of visibleOccurrences) {
      const key = cellKey(occurrenceDay(o), o.startTime);
      if (!m[key]) m[key] = [];
      m[key].push(o);
    }
    return m;
  }, [visibleOccurrences]);

  const sortedSlots = useMemo(() => {
    const seen = new Set<string>();
    const slots: TimeSlot[] = [];
    for (const ts of timeSlots) {
      if (!seen.has(ts.starttime)) { seen.add(ts.starttime); slots.push(ts); }
    }
    return slots.sort((a, b) => a.orderindex - b.orderindex);
  }, [timeSlots]);

  const weekLabel = useMemo(() => {
    const s = new Date(currentWeekStart + "T00:00:00");
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    const sameYear = s.getFullYear() === e.getFullYear();
    const startFmt = format(s, "EEEE d MMMM" + (sameYear ? "" : " yyyy"), { locale: fr });
    const endFmt = format(e, "EEEE d MMMM yyyy", { locale: fr });
    return `du ${startFmt} au ${endFmt}`;
  }, [currentWeekStart]);

  const todayDow = new Date().getDay();

  const weekDates = useMemo(() =>
    DAYS.map((day) => {
      const idx = day.value; // 0=Dimanche, 1=Lundi, ..., 6=Samedi
      const d = new Date(currentWeekStart + "T00:00:00");
      d.setDate(d.getDate() + idx);
      return toLocalDateStr(d);
    }),
    [currentWeekStart],
  );

  const isCurrentWeek = () => getWeekStart(new Date()) === currentWeekStart;

  const getProfessorName = (id: string | null | undefined) => {
    if (!id) return "—";
    return professors.find((p) => p.id === id)?.name ?? id;
  };
  const getRoomName = (id: string | null | undefined) => {
    if (!id) return "—";
    return rooms.find((r) => r.id === id)?.name ?? id;
  };
  const getModuleNameByGroup = (gid: string) => {
    const g = groups.find((g) => g.id === gid);
    return g?.moduleName ?? "";
  };

  const availableProfessorsFor = useCallback((groupId: string, include?: string | null) => {
    const pids = profGroupLinks[groupId] ?? [];
    const set = new Set(pids);
    if (include) set.add(include);
    return professors.filter((p) => set.has(p.id));
  }, [profGroupLinks, professors]);

  const getSlot = (startTime: string) => timeSlots.find((ts) => ts.starttime.slice(0, 5) === normalizeTime(startTime));

  const openAdd = async (day: number, slotId: string) => {
    if (viewMode !== "group" || !selectedGroupId) {
      toast.info("Sélectionnez un groupe pour ajouter un cours.");
      return;
    }
    if (currentWeekStart < getWeekStart(new Date())) {
      toast.error("Semaine passée verrouillée : impossible d'ajouter un cours.");
      return;
    }
    setProfLinksLoading(true);
    await loadProfLinks(selectedGroupId);
    setProfLinksLoading(false);
    setMode("create");
    setTarget(null);
    setForm({ day, overrideDate: "", professorid: "", roomid: "", timeslotid: slotId });
    setDialogOpen(true);
  };

  const openEdit = async (occ: SessionOccurrence) => {
    const slot = getSlot(occ.startTime);
    setProfLinksLoading(true);
    await loadProfLinks(occ.groupId);
    setProfLinksLoading(false);
    setMode("edit");
    setScope("occurrence");
    setTarget(occ);
    setForm({
      day: occ.weekday,
      overrideDate: occ.occurrenceDate,
      professorid: occ.professorId,
      roomid: occ.roomId,
      timeslotid: slot?.id ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedGroup && mode === "create") { toast.error("Aucun groupe sélectionné"); return; }
    const slot = timeSlots.find((ts) => ts.id === form.timeslotid);
    if (!slot) { toast.error("Sélectionnez un créneau"); return; }
    if (!form.professorid || !form.roomid) { toast.error("Sélectionnez un professeur et une salle"); return; }

    setSaving(true);
    try {
      if (mode === "create" && selectedGroup) {
        const startDate = weekdayOnOrAfter(currentWeekStart, form.day);
        const hol = holidays.find((h) => startDate >= h.date_start && startDate <= h.date_end);
        if (hol) toast.warning(`Attention : le ${startDate} tombe pendant « ${hol.name} »`, { duration: 6000 });

        const res = await createSeries(supabase, {
          moduleId: selectedGroup.moduleid,
          professorId: form.professorid,
          groupId: selectedGroupId,
          roomId: form.roomid,
          weekday: form.day,
          startTime: slot.starttime,
          endTime: slot.endtime,
          effectiveStartDate: startDate,
        });
        if (sessionToast(res, "Série créée")) {
          setDialogOpen(false);
          await loadProjection(currentWeekStart);
        }
        return;
      }

      if (mode === "edit" && target) {
        if (scope === "occurrence") {
          const res = await editOccurrence(supabase, {
            masterId: target.masterId,
            occurrenceDate: target.occurrenceDate,
            overrideDate: form.overrideDate || null,
            startTime: slot.starttime,
            endTime: slot.endtime,
            professorId: form.professorid,
            roomId: form.roomid,
          });
          if (sessionToast(res, "Occurrence mise à jour")) {
            setDialogOpen(false);
            await loadProjection(currentWeekStart);
          }
          return;
        }

        const res = await editSeriesFromDate(supabase, {
          masterId: target.masterId,
          fromDate: target.originalDate,
          professorId: form.professorid,
          roomId: form.roomid,
          weekday: form.day,
          startTime: slot.starttime,
          endTime: slot.endtime,
        });
        if (sessionToast(res, "Série mise à jour à partir de cette date")) {
          setDialogOpen(false);
          await loadProjection(currentWeekStart);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const runConfirm = (c: {
    title: string;
    message: string;
    confirmLabel: string;
    run: () => Promise<void>;
  }) => setConfirm({ ...c, open: true });

  const confirmAndRun = async () => {
    setConfirmLoading(true);
    try {
      await confirm.run();
      setConfirm({ open: false, title: "", message: "", confirmLabel: "", run: async () => {} });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancelOccurrence = (occ: SessionOccurrence) => {
    runConfirm({
      title: "Annuler cette occurrence",
      message: `${getModuleNameByGroup(occ.groupId)} — ${occ.originalDate} ${occ.originalStartTime}–${occ.originalEndTime}. Seule cette date est annulée, la série continue.`,
      confirmLabel: "Annuler l'occurrence",
      run: async () => {
        const res = await deleteOccurrence(supabase, { masterId: occ.masterId, occurrenceDate: occ.originalDate, note: "Annulée par l'admin" });
        if (sessionToast(res, "Occurrence annulée")) await loadProjection(currentWeekStart);
      },
    });
  };

  const handleDeleteSeriesFromDate = (occ: SessionOccurrence) => {
    runConfirm({
      title: "Supprimer la série à partir de cette date",
      message: `${getModuleNameByGroup(occ.groupId)} — la série s'arrête avant le ${occ.originalDate} : les séances à partir de cette date seront supprimées, les précédentes conservées. Si c'est la première occurrence, toute la série sera supprimée.`,
      confirmLabel: "Supprimer à partir d'ici",
      run: async () => {
        const res = await deleteSeriesFromDate(supabase, { masterId: occ.masterId, fromDate: occ.originalDate });
        if (sessionToast(res, "Série clôturée à partir de cette date")) await loadProjection(currentWeekStart);
      },
    });
  };

  const handleArchiveSeries = (occ: SessionOccurrence) => {
    runConfirm({
      title: "Archiver toute la série",
      message: `La série « ${getModuleNameByGroup(occ.groupId)} » (${occ.seriesKey}) et toutes ses déclinaisons seront archivées.`,
      confirmLabel: "Archiver",
      run: async () => {
        const res = await archiveSeries(supabase, { masterId: occ.masterId });
        if (sessionToast(res, "Série archivée")) await loadProjection(currentWeekStart);
      },
    });
  };

  const handleExportPDF = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const { default: jsPDF } = await import("jspdf");
    if (!gridRef.current) return;
    toast.info("Génération du PDF...");
    try {
      const canvas = await html2canvas(gridRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
      pdf.setFontSize(14);
      pdf.text(`Emploi du temps - ${viewMode === "group" ? (selectedGroup?.name ?? "") : viewMode === "professor" ? getProfessorName(selectedProfessorId) : getRoomName(selectedRoomId)} - ${weekLabel}`, 10, 8);
      pdf.save(`edt-${currentWeekStart}.pdf`);
      toast.success("PDF exporté");
    } catch (err) { toast.error("Erreur PDF", { description: String(err) }); }
  };

  const dialogSlot = timeSlots.find((ts) => ts.id === form.timeslotid);
  const dialogDate = mode === "create"
    ? weekdayOnOrAfter(currentWeekStart, form.day)
    : scope === "occurrence" && target
      ? (form.overrideDate || target.originalDate)
      : target
        ? weekdayOnOrAfter(currentWeekStart, form.day)
        : "";

  const dialogWarnings = useMemo(() => {
    if (!dialogDate || !form.professorid) return [];
    const warnings: string[] = [];
    const hol = holidays.find((h) => dialogDate >= h.date_start && dialogDate <= h.date_end);
    if (hol) warnings.push(`${dialogDate} tombe pendant « ${hol.name} » (${hol.type})`);
    const abs = profAbsences.find((a) =>
      a.professorid === form.professorid && dialogDate >= a.date_start && dialogDate <= a.date_end
    );
    if (abs) warnings.push(`Ce professeur est absent ce jour-là (${abs.reason})`);
    return warnings;
  }, [dialogDate, form.professorid, holidays, profAbsences]);

  const editProfessors = useMemo(() => {
    if (mode !== "edit" || !target) return professors;
    return availableProfessorsFor(target.groupId, target.professorId);
  }, [mode, target, professors, availableProfessorsFor]);

  const createProfessors = availableProfessorsFor(selectedGroupId);

  return (
    <div className="space-y-8 pb-10">
      <MascotHeader
        title="Gestion des Emplois du Temps"
        description="Planifiez des séries de cours, ajustez une date ponctuelle ou une série à partir d'une date, et archivez les séries obsolètes."
        pose="eureka"
        mascotMessage={
          selectedGroup
            ? `Planning de ${selectedGroup.name} (${visibleOccurrences.filter((o) => o.groupId === selectedGroupId).length} cours cette semaine)`
            : "Sélectionnez un groupe pour commencer !"
        }
        badge="Planning & Organisation"
      />

      <div className="flex flex-col gap-4 rounded-3xl border border-[#6d28d9]/10 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" ref={groupSearchRef}>
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-[#6d28d9]" />
              <Input
                placeholder="Rechercher un groupe…"
                value={
                  selectedGroupId
                    ? `${groups.find((g) => g.id === selectedGroupId)?.name ?? ""} — ${groups.find((g) => g.id === selectedGroupId)?.moduleName ?? ""}`
                    : groupSearch
                }
                onChange={(e) => {
                  setGroupSearch(e.target.value);
                  setGroupSearchOpen(true);
                  if (selectedGroupId) setSelectedGroupId("");
                }}
                onFocus={() => setGroupSearchOpen(true)}
                className="h-11 w-[280px] rounded-2xl border-[#6d28d9]/15 bg-[#f8f9fc] pl-10 pr-9 text-xs font-semibold text-[#1a1a2e] focus:border-[#6d28d9] focus:bg-white"
              />
              {selectedGroupId && (
                <button
                  onClick={() => {
                    setSelectedGroupId("");
                    setGroupSearch("");
                    setGroupSearchOpen(true);
                  }}
                  className="absolute right-3 text-[#64748b] hover:text-[#1a1a2e]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {groupSearchOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[320px] overflow-auto rounded-2xl border border-[#6d28d9]/10 bg-white p-2 shadow-xl">
                {filteredGroups.length === 0 ? (
                  <div className="p-4 text-center text-xs font-medium text-[#64748b]">
                    Aucun groupe trouvé
                  </div>
                ) : (
                  filteredGroups.map((g) => (
                    <button
                      key={g.id}
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                        g.id === selectedGroupId
                          ? "bg-[#6d28d9] text-white shadow-xs"
                          : "text-[#1a1a2e] hover:bg-[#6d28d9]/5"
                      }`}
                      onClick={() => {
                        setSelectedGroupId(g.id);
                        setGroupSearch("");
                        setGroupSearchOpen(false);
                      }}
                    >
                      <span>{g.name}</span>
                      <span className={g.id === selectedGroupId ? "text-white/80" : "text-[#64748b]"}>
                        {" "}
                        — {g.moduleName}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="inline-flex rounded-2xl border border-[#6d28d9]/10 bg-[#f8f9fc] p-1">
            <button
              onClick={() => setViewMode("group")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === "group"
                  ? "bg-white text-[#6d28d9] shadow-xs"
                  : "text-[#64748b] hover:text-[#1a1a2e]"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span>Groupe</span>
            </button>
            <button
              onClick={() => setViewMode("professor")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === "professor"
                  ? "bg-white text-[#6d28d9] shadow-xs"
                  : "text-[#64748b] hover:text-[#1a1a2e]"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Prof</span>
            </button>
            <button
              onClick={() => setViewMode("room")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === "room"
                  ? "bg-white text-[#6d28d9] shadow-xs"
                  : "text-[#64748b] hover:text-[#1a1a2e]"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Salle</span>
            </button>
          </div>

          {viewMode === "professor" && (
            <Select value={selectedProfessorId} onValueChange={(v) => { if (v) setSelectedProfessorId(v); }}>
              <SelectTrigger className="w-[220px] h-11 rounded-2xl border-[#6d28d9]/15 text-xs font-semibold">
                <SelectValue placeholder="Choisir un professeur…" />
              </SelectTrigger>
              <SelectContent>
                {professors.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {viewMode === "room" && (
            <Select value={selectedRoomId} onValueChange={(v) => { if (v) setSelectedRoomId(v); }}>
              <SelectTrigger className="w-[220px] h-11 rounded-2xl border-[#6d28d9]/15 text-xs font-semibold">
                <SelectValue placeholder="Choisir une salle…" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedGroupId && viewMode === "group" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="h-10 rounded-2xl border-[#6d28d9]/15 text-xs font-bold text-[#6d28d9] hover:bg-[#6d28d9]/5"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              <span>PDF</span>
            </Button>
          )}

          <div className="flex items-center rounded-2xl border border-[#6d28d9]/10 bg-[#f8f9fc] p-1 relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-[#6d28d9]"
              onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[180px] px-2 text-center text-xs font-extrabold text-[#1a1a2e]">
              {weekLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-[#6d28d9]"
              onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {miniCalOpen && (
              <MiniCalendar
                currentWeekStart={currentWeekStart}
                onSelectWeek={setCurrentWeekStart}
                onClose={() => setMiniCalOpen(false)}
              />
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMiniCalOpen((v) => !v)}
            className="h-10 rounded-2xl border-[#6d28d9]/15 text-xs font-bold text-[#6d28d9] hover:bg-[#6d28d9]/5"
          >
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            Calendrier
          </Button>

          {!isCurrentWeek() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}
              className="h-10 rounded-2xl border-[#6d28d9]/15 text-xs font-bold text-[#64748b] hover:text-[#1a1a2e]"
            >
              Cette semaine
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-[#F97316]/20 bg-[#F97316]/5 px-4 py-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-[#F97316]" />
        <p className="text-sm text-[#64748b]">
          <strong className="text-[#6D28D9]">Conflits :</strong>{" "}
          un professeur, une salle ou un groupe ne peut pas occuper deux créneaux qui se chevauchent.
          Les chevauchements sont bloqués automatiquement lors de l&apos;enregistrement.
        </p>
      </div>

      {!selectedGroupId && viewMode === "group" ? (
        <EmptyState
          pose="reflexion"
          title="Aucun groupe sélectionné"
          hint="Sélectionnez un groupe dans la barre de recherche ci-dessus pour consulter et ajuster son emploi du temps."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-3xl border border-[#6d28d9]/10 bg-white p-4 shadow-sm" ref={gridRef}>
            <div className="min-w-[960px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 w-[120px] bg-white p-3 text-left text-xs font-extrabold uppercase tracking-wider text-[#6d28d9]">
                      Horaire
                    </th>
                    {DAYS.map((day, i) => {
                      const dateStr = weekDates[i];
                      const dateDisplay = new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric" });
                      const isTodayDay = day.value === todayDow && isCurrentWeek();
                      return (
                        <th
                          key={day.value}
                          className="p-3 text-center text-xs font-extrabold text-[#1a1a2e]"
                        >
                          <div className={`inline-flex rounded-xl px-4 py-1.5 border ${isTodayDay ? "bg-[#6d28d9]/10 border-[#6d28d9]/20 text-[#6d28d9]" : "bg-[#f8f9fc] border-[#6d28d9]/5 text-[#6d28d9]"}`}>
                            <span>{day.label}</span>
                            <span className="ml-1.5 text-[#64748b]">{dateDisplay}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#6d28d9]" />
                      </td>
                    </tr>
                  ) : sortedSlots.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-xs text-muted-foreground">
                        Aucun créneau horaire défini.
                      </td>
                    </tr>
                  ) : (
                    sortedSlots.map((slotItem) => (
                      <tr key={slotItem.id} className="border-t border-[#6d28d9]/5">
                        <td className="sticky left-0 z-10 bg-white p-3 text-xs font-bold text-[#64748b]">
                          <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#f3f0ff] px-2.5 py-1 text-[#6d28d9]">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>{slotItem.label}</span>
                          </div>
                        </td>

                        {DAYS.map((d, i) => {
                          const cell = cellMap[cellKey(d.value, slotItem.starttime)] ?? [];
                          const first = cell[0];
                          const targetDate = weekDates[i];
                          const isPastCell = isPast(targetDate, slotItem.starttime);
                          const cellId = `${d.value}-${slotItem.id}`;
                          const isDragOver = dragOverCell === cellId;

                          if (!first) {
                            return (
                              <td
                                key={cellId}
                                className={`p-2 align-top min-h-[120px] transition-colors rounded-2xl ${
                                  isDragOver ? "bg-[#6d28d9]/10 border-2 border-dashed border-[#6d28d9]" : ""
                                }`}
                                onDragOver={(e) => {
                                  if (!draggedOcc || isPastCell) return;
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                  setDragOverCell(cellId);
                                }}
                                onDragLeave={() => setDragOverCell(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOverCell(null);
                                  if (draggedOcc && !isPastCell) {
                                    handleDropOccurrence(draggedOcc, d.value, slotItem, targetDate);
                                  }
                                }}
                              >
                                <button
                                  onClick={() => openAdd(d.value, slotItem.id)}
                                  disabled={viewMode !== "group" || !selectedGroupId || isPastCell}
                                  title={isPastCell ? "Créneau passé" : "Ajouter un cours"}
                                  className="flex h-full min-h-[90px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-[#6d28d9]/10 bg-[#f8f9fc]/50 transition-all hover:border-[#6d28d9]/30 hover:bg-[#f3f0ff]/50 group disabled:opacity-40 disabled:hover:border-[#6d28d9]/10 disabled:hover:bg-[#f8f9fc]/50"
                                >
                                  <Plus className="h-5 w-5 text-[#6d28d9]/40 group-hover:scale-125 transition-transform" />
                                </button>
                              </td>
                            );
                          }

                          const canDrag = !isPastCell && viewMode === "group";

                          return (
                            <td
                              key={cellId}
                              className={`p-2 align-top min-h-[120px] transition-colors rounded-2xl ${
                                isDragOver ? "bg-[#6d28d9]/10 border-2 border-dashed border-[#6d28d9]" : ""
                              }`}
                              onDragOver={(e) => {
                                if (!draggedOcc || isPastCell) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setDragOverCell(cellId);
                              }}
                              onDragLeave={() => setDragOverCell(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDragOverCell(null);
                                if (draggedOcc && !isPastCell) {
                                  handleDropOccurrence(draggedOcc, d.value, slotItem, targetDate);
                                }
                              }}
                              onClick={() => openEdit(first)}
                            >
                              <div
                                draggable={canDrag}
                                onDragStart={(e) => {
                                  if (!canDrag) return;
                                  setDraggedOcc(first);
                                  e.dataTransfer.setData("text/plain", first.id);
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                onDragEnd={() => {
                                  setDraggedOcc(null);
                                  setDragOverCell(null);
                                }}
                                className={`group relative flex h-full min-h-[90px] flex-col justify-between rounded-2xl p-3 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md border border-black/5 ${
                                  canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                                } ${draggedOcc?.id === first.id ? "opacity-40 scale-95" : ""}`}
                                style={{
                                  borderLeft: `5px solid ${getModuleColor(first.moduleId)}`,
                                  backgroundColor: `${getModuleColor(first.moduleId)}10`,
                                  opacity: isPastCell ? 0.55 : draggedOcc?.id === first.id ? 0.4 : 1,
                                }}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-extrabold text-[#1a1a2e] line-clamp-1">
                                      {first.moduleName}
                                    </span>
                                    {cell.length > 1 && (
                                      <Badge className="shrink-0 bg-[#6d28d9]/10 text-[9px] font-bold text-[#6d28d9] border-none">
                                        +{cell.length - 1}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b]">
                                    <GraduationCap className="h-3.5 w-3.5 text-[#6d28d9] shrink-0" />
                                    <span className="truncate">{getProfessorName(first.professorId)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b]">
                                    <Building2 className="h-3.5 w-3.5 text-[#f97316] shrink-0" />
                                    <span className="truncate">{getRoomName(first.roomId)}</span>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between pt-2 border-t border-black/5">
                                  {first.sourceType === "exception" ? (
                                    <Badge className="bg-[#f97316]/10 text-[#f97316] text-[9px] font-extrabold border-none">
                                      <History className="h-2.5 w-2.5 mr-0.5" /> Dérogation
                                    </Badge>
                                  ) : (
                                    <span className="text-[9px] font-mono text-[#64748b]">
                                      {first.originalDate}
                                    </span>
                                  )}
                                  <Users className="h-3 w-3 text-[#64748b]/50" />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {visibleOccurrences.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                Voir tous les créneaux en liste ({visibleOccurrences.length})
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left p-2 font-medium">Jour</th>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Horaire</th>
                      <th className="text-left p-2 font-medium">Module</th>
                      <th className="text-left p-2 font-medium">Groupe</th>
                      <th className="text-left p-2 font-medium">Prof</th>
                      <th className="text-left p-2 font-medium">Salle</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOccurrences
                      .sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate) || a.startTime.localeCompare(b.startTime))
                      .map((occ) => (
                        <tr key={occ.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-2">{DAYS.find((d) => d.value === occurrenceDay(occ))?.label}</td>
                          <td className="p-2 font-mono whitespace-nowrap">{occ.occurrenceDate}</td>
                          <td className="p-2 whitespace-nowrap">{occ.startTime}–{occ.endTime}</td>
                          <td className="p-2 font-medium">{occ.moduleName}</td>
                          <td className="p-2 text-muted-foreground">{occ.groupName}</td>
                          <td className="p-2 text-muted-foreground">{getProfessorName(occ.professorId)}</td>
                          <td className="p-2 text-muted-foreground">{getRoomName(occ.roomId)}</td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <button onClick={() => openEdit(occ)} className="p-1 hover:text-primary" title="Modifier"><GraduationCap className="h-3.5 w-3.5" /></button>
                              <button onClick={() => handleCancelOccurrence(occ)} className="p-1 hover:text-destructive" title="Annuler cette occurrence"><CalendarX2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(v) => { if (!confirmLoading) setConfirm((c) => ({ ...c, open: v })); }}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        loading={confirmLoading}
        onConfirm={confirmAndRun}
      />

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!saving) setDialogOpen(v); }}>
        <DialogContent className="sm:max-w-[540px] rounded-3xl border border-[#6d28d9]/15 bg-white p-6 shadow-2xl">
          <DialogHeader className="space-y-2.5 border-b border-[#6d28d9]/10 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-extrabold text-[#1a1a2e]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6d28d9]/10 text-[#6d28d9]">
                <Calendar className="h-5 w-5" />
              </div>
              {mode === "create" ? "Créer une série de cours" : "Modifier la séance de cours"}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-[#64748b]">
              {mode === "create" && selectedGroup
                ? `${DAYS.find((d) => d.value === form.day)?.label} ${dialogSlot?.label ?? ""} — ${selectedGroup.name} (débute le ${dialogDate})`
                : target
                  ? `${target.moduleName} — ${target.occurrenceDate} de ${target.startTime} à ${target.endTime}`
                  : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {mode === "create" && selectedGroup && (
              <div className="space-y-2">
                <Label className="text-xs font-extrabold text-[#1a1a2e]">Module à enseigner</Label>
                <div className="rounded-2xl border border-[#6d28d9]/15 bg-[#f8f9fc] px-4 py-2.5 text-xs font-bold text-[#6d28d9]">
                  {selectedGroup.moduleName || "—"}
                </div>
              </div>
            )}

            {mode === "edit" && target && (
              <div className="space-y-2 rounded-2xl bg-[#f8f9fc] p-3 border border-[#6d28d9]/10">
                <Label className="text-xs font-extrabold text-[#1a1a2e]">Portée de la modification</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setScope("occurrence")}
                    className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                      scope === "occurrence"
                        ? "border-[#6d28d9] bg-white text-[#6d28d9] shadow-xs"
                        : "border-transparent text-[#64748b] hover:bg-white/60"
                    }`}
                  >
                    Cette occurrence uniquement
                  </button>
                  <button
                    onClick={() => setScope("series")}
                    className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                      scope === "series"
                        ? "border-[#6d28d9] bg-white text-[#6d28d9] shadow-xs"
                        : "border-transparent text-[#64748b] hover:bg-white/60"
                    }`}
                  >
                    Toute la série (à partir d&apos;ici)
                  </button>
                </div>
                {target.sourceType === "exception" && (
                  <p className="text-[11px] font-semibold text-[#f97316] flex items-center gap-1.5 pt-1">
                    <History className="h-3.5 w-3.5 shrink-0" />
                    Une dérogation existe déjà pour cette occurrence — elle sera remplacée.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {mode === "edit" && scope === "series" ? (
                <div className="space-y-2">
                  <Label className="text-xs font-extrabold text-[#1a1a2e]">Jour de la semaine</Label>
                  <Select value={String(form.day)} onValueChange={(v) => { if (v) setForm((f) => ({ ...f, day: parseInt(v, 10) })); }}>
                    <SelectTrigger className="h-10 rounded-xl border-[#6d28d9]/15 text-xs font-semibold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {DAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : mode === "edit" && scope === "occurrence" ? (
                <div className="space-y-2">
                  <Label className="text-xs font-extrabold text-[#1a1a2e]">Date (report)</Label>
                  <Input
                    type="date"
                    className="h-10 rounded-xl border-[#6d28d9]/15 text-xs font-semibold"
                    value={form.overrideDate}
                    onChange={(e) => setForm((f) => ({ ...f, overrideDate: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-extrabold text-[#1a1a2e]">Jour</Label>
                  <Select value={String(form.day)} onValueChange={(v) => { if (v) setForm((f) => ({ ...f, day: parseInt(v, 10) })); }}>
                    <SelectTrigger className="h-10 rounded-xl border-[#6d28d9]/15 text-xs font-semibold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {DAYS.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-extrabold text-[#1a1a2e]">Créneau horaire</Label>
                <Select value={form.timeslotid} onValueChange={(v) => { if (v) setForm((f) => ({ ...f, timeslotid: v })); }}>
                  <SelectTrigger className="h-10 rounded-xl border-[#6d28d9]/15 text-xs font-semibold"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {sortedSlots.map((ts) => <SelectItem key={ts.id} value={ts.id}>{ts.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sched-prof" className="text-xs font-extrabold text-[#1a1a2e]">Professeur</Label>
                <Select value={form.professorid} onValueChange={(v) => { if (v && v !== "__none__") setForm((f) => ({ ...f, professorid: v })); }}>
                  <SelectTrigger id="sched-prof" className="h-10 rounded-xl border-[#6d28d9]/15 text-xs font-semibold">
                    <SelectValue placeholder="Sélectionner un professeur…" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {profLinksLoading ? (
                      <SelectItem value="__loading__" disabled>Chargement…</SelectItem>
                    ) : mode === "create" && createProfessors.length === 0 ? (
                      <SelectItem value="__none__" disabled>Aucun prof assigné à ce groupe</SelectItem>
                    ) : (
                      (mode === "create" ? createProfessors : editProfessors).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sched-room" className="text-xs font-extrabold text-[#1a1a2e]">Salle</Label>
                <Select value={form.roomid} onValueChange={(v) => { if (v) setForm((f) => ({ ...f, roomid: v })); }}>
                  <SelectTrigger id="sched-room" className="h-10 rounded-xl border-[#6d28d9]/15 text-xs font-semibold">
                    <SelectValue placeholder="Sélectionner une salle…" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dialogWarnings.length > 0 && (
              <div className="space-y-1.5 rounded-2xl p-3 border border-amber-300/50 bg-amber-500/10">
                {dialogWarnings.map((w, i) => (
                  <p key={i} className="text-xs font-bold text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                    {w}
                  </p>
                ))}
              </div>
            )}

            {mode === "edit" && target && (
              <div className="space-y-2.5 rounded-2xl border border-dashed border-[#6d28d9]/20 p-3.5 bg-[#f8f9fc]">
                <Label className="text-xs font-extrabold text-[#64748b]">Actions avancées sur la série</Label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="h-8 rounded-xl border-red-200 bg-white text-xs font-bold text-red-600 hover:bg-red-50" onClick={() => { handleCancelOccurrence(target); setDialogOpen(false); }}>
                    <CalendarX2 className="mr-1.5 h-3.5 w-3.5" />
                    Annuler cette date
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 rounded-xl border-red-200 bg-white text-xs font-bold text-red-600 hover:bg-red-50" onClick={() => { handleDeleteSeriesFromDate(target); setDialogOpen(false); }}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Stopper la série ici
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50" onClick={() => { handleArchiveSeries(target); setDialogOpen(false); }}>
                    <Archive className="mr-1.5 h-3.5 w-3.5" />
                    Archiver
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-[#6d28d9]/10 pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="h-10 rounded-xl border-[#6d28d9]/20 px-5 text-xs font-bold text-[#64748b] hover:bg-[#f8f9fc]">Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.professorid || !form.roomid || !form.timeslotid} className="h-10 rounded-xl bg-[#6d28d9] px-6 text-xs font-extrabold text-white shadow-md hover:bg-[#5b21b6]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Créer la série" : "Enregistrer les modifications"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
