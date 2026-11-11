import { stockholmDate, type ActivityEvent } from './activity-stats';
type Event = ActivityEvent & { user_id?: string | null };
/** Only metrics supported by stored app reports; installation age/version issue coverage remain unknown. */
export function adminDayMetrics(events: Event[], days: string[]) {
  const active=new Map<string,Map<string,string>>(),played=new Map<string,Set<string>>(),first=new Map<string,string>();
  for(const e of events){
    if(e.platform!=='ios'&&e.platform!=='android')continue;
    const id=e.device_id;if(!id||id==='unknown')continue;
    const day=stockholmDate(e.created_at);
    const a=active.get(day)??new Map<string,string>();a.set(id,e.platform);active.set(day,a);
    if(e.kind!=='local_game')continue;
    const p=played.get(day)??new Set<string>();p.add(id);played.set(day,p);
    const user=e.user_id??id;if(!first.has(user)||day<(first.get(user)??day))first.set(user,day);
  }
  return new Map(days.map(day=>{
    const a=active.get(day)??new Map(),p=played.get(day)??new Set<string>();
    const yesterday=new Date(Date.parse(day+'T12:00:00Z')-86400000).toISOString().slice(0,10);
    return [day,{ios:[...a.values()].filter(v=>v==='ios').length,android:[...a.values()].filter(v=>v==='android').length,
      played:p.size,newPlayers:[...first.values()].filter(d=>d===day).length,returningPlayed:[...p].filter(id=>played.get(yesterday)?.has(id)).length}];
  }));
}