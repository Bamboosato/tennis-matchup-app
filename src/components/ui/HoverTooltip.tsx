"use client";

import { cloneElement, useId, type ReactElement } from "react";

type HoverTooltipProps = {
  text: string;
  placement?: "top" | "bottom";
  children: ReactElement<{ "aria-describedby"?: string }>;
};

export function HoverTooltip({
  text,
  placement = "top",
  children,
}: HoverTooltipProps) {
  const tooltipId = useId();
  const placementClass =
    placement === "bottom"
      ? "top-[calc(100%+10px)]"
      : "bottom-[calc(100%+10px)]";

  return (
    <span className="group/tooltip relative inline-flex max-w-full">
      {cloneElement(children, {
        "aria-describedby": tooltipId,
      })}
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-30 hidden w-[220px] -translate-x-1/2 rounded-[1rem] bg-[rgba(47,38,27,0.94)] px-3 py-2 text-center text-xs leading-5 text-white opacity-0 shadow-[0_14px_32px_rgba(20,14,9,0.24)] transition duration-150 md:block group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 ${placementClass}`}
      >
        {text}
      </span>
    </span>
  );
}
