import type { ReactNode } from "react";

type StickyActionBarProps = {
  children: ReactNode;
};

export function StickyActionBar({ children }: StickyActionBarProps) {
  return (
    <div className="sticky bottom-3 z-20 mt-6 rounded-[1.4rem] border border-white/70 bg-white/90 p-3 shadow-[0_20px_50px_rgba(53,40,19,0.12)] backdrop-blur md:static md:bg-transparent md:p-0 md:shadow-none">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
        {children}
      </div>
    </div>
  );
}
