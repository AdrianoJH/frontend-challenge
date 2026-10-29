import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled,
  label = 'Quantidade',
  solid = false,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label?: string;
  solid?: boolean;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  if (solid) {
    return (
      <div className="inline-flex items-center gap-1.5" role="group" aria-label={label}>
        <Button type="button" size="icon" className="h-[49.5px] w-[33px] rounded-[33px]" disabled={disabled} onClick={() => onChange(clamp(value - 1))} aria-label="Diminuir quantidade">
          <Minus className="size-4" />
        </Button>
        <input
          type="number"
          inputMode="numeric"
          className="h-9 w-10 bg-transparent text-center text-sm tabular-nums focus-visible:outline-none"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(clamp(Math.trunc(n)));
          }}
        />
        <Button type="button" size="icon" className="h-[49.5px] w-[33px] rounded-[33px]" disabled={disabled} onClick={() => onChange(clamp(value + 1))} aria-label="Aumentar quantidade">
          <Plus className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center rounded-md border border-input" role="group" aria-label={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-r-none"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        aria-label="Diminuir quantidade"
      >
        <Minus className="size-4" />
      </Button>
      <input
        type="number"
        inputMode="numeric"
        className="h-9 w-12 border-x border-input bg-transparent text-center text-sm tabular-nums focus-visible:outline-none"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(clamp(Math.trunc(n)));
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-l-none"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
        aria-label="Aumentar quantidade"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
