import { Minus, Plus } from "lucide-react";

type CountStepperFieldProps = {
  label: string;
  value: string;
  numericValue: number;
  min: number;
  max: number;
  inputTestId: string;
  decrementTestId: string;
  incrementTestId: string;
  decrementLabel: string;
  incrementLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onCommit: () => void;
  onStep: (delta: number) => void;
};

export function CountStepperField({
  label,
  value,
  numericValue,
  min,
  max,
  inputTestId,
  decrementTestId,
  incrementTestId,
  decrementLabel,
  incrementLabel,
  disabled = false,
  onChange,
  onCommit,
  onStep,
}: CountStepperFieldProps) {
  const inputId = `${inputTestId}-field`;
  const decrementDisabled = disabled || numericValue <= min;
  const incrementDisabled = disabled || numericValue >= max;

  return (
    <div className="flex w-full items-center justify-between gap-3 md:flex-col md:items-stretch md:justify-start md:gap-2">
      <label
        htmlFor={inputId}
        className="shrink-0 whitespace-nowrap text-base font-semibold text-[var(--color-ink)]"
      >
        {label}
      </label>
      <div
        className={
          disabled
            ? "grid h-12 w-[160px] shrink-0 grid-cols-[44px_minmax(0,1fr)_44px] overflow-hidden rounded-2xl border border-[#cdbda9] bg-[#f3eee7] text-[var(--color-muted)] md:w-full"
            : "grid h-12 w-[160px] shrink-0 grid-cols-[44px_minmax(0,1fr)_44px] overflow-hidden rounded-2xl border border-[#cdbda9] bg-white transition focus-within:border-[var(--color-accent)] focus-within:ring-4 focus-within:ring-[rgba(240,106,60,0.16)] md:w-full"
        }
      >
        <button
          data-testid={decrementTestId}
          type="button"
          aria-label={decrementLabel}
          title={decrementLabel}
          disabled={decrementDisabled}
          onClick={() => onStep(-1)}
          className="flex h-full items-center justify-center border-r border-[#cdbda9] text-[var(--color-ink)] transition hover:bg-[#fff0e4] disabled:cursor-not-allowed disabled:bg-transparent disabled:text-[var(--color-muted)] disabled:opacity-45"
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <input
          id={inputId}
          data-testid={inputTestId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            onCommit();
          }}
          className="min-w-0 bg-transparent px-2 text-center text-base outline-none disabled:cursor-not-allowed"
        />
        <button
          data-testid={incrementTestId}
          type="button"
          aria-label={incrementLabel}
          title={incrementLabel}
          disabled={incrementDisabled}
          onClick={() => onStep(1)}
          className="flex h-full items-center justify-center border-l border-[#cdbda9] text-[var(--color-ink)] transition hover:bg-[#fff0e4] disabled:cursor-not-allowed disabled:bg-transparent disabled:text-[var(--color-muted)] disabled:opacity-45"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
