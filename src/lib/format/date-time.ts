/**
 * The founder decided on 2026-10-26 that periods are in Argentina time, UTC−3 (Enzo-cam/rentals-be#15), and
 * `GET /me` carries no time zone, so the zone is a constant of the business and not of the browser (INV-FE-05).
 */
const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";

/** Argentina has no daylight saving time: the offset never changes. */
const BUSINESS_UTC_OFFSET = "-03:00";

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const NUMERIC_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

/**
 * Intl only gives the numbers of the zone: the words are ours, so Node, Chromium and Safari print the same text. The
 * hour is taken `% 24` because some engines print midnight as `24` even with `hourCycle: "h23"`.
 */
function localPartsOf(date: Date): LocalParts {
  const found: Record<string, number> = {};
  for (const part of NUMERIC_PARTS.formatToParts(date)) {
    if (part.type !== "literal") found[part.type] = Number(part.value);
  }
  return {
    year: found.year,
    month: found.month,
    day: found.day,
    hour: found.hour % 24,
    minute: found.minute,
  };
}

const EXPLICIT_OFFSET = /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Only an instant with an explicit offset or `Z`: a bare day (`2026-11-13`) is read by `Date` as UTC and a time without
 * offset in the zone of the machine, and both would move the day.
 */
function parseInstant(instant: string): Date | null {
  if (!EXPLICIT_OFFSET.test(instant)) return null;
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? null : date;
}

function weekdayOf({ year, month, day }: LocalParts): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function two(value: number): string {
  return String(value).padStart(2, "0");
}

function dayText(parts: LocalParts, now: Date): string {
  const year = parts.year === localPartsOf(now).year ? "" : ` ${parts.year}`;
  return `${WEEKDAYS[weekdayOf(parts)]} ${parts.day} ${MONTHS[parts.month - 1]}${year}`;
}

function timeText({ hour, minute }: LocalParts): string {
  return `${two(hour)}:${two(minute)}`;
}

/**
 * Day and time of an instant in the business zone: `vie 13 nov, 08:00`, with the year (`vie 8 ene 2027, 08:00`) only
 * when it is not the current one there. The only formatter of instants (INV-FE-05); an instant that is not valid is
 * given back as it came, never as "Invalid Date".
 */
export function formatDateTime(
  instant: string,
  now: Date = new Date(),
): string {
  const date = parseInstant(instant);
  if (!date) return instant;
  const parts = localPartsOf(date);
  return `${dayText(parts, now)}, ${timeText(parts)}`;
}

/** The day of `formatDateTime`: `vie 13 nov`. */
export function formatDay(instant: string, now: Date = new Date()): string {
  const date = parseInstant(instant);
  return date ? dayText(localPartsOf(date), now) : instant;
}

/** The time of `formatDateTime`, in 24 h: `08:00`. */
export function formatTime(instant: string): string {
  const date = parseInstant(instant);
  return date ? timeText(localPartsOf(date)) : instant;
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDay(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * A calendar day (`2026-11-13`) has no time and no zone, so it is read as it is and never goes through a `Date` in
 * the browser's zone, which would move it a day.
 */
export function formatCalendarDate(
  date: string,
  now: Date = new Date(),
): string {
  const match = CALENDAR_DATE.exec(date);
  if (!match) return date;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  if (!isRealDay(year, month, day)) return date;
  return dayText({ year, month, day, hour: 0, minute: 0 }, now);
}

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * What a `datetime-local` field holds (`2026-11-13T08:00`), taken as Argentina time, into the instant that the API
 * takes. `null` when it is not a real date and time, so the form can say so before sending.
 */
export function toApiInstant(local: string): string | null {
  const match = LOCAL_INPUT.exec(local);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (!isRealDay(year, month, day) || hour > 23 || minute > 59) return null;
  return `${local}:00${BUSINESS_UTC_OFFSET}`;
}

/** The value of a `datetime-local` field for an instant of the API, in the business zone. */
export function toLocalInput(instant: string): string {
  const date = parseInstant(instant);
  if (!date) return instant;
  const parts = localPartsOf(date);
  return `${parts.year}-${two(parts.month)}-${two(parts.day)}T${timeText(parts)}`;
}
