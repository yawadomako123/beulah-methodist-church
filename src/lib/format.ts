import type { ChurchSettings } from "./settings";

type Fmt = Pick<ChurchSettings, "currency" | "locale" | "timezone">;

export function formatMoney(amount: number | string | null | undefined, s: Fmt): string {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  try {
    return new Intl.NumberFormat(s.locale, { style: "currency", currency: s.currency }).format(n);
  } catch {
    return `${s.currency} ${n.toFixed(2)}`;
  }
}

/** Formats a plain YYYY-MM-DD date without shifting it across time zones. */
export function formatDate(value: string | null | undefined, s: Pick<ChurchSettings, "locale">, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat(s.locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC", ...opts }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function formatDateTime(value: Date | string | null | undefined, s: Fmt, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(s.locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: s.timezone,
    ...opts,
  }).format(date);
}

/** Today's date (YYYY-MM-DD) in the church's time zone. */
export function todayISO(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function tzOffsetMs(date: Date, timezone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUTC - date.getTime();
}

/** Converts a `datetime-local` value entered in the church's time zone to a real instant. */
export function localInputToDate(value: string, timezone: string): Date {
  const [d, t = "00:00"] = value.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, day, hh, mm);
  const first = guess - tzOffsetMs(new Date(guess), timezone);
  return new Date(guess - tzOffsetMs(new Date(first), timezone));
}

/** Converts an instant to a `datetime-local` input value in the church's time zone. */
export function dateToLocalInput(date: Date | null | undefined, timezone: string): string {
  if (!date) return "";
  const local = new Date(date.getTime() + tzOffsetMs(date, timezone));
  return local.toISOString().slice(0, 16);
}

export function age(dateOfBirth: string | null | undefined, today: string): number | null {
  if (!dateOfBirth) return null;
  const [by, bm, bd] = dateOfBirth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function fullName(m: { title?: string | null; firstName: string; lastName: string; otherNames?: string | null }) {
  return [m.title, m.firstName, m.otherNames, m.lastName].filter(Boolean).join(" ");
}
