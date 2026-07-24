const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function parse(iso: string) {
  return new Date(iso);
}

/** $3,500 (whole dollars) */
export function money(n: number) {
  return n === 0 ? "Free" : "$" + n.toLocaleString("en-US");
}

/** Always shows the number, e.g. $0 */
export function amount(n: number) {
  return "$" + n.toLocaleString("en-US");
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
