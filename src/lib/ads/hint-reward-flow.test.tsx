import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { newGame } from '@/lib/sudoku/engine';
import { loadGame, loadStats, removeGame, startNewGame } from '@/lib/player/storage';
const ads = vi.hoisted(() => ({ show: vi.fn(), reward: null as (() => void) | null, resolve: null as ((r: string) => void) | null }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (o: unknown) => o, useNavigate: () => navigate }));
const navigate = vi.fn();
vi.mock('@/lib/ads/admob', () => ({
  getRewardedState: () => 'idle', subscribeRewardedState: () => () => {}, preloadInterstitial: async () => false, preloadRewarded: async () => true,
  showOptionalRewarded: (options: { onReward: () => void }) => { ads.show(); ads.reward = options.onReward; return new Promise(r => { ads.resolve = r; }); },
}));
vi.mock('@/lib/backend/report', () => ({ reportLocalGame: vi.fn() }));
vi.mock('@/lib/sudoku/generation', () => ({ prepareGame: vi.fn() }));
vi.mock('@/lib/native/haptics', () => ({ playLightHaptic: vi.fn(), playSuccessHaptic: vi.fn(), playDiceLandHaptic: vi.fn() }));
vi.mock('@/lib/ads/usePostMatchExit', () => ({ usePostMatchExit: () => ({ leaving: false, leave: vi.fn() }) }));
vi.mock('@/components/AppOpenGameGate', () => ({ AppOpenGameGate: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/lib/i18n', async () => { const { sv } = await import('@/lib/i18n/translations/sv'); return { useTranslation: () => ({ t: (key: keyof typeof sv) => sv[key] }) }; });
vi.mock('sonner', () => ({ toast: { message: vi.fn(), error: vi.fn() } }));
import { PlayPage } from '@/routes/play';
beforeEach(() => {
  localStorage.clear(); ads.show.mockClear(); ads.reward = null; ads.resolve = null;
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  startNewGame(newGame('easy', 321, 'ui-game'));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function offer() { fireEvent.click(await screen.findByRole('button', { name: 'Ledtråd: 3/3' })); await screen.findByRole('alertdialog'); }
it('placing a correct digit clears the selection immediately and saves the digit', async () => {
  const game = loadGame(); if (!game) throw new Error('fixture');
  const i = game.values.findIndex(v => v === 0);
  render(<PlayPage />);
  const cells = await screen.findAllByRole('gridcell');
  fireEvent.click(cells[i]);
  fireEvent.click(screen.getByRole('button', { name: String(game.solution[i]) }));
  expect(loadGame()?.values[i]).toBe(game.solution[i]);
  expect(screen.getAllByRole('gridcell').filter(c => c.dataset['selected'] === 'true')).toHaveLength(0);
});
it('a voluntary offer can be cancelled without displaying an ad or using a hint', async () => {
  render(<PlayPage />); await offer(); expect(ads.show).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }));
  expect(ads.show).not.toHaveBeenCalled(); expect(loadGame()?.hints).toBe(0);
});
it('acceptance, duplicate reward callbacks and restoration give exactly one hint in the real play screen', async () => {
  render(<PlayPage />); await offer(); const before = loadGame();
  fireEvent.click(screen.getByRole('button', { name: 'Se annons' }));
  expect(ads.show).toHaveBeenCalledOnce(); expect(loadGame()?.hints).toBe(0);
  await act(async () => { ads.reward?.(); ads.reward?.(); ads.resolve?.('rewarded'); });
  await screen.findByRole('button', { name: 'Ledtråd: 2/3' });
  const saved = loadGame(); expect(saved?.hints).toBe(1);
  expect(saved?.values.filter((v, i) => v !== before?.values[i])).toHaveLength(1);
  cleanup(); render(<PlayPage />); await screen.findByRole('button', { name: 'Ledtråd: 2/3' });
  expect(loadGame()?.values).toEqual(saved?.values);
});
it.each(['failed', 'not_earned', 'unavailable'])('%s never consumes a hint in the play screen', async result => {
  render(<PlayPage />); await offer(); fireEvent.click(screen.getByRole('button', { name: 'Se annons' }));
  await act(async () => { ads.resolve?.(result); });
  expect(loadGame()?.hints).toBe(0); expect(screen.getByRole('button', { name: 'Ledtråd: 3/3' })).toBeEnabled();
});
it.each(['new', 'removed', 'unmounted'])('a %s game cannot receive the old ad reward', async kind => {
  render(<PlayPage />); await offer(); fireEvent.click(screen.getByRole('button', { name: 'Se annons' }));
  if (kind === 'new') startNewGame(newGame('easy', 322, 'new-game'));
  if (kind === 'removed') removeGame('ui-game');
  if (kind === 'unmounted') cleanup();
  await act(async () => { ads.reward?.(); ads.resolve?.('rewarded'); });
  expect(loadGame()?.hints ?? 0).toBe(0);
});
it('three used hints disable the offer, so no fourth ad can be accepted', async () => {
  const game = loadGame(); if (!game) throw new Error('fixture'); startNewGame({ ...game, hints: 3 });
  render(<PlayPage />); const button = await screen.findByRole('button', { name: 'Ledtråd: 0/3' });
  expect(button).toBeDisabled(); fireEvent.click(button);
  expect(screen.queryByRole('alertdialog')).toBeNull(); expect(ads.show).not.toHaveBeenCalled();
});
it('native background saves digits and notes immediately and freezes time until explicit resume', async () => {
  render(<PlayPage />);
  const cells = await screen.findAllByRole('gridcell');
  const game = loadGame(); if (!game) throw new Error('fixture');
  const i = game.values.findIndex(v => v === 0);
  fireEvent.click(cells[i]);
  fireEvent.click(screen.getByRole('button', { name: 'Anteckningar' }));
  fireEvent.click(screen.getByRole('button', { name: '4' }));
  const before = loadGame();
  vi.useFakeTimers();
  act(() => { window.dispatchEvent(new Event('mrb-sudoku:pause')); });
  const saved = loadGame();
  expect(saved?.notes).toEqual(before?.notes);
  expect(saved?.values).toEqual(before?.values);
  expect(screen.queryByRole('grid')).toBeNull();
  act(() => { vi.advanceTimersByTime(60_000); window.dispatchEvent(new Event('mrb-sudoku:resume')); });
  expect(loadGame()?.elapsedMs).toBe(saved?.elapsedMs);
  expect(screen.queryByRole('grid')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Fortsätt' }));
  act(() => { vi.advanceTimersByTime(1000); });
  expect(loadGame()?.elapsedMs).toBe((saved?.elapsedMs ?? 0) + 1000);
});
it('an ad finishing after native background cannot resume the paused board', async () => {
  render(<PlayPage />); await offer();
  fireEvent.click(screen.getByRole('button', { name: 'Se annons' }));
  act(() => { window.dispatchEvent(new Event('mrb-sudoku:pause')); });
  await act(async () => { ads.resolve?.('not_earned'); });
  expect(screen.queryByRole('grid')).toBeNull();
  expect(loadGame()?.hints).toBe(0);
});
it('native pause persists the partial clock tick once even when visibility also changes', async () => {
  const now = performance.now();
  const clock = vi.spyOn(performance, 'now').mockReturnValue(now);
  render(<PlayPage />); await screen.findAllByRole('gridcell');
  clock.mockReturnValue(now + 500);
  const before = loadGame()?.elapsedMs ?? 0;
  act(() => { window.dispatchEvent(new Event('mrb-sudoku:pause')); });
  expect(loadGame()?.elapsedMs).toBe(before + 500);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(loadGame()?.elapsedMs).toBe(before + 500);
  clock.mockRestore();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});
it('manual pause/resume counts all four 700ms intervals and excludes the pauses in the saved game', async () => {
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  render(<PlayPage />); await screen.findAllByRole('gridcell');
  for (let n = 0; n < 4; n++) {
    now += 700;
    fireEvent.click(screen.getByRole('button', { name: 'Pausa' }));
    expect(loadGame()?.elapsedMs).toBe((n + 1) * 700);
    now += 10000;
    fireEvent.click(screen.getByRole('button', { name: 'Fortsätt' }));
  }
  expect(loadGame()?.elapsedMs).toBe(2800);
});
it('the final correct digit records the partial tick before statistics and stops result time', async () => {
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  const g = loadGame(); if (!g) throw new Error('fixture');
  const i = g.values.findIndex(v => !v); const values = g.solution.slice(); values[i] = 0;
  startNewGame({ ...g, values, elapsedMs: 1000 });
  render(<PlayPage />); const cells = await screen.findAllByRole('gridcell');
  now = 725;
  fireEvent.click(cells[i]); fireEvent.click(screen.getByRole('button', { name: String(g.solution[i]) }));
  expect(loadStats().easy.totalMs).toBe(1725);
  expect(loadStats().easy.bestMs).toBe(1725);
  now = 10000; cleanup();
  expect(loadStats().easy.totalMs).toBe(1725);
});
it('hint waiting excludes time, preserves partial play and the actual rewarded UI cannot undo the hint', async () => {
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  render(<PlayPage />); await screen.findAllByRole('gridcell');
  now = 350; await offer();
  expect(loadGame()?.elapsedMs).toBe(350);
  now = 20000; fireEvent.click(screen.getByRole('button', { name: 'Se annons' }));
  now = 90000;
  await act(async () => { ads.reward?.(); ads.resolve?.('rewarded'); });
  expect(loadGame()?.elapsedMs).toBe(350);
  expect(screen.getByRole('button', { name: 'Ångra: 3/3' })).toBeDisabled();
  now += 250; fireEvent.click(screen.getByRole('button', { name: 'Pausa' }));
  expect(loadGame()?.elapsedMs).toBe(600);
});
it('unmount saves partial time but never resurrects an explicitly ended game', async () => {
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  render(<PlayPage />); await screen.findAllByRole('gridcell');
  now = 675; cleanup();
  expect(loadGame()?.elapsedMs).toBe(675);
  render(<PlayPage />); await screen.findAllByRole('gridcell');
  removeGame('ui-game'); now += 300; cleanup();
  expect(loadGame()).toBeNull();
});
it('end confirmation pauses partial time and cancel resumes without counting dialog time', async () => {
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  render(<PlayPage />); await screen.findAllByRole('gridcell');
  now = 650;
  fireEvent.click(screen.getByRole('button', { name: 'Avsluta spel' }));
  expect(loadGame()?.elapsedMs).toBe(650);
  now = 10650;
  fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }));
  now += 350;
  fireEvent.click(screen.getByRole('button', { name: 'Pausa' }));
  expect(loadGame()?.elapsedMs).toBe(1000);
});
it('blocks arrows, digits and deletion behind the hint dialog', async () => {
  render(<PlayPage />); const cells = await screen.findAllByRole('gridcell');
  fireEvent.click(cells[0]); const before = loadGame(); await offer();
  for (const key of ['ArrowRight', '1', 'Delete']) fireEvent.keyDown(window, { key });
  expect(loadGame()?.values).toEqual(before?.values);
  expect(cells[0].getAttribute('aria-selected')).toBe('true');
});
it('the board has one tab stop and arrows move focus without crossing row boundaries', async () => {
  render(<PlayPage />);const cells=await screen.findAllByRole('gridcell');
  expect(cells.filter(c=>c.tabIndex===0)).toHaveLength(1);
  cells[0].focus();fireEvent.keyDown(cells[0],{key:'ArrowRight'});
  expect(document.activeElement).toBe(cells[1]);
  fireEvent.click(cells[8]);cells[8].focus();fireEvent.keyDown(cells[8],{key:'ArrowRight'});
  expect(document.activeElement).toBe(cells[8]);
  expect(screen.getAllByRole('row')).toHaveLength(9);
});
it('an old wrong-digit timeout cannot modify a replacement saved game', async () => {
  render(<PlayPage />); const cells = await screen.findAllByRole('gridcell');
  const g = loadGame(); if (!g) throw new Error('fixture');
  const i = g.values.findIndex(v => !v); fireEvent.click(cells[i]);
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: String(g.solution[i] % 9 + 1) }));
  const replacement = newGame('easy', 322, 'replacement'); startNewGame(replacement);
  act(() => { vi.advanceTimersByTime(2000); });
  expect(loadGame()?.id).toBe('replacement'); expect(loadGame()?.values).toEqual(replacement.values);
});