import { expect,it } from 'vitest';
import { adminDayMetrics } from './admin-day-metrics';
it('counts distinct app devices, first games and exact previous-day players, never web sessions',()=>{
 const e=(id:string,day:string,platform='ios',kind='local_game')=>({device_id:id,user_id:id,platform,kind,detail:{},created_at:day+'T12:00:00Z'});
 const m=adminDayMetrics([e('a','2026-11-09'),e('a','2026-11-10'),e('a','2026-11-10'),e('b','2026-11-10','android'),e('w','2026-11-10','web')],['2026-11-09','2026-11-10']);
 expect(m.get('2026-11-10')).toEqual({ios:1,android:1,played:2,newPlayers:1,returningPlayed:1});
});