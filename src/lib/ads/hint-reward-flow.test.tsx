import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { newGame } from '@/lib/sudoku/engine';
import { loadGame, removeGame, startNewGame } from '@/lib/player/storage';
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
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
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