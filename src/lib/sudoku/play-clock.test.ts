import { expect, it } from 'vitest';
import { createPlayClock } from './play-clock';
import { newGame, setValue } from './engine';
import { loadGame, saveGame, startNewGame } from '../player/storage';

function fixture() {
  let now = 0;
  const clock = createPlayClock(() => now);
  let game = newGame('easy', 123, 'clock');
  return { clock, get: () => game, set: (next: typeof game) => { game = next; }, advance: (ms: number) => { now += ms; } };
}

it('four subsecond play intervals count 2800ms, excluding pauses and duplicate stops', () => {
  const f = fixture();
  for (let n = 0; n < 4; n++) {
    f.clock.start(f.get()); f.advance(700);
    f.set(f.clock.stop(f.get()));
    f.advance(5000);
    f.set(f.clock.stop(f.get()));
  }
  expect(f.get().elapsedMs).toBe(2800);
});
it('counts full delayed ticks rather than capping actual foreground play at two seconds', () => {
  const f = fixture(); f.clock.start(f.get()); f.advance(4500);
  f.set(f.clock.charge(f.get())); f.advance(250);
  f.set(f.clock.stop(f.get()));
  expect(f.get().elapsedMs).toBe(4750);
});
it('hint dialogs and ads exclude waiting time while preserving the preceding partial tick', () => {
  const f = fixture(); f.clock.start(f.get()); f.advance(350);
  f.set(f.clock.stop(f.get())); f.advance(90000);
  f.clock.start(f.get()); f.advance(250); f.set(f.clock.stop(f.get()));
  expect(f.get().elapsedMs).toBe(600);
});
it('charges the last move before completion and never charges celebration or result time', () => {
  const f = fixture(); const g = f.get(); const cell = g.values.findIndex(v => !v);
  const values = g.solution.slice(); values[cell] = 0;
  f.set({ ...g, values, elapsedMs: 1000 });
  f.clock.start(f.get()); f.advance(725);
  f.set(setValue(f.clock.charge(f.get()), cell, g.solution[cell]));
  f.set(f.clock.stop(f.get())); f.advance(5000);
  f.set(f.clock.stop(f.get()));
  expect(f.get().finished).toBe(true);
  expect(f.get().elapsedMs).toBe(1725);
});
it('saves navigation/background partial time exactly once and resumes the persisted clock', () => {
  const f = fixture(); startNewGame(f.get()); f.clock.start(f.get()); f.advance(675);
  f.set(f.clock.stop(f.get())); saveGame(f.get());
  f.advance(10000); f.set(f.clock.stop(f.get()));
  const restored = loadGame(); if (!restored) throw new Error('missing game');
  expect(restored.elapsedMs).toBe(675);
  f.set(restored); f.clock.start(f.get()); f.advance(325);
  f.set(f.clock.stop(f.get()));
  expect(f.get().elapsedMs).toBe(1000);
});
it('never transfers an old game interval to a replacement game', () => {
  const f = fixture(); f.clock.start(f.get()); f.advance(700);
  const replacement = { ...f.get(), id: 'replacement' };
  expect(f.clock.stop(replacement).elapsedMs).toBe(0);
  f.clock.start(replacement); f.advance(100);
  expect(f.clock.stop(replacement).elapsedMs).toBe(100);
});