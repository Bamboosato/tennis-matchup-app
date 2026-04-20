import type { PrintModel } from "@/features/matchmaking/model/types";
import { RoundCard } from "../results/RoundCard";

type PrintLayoutProps = {
  model: PrintModel;
};

function escapeCssContent(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function PrintLayout({ model }: PrintLayoutProps) {
  const printHeaderTitle = escapeCssContent(
    model.conditions.eventName || "テニス対戦組合せApp",
  );
  const printHeaderMeta = escapeCssContent(
    `実施回数 ${model.conditions.roundCount} 回 / コート数 ${model.conditions.courtCount} 面 / 参加人数 ${model.conditions.participants.length} 人`,
  );

  return (
    <div className="mx-auto w-full max-w-5xl bg-white px-3 py-4 print:max-w-none print:p-0">
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm 8mm 12mm 8mm;

              @top-left {
                content: "${printHeaderTitle}";
                color: #2f261b;
                font-size: 11pt;
                font-weight: 700;
              }

              @top-right {
                content: "${printHeaderMeta}";
                color: #5b4d3b;
                font-size: 9pt;
                font-weight: 600;
              }

              @bottom-right {
                content: counter(page) " / " counter(pages);
                color: #5b4d3b;
                font-size: 9pt;
                font-weight: 600;
              }
            }
          }
        `}
      </style>

      <header className="mb-3 border-b border-[var(--color-line)] pb-2 print:hidden">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)]">
          Matchup Sheet
        </p>
        <div className="mt-1 flex items-end justify-between gap-4 print:gap-3">
          <h1 className="font-display text-2xl print:text-[22px]">
            {model.conditions.eventName || "テニス対戦組合せApp"}
          </h1>
          <p className="text-base font-medium text-[var(--color-muted)] print:text-[15px]">
            実施回数 {model.conditions.roundCount} 回 / コート数 {model.conditions.courtCount} 面 / 参加人数{" "}
            {model.conditions.participants.length} 人
          </p>
        </div>
      </header>

      <div className="grid gap-2 print:gap-[6px]">
        {model.rounds.map((round) => (
          <RoundCard
            key={`print-round-${round.roundNumber}`}
            round={round}
            participants={model.conditions.participants}
            compact
          />
        ))}
      </div>
    </div>
  );
}
