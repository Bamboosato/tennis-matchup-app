import { CountStepperField } from "./CountStepperField";
import { GenerationSummary } from "./GenerationSummary";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { MATCH_CONDITION_LIMITS } from "@/features/matchmaking/model/limits";
import type { MatchupMode } from "@/features/matchmaking/model/types";

type ConditionFormProps = {
  eventName: string;
  matchupMode: MatchupMode;
  participantCount: number;
  participantCountInput: string;
  femaleCount: number;
  femaleCountInput: string;
  maleCount: number;
  maleCountInput: string;
  courtCount: number;
  courtCountInput: string;
  roundCount: number;
  roundCountInput: string;
  isGenerating: boolean;
  errorMessage: string | null;
  onEventNameChange: (value: string) => void;
  onMatchupModeChange: (value: MatchupMode) => void;
  onParticipantCountChange: (value: string) => void;
  onParticipantCountCommit: () => void;
  onParticipantCountStep: (delta: number) => void;
  onFemaleCountChange: (value: string) => void;
  onFemaleCountCommit: () => void;
  onFemaleCountStep: (delta: number) => void;
  onMaleCountChange: (value: string) => void;
  onMaleCountCommit: () => void;
  onMaleCountStep: (delta: number) => void;
  onCourtCountChange: (value: string) => void;
  onCourtCountCommit: () => void;
  onCourtCountStep: (delta: number) => void;
  onRoundCountChange: (value: string) => void;
  onRoundCountCommit: () => void;
  onRoundCountStep: (delta: number) => void;
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
  femaleCount,
  femaleCountInput,
  maleCount,
  maleCountInput,
  courtCount,
  courtCountInput,
  roundCount,
  roundCountInput,
  isGenerating,
  errorMessage,
  onEventNameChange,
  onMatchupModeChange,
  onParticipantCountChange,
  onParticipantCountCommit,
  onParticipantCountStep,
  onFemaleCountChange,
  onFemaleCountCommit,
  onFemaleCountStep,
  onMaleCountChange,
  onMaleCountCommit,
  onMaleCountStep,
  onCourtCountChange,
  onCourtCountCommit,
  onCourtCountStep,
  onRoundCountChange,
  onRoundCountCommit,
  onRoundCountStep,
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
            className="w-full rounded-2xl border border-[#cdbda9] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(240,106,60,0.16)]"
          />
        </label>

        <CountStepperField
          label="参加人数"
          value={participantCountInput}
          numericValue={participantCount}
          min={MATCH_CONDITION_LIMITS.participantCount.min}
          max={MATCH_CONDITION_LIMITS.participantCount.max}
          inputTestId="participant-count-input"
          decrementTestId="participant-count-decrement"
          incrementTestId="participant-count-increment"
          decrementLabel="参加人数を1人減らす"
          incrementLabel="参加人数を1人増やす"
          onChange={onParticipantCountChange}
          onCommit={onParticipantCountCommit}
          onStep={onParticipantCountStep}
        />

        <CountStepperField
          label="女性人数"
          value={femaleCountInput}
          numericValue={femaleCount}
          min={MATCH_CONDITION_LIMITS.genderCount.min}
          max={participantCount}
          inputTestId="female-count-input"
          decrementTestId="female-count-decrement"
          incrementTestId="female-count-increment"
          decrementLabel="女性人数を1人減らす"
          incrementLabel="女性人数を1人増やす"
          disabled={genderCountDisabled}
          onChange={onFemaleCountChange}
          onCommit={onFemaleCountCommit}
          onStep={onFemaleCountStep}
        />

        <CountStepperField
          label="男性人数"
          value={maleCountInput}
          numericValue={maleCount}
          min={MATCH_CONDITION_LIMITS.genderCount.min}
          max={participantCount}
          inputTestId="male-count-input"
          decrementTestId="male-count-decrement"
          incrementTestId="male-count-increment"
          decrementLabel="男性人数を1人減らす"
          incrementLabel="男性人数を1人増やす"
          disabled={genderCountDisabled}
          onChange={onMaleCountChange}
          onCommit={onMaleCountCommit}
          onStep={onMaleCountStep}
        />

        <CountStepperField
          label="コート数"
          value={courtCountInput}
          numericValue={courtCount}
          min={MATCH_CONDITION_LIMITS.courtCount.min}
          max={MATCH_CONDITION_LIMITS.courtCount.max}
          inputTestId="court-count-input"
          decrementTestId="court-count-decrement"
          incrementTestId="court-count-increment"
          decrementLabel="コート数を1面減らす"
          incrementLabel="コート数を1面増やす"
          onChange={onCourtCountChange}
          onCommit={onCourtCountCommit}
          onStep={onCourtCountStep}
        />

        <CountStepperField
          label="実施回数"
          value={roundCountInput}
          numericValue={roundCount}
          min={MATCH_CONDITION_LIMITS.roundCount.min}
          max={MATCH_CONDITION_LIMITS.roundCount.max}
          inputTestId="round-count-input"
          decrementTestId="round-count-decrement"
          incrementTestId="round-count-increment"
          decrementLabel="実施回数を1回減らす"
          incrementLabel="実施回数を1回増やす"
          onChange={onRoundCountChange}
          onCommit={onRoundCountCommit}
          onStep={onRoundCountStep}
        />
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
