import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const CalendarIcon = (p: IconProps) => (
  <svg {...base} {...p}><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>
);
export const ClockIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const PinIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const TicketIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" /><path d="M14 6v2M14 11v2M14 16v0" /></svg>
);
export const UsersIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 19a5.5 5.5 0 0 0-2-4.3" /></svg>
);
export const PlusIcon = (p: IconProps) => (<svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const MinusIcon = (p: IconProps) => (<svg {...base} {...p}><path d="M5 12h14" /></svg>);
export const SearchIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
);
export const CompassIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>
);
export const ArrowRightIcon = (p: IconProps) => (<svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const ArrowLeftIcon = (p: IconProps) => (<svg {...base} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>);
export const HomeIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z" /><path d="M9.5 20.5v-6h5v6" /></svg>
);
export const GridIcon = (p: IconProps) => (
  <svg {...base} {...p}><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>
);
export const ChevronRightIcon = (p: IconProps) => (<svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>);
export const CheckIcon = (p: IconProps) => (<svg {...base} {...p}><path d="m5 12.5 4.2 4.2L19 7" /></svg>);
export const CheckCircleIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12.2 2.4 2.4 4.6-4.8" /></svg>
);
export const XIcon = (p: IconProps) => (<svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const SunIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const MoonIcon = (p: IconProps) => (<svg {...base} {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>);
export const GlobeIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.8 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.8-3.8-9S9.5 5.5 12 3Z" /></svg>
);
export const ShareIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M12 15V4M8.5 7.5 12 4l3.5 3.5" /><path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" /></svg>
);
export const LockIcon = (p: IconProps) => (
  <svg {...base} {...p}><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
);
export const ShieldIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const CardIcon = (p: IconProps) => (
  <svg {...base} {...p}><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h3" /></svg>
);
export const QrIcon = (p: IconProps) => (
  <svg {...base} {...p}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h3v3M20 14v0M17 20h3v-3M14 20h0" /></svg>
);
export const WaveIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M3 12h2l2-6 3 15 3-19 3 13 2-3h3" /></svg>
);
export const SparkleIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M12 3c.5 3.8 1.9 5.2 5.7 5.7-3.8.5-5.2 1.9-5.7 5.7-.5-3.8-1.9-5.2-5.7-5.7C10.1 8.2 11.5 6.8 12 3Z" /><path d="M18.5 14.5c.2 1.6.8 2.2 2.5 2.5-1.7.3-2.3.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5Z" /></svg>
);
export const FilterIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M4 6h16M7 12h10M10 18h4" /></svg>
);
export const MailIcon = (p: IconProps) => (
  <svg {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>
);
export const CalendarPlusIcon = (p: IconProps) => (
  <svg {...base} {...p}><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9h18M8 3v3M16 3v3M12 12.5v4M10 14.5h4" /></svg>
);
export const GoogleIcon = (p: IconProps) => (
  <svg width={18} height={18} viewBox="0 0 48 48" {...p}>
    <path fill="#FFC107" d="M43.61 20.08H42V20H24v8h11.3c-1.65 4.66-6.08 8-11.3 8a12 12 0 1 1 0-24c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66A20 20 0 1 0 24 44c11.05 0 20-8.95 20-20 0-1.34-.14-2.65-.39-3.92z" />
    <path fill="#FF3D00" d="M6.31 14.69l6.57 4.82A11.99 11.99 0 0 1 24 12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66A20 20 0 0 0 6.31 14.69z" />
    <path fill="#4CAF50" d="M24 44c5.16 0 9.85-1.98 13.4-5.2l-6.19-5.24A11.9 11.9 0 0 1 24 36c-5.2 0-9.62-3.32-11.28-7.95l-6.52 5.02A20 20 0 0 0 24 44z" />
    <path fill="#1976D2" d="M43.61 20.08H42V20H24v8h11.3a12.04 12.04 0 0 1-4.09 5.56l6.19 5.24C39.99 34.5 44 29.5 44 24c0-1.34-.14-2.65-.39-3.92z" />
  </svg>
);
export const AppleIcon = (p: IconProps) => (
  <svg width={16} height={16} viewBox="0 0 384 512" fill="currentColor" {...p}>
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);
export const HeartIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 20.5S3.5 15 3.5 8.9A4.4 4.4 0 0 1 12 6.9a4.4 4.4 0 0 1 8.5 2c0 6.1-8.5 11.6-8.5 11.6Z" />
  </svg>
);
export const UserIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
);
export const SettingsIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 13H4a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 5.3 6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H20a2 2 0 0 1 0 4h-.6Z" /></svg>
);
export const LogOutIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l5-5-5-5M15 12H3" /></svg>
);
export const BellIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" /><path d="M10.3 20a2 2 0 0 0 3.4 0" /></svg>
);
export const InstagramIcon = (p: IconProps) => (
  <svg {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" /></svg>
);
export const SpotifyIcon = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M7.5 9.5c3-1 6.5-.6 9 1M8 12.4c2.5-.8 5.3-.4 7.6 1M8.4 15.2c2-.6 4.2-.3 6 .8" /></svg>
);
export const SoundcloudIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M9 18h8a3 3 0 0 0 0-6 4.5 4.5 0 0 0-8.8-1.3A3.4 3.4 0 0 0 9 18Z" /><path d="M6 13.5v4M9 11v6" /></svg>
);
export const DownloadIcon = (p: IconProps) => (
  <svg {...base} {...p}><path d="M12 3.5v11M8 11l4 4 4-4" /><path d="M5 19.5h14" /></svg>
);
export const FacebookIcon = (p: IconProps) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M13.5 21v-8.2h2.7l.4-3.2h-3.1V7.5c0-.9.3-1.5 1.6-1.5h1.7V3.1c-.3 0-1.3-.1-2.6-.1-2.5 0-4.3 1.6-4.3 4.4v2.1H7.1v3.2h2.8V21h3.6z" />
  </svg>
);
export const WhatsappIcon = (p: IconProps) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.28-1.38a9.87 9.87 0 0 0 4.71 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.19c-.24.68-1.42 1.31-1.96 1.36-.5.05-.94.24-3.17-.66-2.68-1.06-4.4-3.79-4.53-3.96-.13-.17-1.09-1.45-1.09-2.76s.69-1.96.93-2.23c.24-.26.53-.33.7-.33h.5c.16.01.38-.06.59.45.24.58.8 1.96.87 2.1.07.14.12.31.02.49-.09.18-.14.29-.28.44-.14.15-.29.34-.41.45-.14.14-.28.29-.12.56.16.28.72 1.17 1.55 1.9 1.06.94 1.96 1.23 2.24 1.37.28.14.44.12.61-.07.16-.19.7-.81.89-1.09.19-.28.37-.23.63-.14.26.1 1.65.78 1.93.92.28.14.47.21.54.32.06.11.06.65-.18 1.28z" />
  </svg>
);
