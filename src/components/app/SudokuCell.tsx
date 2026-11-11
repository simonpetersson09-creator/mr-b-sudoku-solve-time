import { memo, type CSSProperties } from 'react';
import { hasNote } from '@/lib/sudoku/engine';

type Props = {
  index: number; value: number; notes: number; label: string;
  given: boolean; selected: boolean; peer: boolean; same: boolean;
  flash: boolean; pop: boolean; shake: boolean; wave: boolean; wrong: boolean;
  hint: boolean; zone: boolean; hinted: boolean; solution: number;
  onSelect: (index: number) => void;
};

/** Clock ticks do not reconcile 81 unchanged buttons; only changed cells render. */
export const SudokuCell = memo(function SudokuCell(p: Props) {
  const row = Math.floor(p.index / 9), col = p.index % 9;
  return (
    <button role="gridcell" className="sdk-cell" data-r={row} data-c={col}
      data-given={p.given} data-selected={p.selected} data-peer={p.peer} data-same={p.same}
      data-flash={p.flash} data-pop={p.pop} data-shake={p.shake} data-wave={p.wave}
      data-wrong={p.wrong} data-hint={p.hint} data-hint-zone={p.zone || undefined}
      data-hinted={p.hinted || undefined} style={{ '--d': row + col } as CSSProperties}
      aria-label={p.label} aria-selected={p.selected} aria-readonly={p.given} aria-invalid={p.wrong}
      aria-rowindex={row + 1} aria-colindex={col + 1} onClick={() => p.onSelect(p.index)}>
      {p.hint && <span className="sdk-hint-digit" aria-hidden="true">{p.solution}</span>}
      {p.value ? p.value : p.notes ? <span className="sdk-notes" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => hasNote(p.notes, d)).map(d => <span key={d}>{d}</span>)}
      </span> : null}
    </button>
  );
});