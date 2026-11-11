import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
const url = process.env['LUDO_TEST_DATABASE_URL'] ?? '';
if (!/@localhost:\d+\/ludo_test\?host=\/tmp\/ludo-testdb\./.test(url)) throw new Error('Requires isolated test database');
const u = new URL(url);
const sql = postgres({ host: u.searchParams.get('host') ?? '', port: Number(u.port), database: 'ludo_test', username: 'ludo_test', max: 20 });
afterAll(() => sql.end());
const user = async () => { const id = randomUUID(); await sql`insert into auth.users(id) values(${id})`; return id; };

it('N9: 120 simultaneous finishes with mixed client dates store exactly 100 and reject the rest', async () => {
  const id = await user();
  const results = await Promise.allSettled(Array.from({ length: 120 }, (_, i) =>
    sql`select insert_sudoku_game_report(${id}::uuid,'phone','ios',${sql.json({ gid: `c${i}`, phase: 'finish', level: 'easy' })},${i % 2 ? '2020-01-01T00:00:00Z' : new Date().toISOString()}::timestamptz)`));
  expect(results.filter(r => r.status === 'rejected')).toHaveLength(20);
  const [n] = await sql`select count(*)::int as n from app_events where user_id=${id}`;
  expect(n['n']).toBe(100);
});

const asUser = (id: string, q: (tx: postgres.TransactionSql) => Promise<unknown>) => sql.begin(async tx => {
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: id, role: 'authenticated' })}, true)`;
  await tx`set local role authenticated`;
  return q(tx);
});

it('N10: players cannot change created_at or forge last_seen', async () => {
  const id = await user();
  const [before] = await sql`select created_at from profiles where id=${id}`;
  await expect(asUser(id, tx => tx`update profiles set created_at='2000-01-01' where id=${id}`)).rejects.toThrow();
  await asUser(id, tx => tx`update profiles set last_seen='2000-01-01' where id=${id}`);
  const [after] = await sql`select created_at, last_seen from profiles where id=${id}`;
  expect(after['created_at']).toEqual(before['created_at']);
  expect(new Date(after['last_seen']).getFullYear()).toBeGreaterThan(2020);
});

it('N10: oversized or malformed profile fields are rejected, valid edits still work', async () => {
  const id = await user();
  await expect(asUser(id, tx => tx`update profiles set country='sweden' where id=${id}`)).rejects.toThrow();
  await expect(asUser(id, tx => tx`update profiles set display_name=${'x'.repeat(21)} where id=${id}`)).rejects.toThrow();
  await expect(asUser(id, tx => tx`update profiles set avatar_image=${'data:image/png;base64,' + 'A'.repeat(120001)} where id=${id}`)).rejects.toThrow();
  await expect(asUser(id, tx => tx`update profiles set avatar_image='javascript:alert(1)' where id=${id}`)).rejects.toThrow();
  await asUser(id, tx => tx`update profiles set display_name='Simon', country='NO', avatar_image='data:image/png;base64,AAAA' where id=${id}`);
  const [p] = await sql`select display_name, country from profiles where id=${id}`;
  expect(p).toMatchObject({ display_name: 'Simon', country: 'NO' });
});
