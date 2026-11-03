import {
  CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, Code, Ellipsis, FilePen, FileText, Flag, History, House, Link,
  LogOut, Paperclip, Plus, ReceiptText, Search, Settings, ShieldCheck, TriangleAlert, Upload, User, Wallet, X,
} from "lucide-react";

// Lucide line icons, named for what they mean here. Names are strings so server pages can hand them to the nav.
const icons = {
  home: House, tasks: ClipboardList, file: FileText, wallet: Wallet, more: Ellipsis, settings: Settings,
  calendar: CalendarDays, history: History, back: ChevronLeft, next: ChevronRight, plus: Plus, search: Search,
  check: Check, logout: LogOut, upload: Upload, alert: TriangleAlert, code: Code, user: User, shield: ShieldCheck,
  link: Link, x: X, receipt: ReceiptText, signed: FilePen, clip: Paperclip, flag: Flag,
};

export type IconName = keyof typeof icons;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const Svg = icons[name];
  return <Svg className={className} strokeWidth={1.8} aria-hidden />;
}

/** CodeNova's four-point star, as in the site logo. */
export function Mark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 3l1.7 7.3L21 12l-7.3 1.7L12 21l-1.7-7.3L3 12l7.3-1.7z" />
    </svg>
  );
}
