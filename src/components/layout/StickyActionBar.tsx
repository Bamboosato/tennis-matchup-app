import type { ReactNode } from "react";

type StickyActionBarProps = {
  children: ReactNode;
};

export function StickyActionBar({ children }: StickyActionBarProps) {
  return (
    <div className="mt-6 rounded-[1.4rem] border border-white/70 bg-white/90 p-3 shadow-[0_20px_50px_rgba(53,40,19,0.12)] backdrop-blur md:sticky md:bottom-3 md:z-20">
      <div className="flex flex-wrap justify-center gap-3 md:justify-end">
        {children}
      </div>
    </div>
  );
}
