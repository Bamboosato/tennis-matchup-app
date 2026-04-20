import { GenerationSummary } from "./GenerationSummary";

type ConditionFormProps = {
  eventName: string;
  participantCount: number;
  courtCount: number;
  roundCount: number;
  isGenerating: boolean;
  errorMessage: string | null;
  onEventNameChange: (value: string) => void;
  onParticipantCountChange: (value: number) => void;
  onCourtCountChange: (value: number) => void;
  onRoundCountChange: (value: number) => void;
  onSubmit: () => void;
};

export function ConditionForm({
  eventName,
  participantCount,
  courtCount,
  roundCount,
  isGenerating,
  errorMessage,
  onEventNameChange,
  onParticipantCountChange,
  onCourtCountChange,
  onRoundCountChange,
  onSubmit,
}: ConditionFormProps) {
  function commitNumberInput(
    input: HTMLInputElement,
    fallbackValue: number,
    minValue: number,
    onCommit: (value: number) => void,
  ) {
    const parsed = Number(input.value);

    if (!Number.isFinite(parsed)) {
      input.value = String(fallbackValue);
      onCommit(fallbackValue);
      return;
    }

    const safeValue = Math.max(minValue, Math.trunc(parsed));
    input.value = String(safeValue);
    onCommit(safeValue);
  }

  return (
    <section
      data-testid="condition-form"
      className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(53,40,19,0.12)] backdrop-blur sm:p-6"
    >
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Conditions
        </p>
        <p className="max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
          休憩の公平性と連続休憩なしを優先し、そのうえで顔合わせの偏りを減らす前提で作成します。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--color-muted)]">開催名</span>
          <input
            data-testid="event-name-input"
            value={eventName}
            onChange={(event) => onEventNameChange(event.target.value)}
            placeholder="例: 4月ナイター会"
            className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--color-accent)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--color-muted)]">参加人数</span>
          <input
            data-testid="participant-count-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={4}
            defaultValue={participantCount}
            onBlur={(event) =>
              commitNumberInput(event.currentTarget, participantCount, 4, onParticipantCountChange)
            }
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              commitNumberInput(event.currentTarget, participantCount, 4, onParticipantCountChange);
            }}
            className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--color-accent)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--color-muted)]">コート数</span>
          <input
            data-testid="court-count-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={1}
            defaultValue={courtCount}
            onBlur={(event) =>
              commitNumberInput(event.currentTarget, courtCount, 1, onCourtCountChange)
            }
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              commitNumberInput(event.currentTarget, courtCount, 1, onCourtCountChange);
            }}
            className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--color-accent)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--color-muted)]">実施回数</span>
          <input
            data-testid="round-count-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={1}
            defaultValue={roundCount}
            onBlur={(event) =>
              commitNumberInput(event.currentTarget, roundCount, 1, onRoundCountChange)
            }
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              commitNumberInput(event.currentTarget, roundCount, 1, onRoundCountChange);
            }}
            className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--color-accent)]"
          />
        </label>
      </div>

      <div className="mt-6">
        <GenerationSummary participantCount={participantCount} courtCount={courtCount} />
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
        組合せ表では参加者を <span className="font-semibold text-[var(--color-ink)]">00</span> から順に
        自動採番して表示します。
      </p>

      {errorMessage ? (
        <p className="mt-5 rounded-2xl border border-[#efb0a0] bg-[#fff1ed] px-4 py-3 text-sm text-[#a2422b]">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          data-testid="generate-button"
          type="button"
          onClick={onSubmit}
          disabled={isGenerating}
          className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? "作成中..." : "組合せ作成／再作成"}
        </button>
      </div>
    </section>
  );
}
