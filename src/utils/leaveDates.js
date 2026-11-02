export const toDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const parseDateKey = (key) => {
  if (!key) return new Date();
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// 6-week grid (42 cells), weeks start on Monday
export const buildMonthGrid = (year, month) => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date: d, key: toDateKey(d), inMonth: d.getMonth() === month };
  });
};

export const coversDate = (request, dateKey) => {
  if (!request.start_date || !request.end_date) return false;
  return dateKey >= request.start_date && dateKey <= request.end_date;
};

export const dayCount = (start, end) => {
  if (!start || !end) return 0;
  const diff = Math.round((parseDateKey(end) - parseDateKey(start)) / 86400000);
  return diff >= 0 ? diff + 1 : 0;
};

export const formatRange = (start, end) => {
  if (!start || !end) return "";
  const opts = { day: "numeric", month: "short" };
  const s = parseDateKey(start).toLocaleDateString("fr-CA", opts);
  const e = parseDateKey(end).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
  return start === end ? parseDateKey(start).toLocaleDateString("fr-CA", { ...opts, year: "numeric" }) : `${s} → ${e}`;
};

export const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];