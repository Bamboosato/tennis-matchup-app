import { GenerationSummary } from "./GenerationSummary";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import type { MatchupMode } from "@/features/matchmaking/model/types";

type ConditionFormProps = {
  eventName: string;
  matchupMode: MatchupMode;
  participantCount: number;
  participantCountInput: string;
  femaleCountInput: string;
  maleCountInput: string;
  courtCount: number;
  courtCountInput: string;
  roundCountInput: string;
  isGenerating: boolean;
  errorMessage: string | null;
  onEventNameChange: (value: string) => void;
  onMatchupModeChange: (value: MatchupMode) => void;
  onParticipantCountChange: (value: string) => void;
  onParticipantCountCommit: () => void;
  onFemaleCountChange: (value: string) => void;
  onFemaleCountCommit: () => void;
  onMaleCountChange: (value: string) => void;
  onMaleCountCommit: () => void;
  onCourtCountChange: (value: string) => void;
  onCourtCountCommit: () => void;
  onRoundCountChange: (value: string) => void;
  onRoundCountCommit: () => void;
  onSubmit: () => void;
};

function parseCountInput(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.trunc(parsed));
}

function formatParticipantNumber(value: number): string {
  return String(value).padStart(2, "0");
}

function formatNumberRange(start: number, count: number): string | null {
  if (count <= 0) {
    return null;
  }

  return `${formatParticipantNumber(start)}～${formatParticipantNumber(start + count - 1)}`;
}

function buildNumberingBreakdown(params: {
  matchupMode: MatchupMode;
  participantCount: number;
  femaleCountInput: string;
  maleCountInput: string;
}) {
  if (params.matchupMode === "standard") {
    return {
      label: "採番内訳",
      value: `01～${formatParticipantNumber(params.participantCount)}：参加者`,
      note: "通常モードでは性別マークを付けず、番号順に表示します。",
      invalid: false,
    };
  }

  const femaleCount = parseCountInput(params.femaleCountInput);
  const maleCount = parseCountInput(params.maleCountInput);

  if (femaleCount === null || maleCount === null) {
    return {
      label: "採番内訳",
      value: "女性人数・男性人数を入力してください",
      note: "女性から先に自動採番し、番号横に F / M を表示します。",
      invalid: true,
    };
  }

  if (femaleCount + maleCount !== params.participantCount) {
    return {
      label: "採番内訳",
      value: `女性 ${femaleCount} 人 + 男性 ${maleCount} 人 = ${femaleCount + maleCount} 人`,
      note: `参加人数 ${params.participantCount} 人と一致させてください。`,
      invalid: true,
    };
  }

  const femaleRange = formatNumberRange(1, femaleCount);
  const maleRange = formatNumberRange(femaleCount + 1, maleCount);
  const ranges = [
    femaleRange ? `${femaleRange}：女性` : "女性なし",
    maleRange ? `${maleRange}：男性` : "男性なし",
  ];

  return {
    label: "採番内訳",
    value: ranges.join("、"),
    note: "女性から先に自動採番し、番号横に F / M を表示します。",
    invalid: false,
  };
}

