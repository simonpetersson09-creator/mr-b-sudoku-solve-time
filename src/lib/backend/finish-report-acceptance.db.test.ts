import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
const url = process.env['LUDO_TEST_DATABASE_URL'] ?? '';
if (!/@localhost:\d+\/ludo_test\?host=\/tmp\/ludo-testdb\./.test(url)) throw new Error('Requires isolated test database');
const u = new URL(url);
const sql = postgres({ host: u.searchParams.get('host') ?? '', port: Number(u.port), database: 'ludo_test', username: 'ludo_test', max: 10 });
afterAll(() => sql.end());
const report = (id: string, gid: string, phase: string, at = new Date().toISOString()) =>
  sql`select insert_sudoku_game_report(${id}::uuid,'phone','ios',${sql.json({ gid, phase, level: 'easy' })},${at}::timestamptz) as ok`;

it('a resumed game finished without any stored start is still recorded', async () => {
  const id = randomUUID(); await sql`insert into auth.users(id) values(${id})`;
  const [r] = await report(id, 'resumed', 'finish');
  expect(r['ok']).toBe(true);
  const [n] = await sql`select count(*)::int as n from app_events where user_id=${id} and detail->>'phase'='finish'`;
  expect(n['n']).toBe(1);
});

it('a finish only seconds after its start is still recorded', async () => {
  const id = randomUUID(); await sql`insert into auth.users(id) values(${id})`;
  await report(id, 'fast', 'start', '2026-11-01T10:00:00Z');
  const [r] = await report(id, 'fast', 'finish', '2026-11-01T10:00:05Z');
  expect(r['ok']).toBe(true);
});

it('the 101st finish in a day raises (stays queued) instead of being silently dropped, even with old dates', async () => {
  const id = randomUUID(); await sql`insert into auth.users(id) values(${id})`;
  for (let i = 0; i < 100; i++) await report(id, `g${i}`, 'finish', '2020-06-01T00:00:00Z');
  await expect(report(id, 'g100', 'finish', '2021-01-01T00:00:00Z')).rejects.toThrow(/daily finish limit/);
  const [n] = await sql`select count(*)::int as n from app_events where user_id=${id}`;
  expect(n['n']).toBe(100);
});

it('has_role only answers for the caller and rejects anonymous callers', async () => {
  const id = randomUUID(); await sql`insert into auth.users(id) values(${id})`;
  await sql`insert into user_roles(user_id, role) values(${id}, 'admin')`;
  const other = randomUUID();
  const asUser = async (sub: string) => sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub, role: 'authenticated' })}, true)`;
    await tx`set local role authenticated`;
    const [r] = await tx`select has_role(${id}::uuid, 'admin') as ok`; return r['ok'];
  });
  expect(await asUser(id)).toBe(true);
  expect(await asUser(other)).toBe(false);
  await expect(sql.begin(async (tx) => { await tx`set local role anon`; await tx`select has_role(${id}::uuid, 'admin')`; })).rejects.toThrow();
});
