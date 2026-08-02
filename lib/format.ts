const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function parse(iso: string) {
  return new Date(iso);
}

// Money is formatted in the currency the event was priced in — the API sends
// `currency` on events and orders, and amounts are already display numbers in
// that currency ($45 is 45, ¥12,000 is 12000; the BE serializer owns the
// minor-unit math). The default stays USD so call sites without a currency
// (the mock dashboard data) keep rendering as before.
//
// Intl.NumberFormat knows each currency's decimal rules, so JPY never grows
// ".00" and USD keeps cents only when they exist. en-US locale everywhere —
// the UI language, not the buyer's — so "¥12,000" and "$45" stay stable.
function formatCurrency(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

/** "$3,500" / "¥12,000" — or "Free" for zero. */
export function money(n: number, currency: string = "USD") {
  return n === 0 ? "Free" : formatCurrency(n, currency);
}

/** Always shows the number, e.g. "$0" — for totals rows where "Free" reads
 *  wrong. */
export function amount(n: number, currency: string = "USD") {
  return formatCurrency(n, currency);
}

/** "Sat, Aug 15" */
export function dateShort(iso: string) {
  const d = parse(iso);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Saturday, August 15, 2026" */
export function dateLong(iso: string) {
  const d = parse(iso);
  return `${DAYS_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** { weekday: "Sat", day: "15", month: "AUG" } */
export function calendarParts(iso: string) {
  const d = parse(iso);
  return {
    weekday: DAYS[d.getDay()],
    day: d.getDate().toString(),
    month: MONTHS[d.getMonth()].toUpperCase(),
  };
}

/** to 12-hour clock: "7:00 PM" from "19:00" */
export function to12h(t: string) {
  const [hStr, m] = t.split(":");
  let h = parseInt(hStr, 10);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export function initials(name: string) {
  return name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function hashHue(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}