export function ConditionForm({
  eventName,
  matchupMode,
  participantCount,
  participantCountInput,
  femaleCountInput,
  maleCountInput,
  courtCount,
  courtCountInput,
  roundCountInput,
  isGenerating,
  errorMessage,
  onEventNameChange,
  onMatchupModeChange,
  onParticipantCountChange,
  onParticipantCountCommit,
  onFemaleCountChange,
  onFemaleCountCommit,
  onMaleCountChange,
  onMaleCountCommit,
  onCourtCountChange,
  onCourtCountCommit,
  onRoundCountChange,
  onRoundCountCommit,
  onSubmit,
}: ConditionFormProps) {
  const genderCountDisabled = matchupMode === "standard";
  const matchupModeOptions: Array<{ label: string; value: MatchupMode; tooltip: string }> = [
    {
      label: "通常",
      value: "standard",
      tooltip: "男女に関係なく組合せを作成します。",
    },
    {
      label: "同性対決優先",
      value: "sameGenderPriority",
      tooltip: "同性同士の対戦を優先して組合せを作成します。",
    },
    {
      label: "混合対決優先",
      value: "mixedDoublesPriority",
      tooltip: "男女混合の対戦を優先して組合せを作成します。",
    },
  ];
  const numberingBreakdown = buildNumberingBreakdown({
    matchupMode,
    participantCount,
    femaleCountInput,
    maleCountInput,
  });

  return (
    <section
      data-testid="condition-form"
      className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(53,40,19,0.12)] backdrop-blur sm:p-6"
    >
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-base font-semibold uppercase tracking-[0.2em] text-[var(--color-ink)]">
          Conditions
        </p>
        <p className="text-pretty text-base leading-8 text-[var(--color-muted)]">
          休憩の公平性と連続休憩なしを優先し、そのうえで顔合わせの偏りを減らす前提で作成します。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.6fr)_repeat(5,minmax(92px,1fr))]">
        <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-6">
          <span className="text-base font-semibold text-[var(--color-ink)]">対戦モード</span>
          <div className="grid gap-2 rounded-2xl border border-[#cdbda9] bg-white p-1.5 sm:grid-cols-3">
            {matchupModeOptions.map((option) => (
              <HoverTooltip key={option.value} text={option.tooltip}>
                <button
                  type="button"
                  aria-pressed={matchupMode === option.value}
                  onClick={() => onMatchupModeChange(option.value)}
                  className={
                    matchupMode === option.value
                      ? "w-full rounded-xl bg-[var(--color-accent)] px-3 py-2.5 text-base font-semibold text-white"
                      : "w-full rounded-xl border border-[rgba(205,189,169,0.65)] bg-[#fbf4ec] px-3 py-2.5 text-base font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:bg-[#fff0e4]"
                  }
                >
                  {option.label}
                </button>
              </HoverTooltip>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-1">
          <span className="text-base font-semibold text-[var(--color-ink)]">開催名</span>
          <input
            data-testid="event-name-input"
            value={eventName}
            onChange={(event) => onEventNameChange(event.target.value)}
            placeholder="例: 4月ナイター会"
            className="rounded-2xl border border-[#cdbda9] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(240,106,60,0.16)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-base font-semibold text-[var(--color-ink)]">参加人数</span>
          <input
            data-testid="participant-count-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={4}
            value={participantCountInput}
            onChange={(event) => onParticipantCountChange(event.target.value)}
            onBlur={onParticipantCountCommit}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              onParticipantCountCommit();
            }}
            className="rounded-2xl border border-[#cdbda9] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(240,106,60,0.16)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-base font-semibold text-[var(--color-ink)]">女性人数</span>
          <input
            data-testid="female-count-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            value={femaleCountInput}
            disabled={genderCountDisabled}
            onChange={(event) => onFemaleCountChange(event.target.value)}
            onBlur={onFemaleCountCommit}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              onFemaleCountCommit();
            }}
            className="rounded-2xl border border-[#cdbda9] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(240,106,60,0.16)] disabled:cursor-not-allowed disabled:bg-[#f3eee7] disabled:text-[var(--color-muted)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-base font-semibold text-[var(--color-ink)]">男性人数</span>
          <input
            data-testid="male-count-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            value={maleCountInput}
            disabled={genderCountDisabled}
            onChange={(event) => onMaleCountChange(event.target.value)}
            onBlur={onMaleCountCommit}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              onMaleCountCommit();
            }}
            className="rounded-2xl border border-[#cdbda9] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(240,106,60,0.16)] disabled:cursor-not-allowed disabled:bg-[#f3eee7] disabled:text-[var(--color-muted)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-base font-semibold text-[var(--color-ink)]">コート数</span>
          <input
            data-testid="court-count-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={1}
            value={courtCountInput}
            onChange={(event) => onCourtCountChange(event.target.value)}
            onBlur={onCourtCountCommit}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              onCourtCountCommit();
            }}
            className="rounded-2xl border border-[#cdbda9] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(240,106,60,0.16)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-base font-semibold text-[var(--color-ink)]">実施回数</span>
          <input
            data-testid="round-count-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={1}
            value={roundCountInput}
            onChange={(event) => onRoundCountChange(event.target.value)}
            onBlur={onRoundCountCommit}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              onRoundCountCommit();
            }}
            className="rounded-2xl border border-[#cdbda9] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(240,106,60,0.16)]"
          />
        </label>
      </div>

      <div className="mt-6">
        <GenerationSummary participantCount={participantCount} courtCount={courtCount} />
      </div>

      <div
        data-testid="auto-numbering-breakdown"
        className={
          numberingBreakdown.invalid
            ? "mt-4 rounded-[1.3rem] border border-[#efb0a0] bg-[#fff1ed] px-4 py-3 text-[#8f3822]"
            : "mt-4 rounded-[1.3rem] border border-[rgba(240,106,60,0.32)] bg-[#fff7ef] px-4 py-3 text-[var(--color-ink)] shadow-[0_10px_28px_rgba(53,40,19,0.06)]"
        }
      >
        <p className="text-sm font-semibold uppercase tracking-[0.16em]">
          {numberingBreakdown.label}
        </p>
        <p className="mt-1 text-lg font-semibold leading-8">
          {numberingBreakdown.value}
        </p>
        <p className="mt-1 text-base leading-7 text-[var(--color-muted)]">
          {numberingBreakdown.note}
        </p>
      </div>

      {errorMessage ? (
        <p className="mt-5 rounded-2xl border border-[#efb0a0] bg-[#fff1ed] px-4 py-3 text-base leading-7 text-[#8f3822]">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 flex justify-center sm:justify-end">
        <HoverTooltip text="入力した条件で組合せを作成または再作成します。">
          <button
            data-testid="generate-button"
            type="button"
            onClick={onSubmit}
            disabled={isGenerating}
            className="rounded-full bg-[var(--color-accent)] px-7 py-3.5 text-base font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                作成中...
              </span>
            ) : (
              "組合せ作成／再作成"
            )}
          </button>
        </HoverTooltip>
      </div>
    </section>
  );
}
