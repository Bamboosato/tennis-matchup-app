import type { ReactNode } from "react";

type ResponsiveShellProps = {
  children: ReactNode;
};

export function ResponsiveShell({ children }: ResponsiveShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(240,106,60,0.18),_transparent_35%),linear-gradient(180deg,_#f6f1e8_0%,_#f1eee7_100%)] text-[var(--color-ink)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
