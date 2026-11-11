import { expect, it } from 'vitest';
import { readEventPages } from './event-pages';
it('retains the ID ceiling and continues past 10000 despite deletion of earlier rows', async () => {
  let cursor=0;const seen: number[]=[];const ceilings:number[]=[];
  const db={from:()=>({select(){return this;},gte(){return this;},in(){return this;},order(){return this;},limit(){return this;},
    gt(_k:string,v:number){cursor=v;seen.push(v);return this;},lte(_k:string,v:number){ceilings.push(v);return this;},
    maybeSingle:async()=>({data:{id:11001},error:null}),
    then(resolve:(x:unknown)=>unknown){return Promise.resolve({data:Array.from({length:Math.min(1000,11001-cursor)},(_,n)=>({id:cursor+n+1})),error:null}).then(resolve);}
  })};
  const rows=await readEventPages(db as never,'2020-01-01');
  expect(rows).toHaveLength(11001);expect(seen.at(-1)).toBe(11000);expect(new Set(ceilings)).toEqual(new Set([11001]));
});
it('deleting already-read rows cannot shift the following keyset page', async () => {
  let ids=Array.from({length:1005},(_,i)=>i+1),after=0;
  const db={from:()=>({select(){return this;},gte(){return this;},in(){return this;},order(){return this;},limit(){return this;},lte(){return this;},
    gt(_k:string,v:number){after=v;return this;},maybeSingle:async()=>({data:{id:1005},error:null}),
    then(resolve:(x:unknown)=>unknown){const data=ids.filter(id=>id>after).slice(0,1000).map(id=>({id}));if(after===0)ids=ids.filter(id=>id>500);return Promise.resolve({data,error:null}).then(resolve);}
  })};
  const rows=await readEventPages(db as never,'2020-01-01');
  expect(rows.map(r=>r.id)).toEqual(Array.from({length:1005},(_,i)=>i+1));
});