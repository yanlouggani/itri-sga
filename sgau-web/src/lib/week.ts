function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return toLocalDateStr(d);
}

export function getWeekEnd(date: Date | string): string {
  const d = new Date(date instanceof Date ? date : date + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return toLocalDateStr(d);
}

export function addWeeks(date: string, n: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n * 7);
  return toLocalDateStr(d);
}

export type WeekEntry = {
  id: string;
  groupid: string;
  week_start: string;
  dayofweek: number;
  starttime: string;
  endtime: string;
  professorid: string;
  roomid: string;
};

export function getEffectiveForWeek<T extends WeekEntry>(
  allEntries: T[],
  groupId: string,
  weekStart: string,
): T[] {
  const map = new Map<string, T>();
  const sorted = [...allEntries]
    .filter((e) => e.groupid === groupId && e.week_start <= weekStart)
    .sort((a, b) => a.week_start.localeCompare(b.week_start));
  for (const e of sorted) {
    map.set(`${e.dayofweek}-${e.starttime}`, e);
  }
  return Array.from(map.values());
}
