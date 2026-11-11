import { afterAll,expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
const url=process.env['LUDO_TEST_DATABASE_URL']??'';
if(!/@localhost:\d+\/ludo_test\?host=\/tmp\/ludo-testdb\./.test(url))throw new Error('Requires isolated test database');
const u=new URL(url);const sql=postgres({host:u.searchParams.get('host')??'',port:Number(u.port),database:'ludo_test',username:'ludo_test',max:10});
afterAll(()=>sql.end());
it('ten concurrent reports store exactly one original-date finish per caller/game/phase',async()=>{
 const id=randomUUID();await sql`insert into auth.users(id) values(${id})`;
 const detail={gid:'same',phase:'finish',level:'easy'};
 await Promise.all(Array.from({length:10},()=>sql`select insert_sudoku_game_report(${id}::uuid,'phone','ios',${sql.json(detail)},'2026-10-31T12:00:00Z'::timestamptz)`));
 const [row]=await sql`select count(*)::int as n,min(created_at) as at from app_events where user_id=${id}`;
 expect(row['n']).toBe(1);expect(new Date(row['at']).toISOString()).toBe('2026-10-31T12:00:00.000Z');
});