import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ deleteUser: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { auth: { admin: { deleteUser: mocks.deleteUser } }, from: mocks.from } }));
import { deletePlayerDataAction } from './online-actions';
beforeEach(() => { vi.clearAllMocks(); });
it('never separately erases events when identity deletion fails; the same identity can retry', async () => {
  const context = { userId: 'own-user', supabase: {} as never };
  mocks.deleteUser.mockResolvedValueOnce({ error: new Error('failed') }).mockResolvedValueOnce({ error: null });
  await expect(deletePlayerDataAction({ context })).rejects.toThrow('err:delete_failed');
  expect(mocks.from).not.toHaveBeenCalled();
  await expect(deletePlayerDataAction({ context })).resolves.toEqual({ ok: true });
  expect(mocks.deleteUser.mock.calls).toEqual([['own-user'], ['own-user']]);
});