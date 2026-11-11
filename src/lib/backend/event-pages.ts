import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
type Row = Database['public']['Tables']['app_events']['Row'];
/** ID keyset + captured ID ceiling: deletes cannot shift offsets; new arrivals wait for refresh. */
export async function readEventPages(db: SupabaseClient<Database>, since: string, kinds?: string[]): Promise<Row[]> {
  const ceiling = await db.from('app_events').select('id').order('id', { ascending: false }).limit(1).maybeSingle();
  if (ceiling.error) throw new Error('err:bad_action');
  if (!ceiling.data) return [];
  const rows: Row[] = [];let after = 0;
  while (true) {
    let q = db.from('app_events').select('*').gte('created_at', since).gt('id', after).lte('id', ceiling.data.id).order('id').limit(1000);
    if (kinds) q = q.in('kind', kinds);
    const { data, error } = await q;
    if (error) throw new Error('err:bad_action');
    if (!data?.length) break;
    rows.push(...data);const last = data.at(-1);
    if (!last || last.id <= after) throw new Error('err:bad_action');
    after = last.id;
    if (data.length < 1000) break;
  }
  return rows;
}