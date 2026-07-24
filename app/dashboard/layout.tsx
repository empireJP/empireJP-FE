import { DashboardTabs, NewEventButton } from "@/components/DashboardTabs";
import { Avatar } from "@/components/Avatar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* org bar */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar name="Skyline Live" size={40} ring={false} />
          <div>
            <p className="flex items-center gap-1.5 font-semibold text-fg">
              Skyline Live
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                Organizer
              </span>
            </p>
            <p className="text-xs text-muted">Manage your events and audience</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <DashboardTabs />
          <NewEventButton />
        </div>
      </div>

      {children}
    </div>
  );
}
