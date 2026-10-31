import { chromium } from 'playwright';
const base='http://localhost:4173/toronto-crime-analytics';
const routes={home:'/',explore:'/explore',explain:'/explain',predict:'/predict',paper:'/paper',methods:'/methods',about:'/about'};
const sizes=[[375,812],[768,1024],[1280,800]];
const b=await chromium.launch();
const out=[];
for(const scheme of ['light','dark']){
 for(const [w,h] of sizes){
  const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:scheme});
  for(const [n,p] of Object.entries(routes)){
   const pg=await ctx.newPage();
   const errs=[];pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});pg.on('pageerror',e=>errs.push(String(e)));
   await pg.goto(base+p,{waitUntil:'networkidle'});
   await pg.waitForTimeout(2500);
   const f=`reviews/shots/${n}-${w}-${scheme}`;
   await pg.screenshot({path:f+'-fold.png'});
   await pg.screenshot({path:f+'-full.png',fullPage:true});
   const m=await pg.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,h:document.documentElement.scrollHeight,h1:[...document.querySelectorAll('h1')].map(e=>e.textContent),small:[...document.querySelectorAll('a,button,input,select,[role=tab]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.height<24||r.width<24)}).length}));
   out.push({n,w,scheme,...m,errs});
   await pg.close();
  }
  await ctx.close();
 }
}
console.log(JSON.stringify(out));
await b.close();
