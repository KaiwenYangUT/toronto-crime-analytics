import { createRequire } from 'module'; const require=createRequire(process.cwd()+'/package.json'); const { chromium } = require('playwright');
const base='http://localhost:4173/toronto-crime-analytics';
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:375,height:812}});
for(const p of ['/','/explore','/predict','/paper']){
 const pg=await ctx.newPage(); await pg.goto(base+p,{waitUntil:'load'}); await pg.waitForTimeout(2000);
 if(p==='/') await pg.getByRole('button',{name:'Menu'}).click();
 console.log(p, JSON.stringify(await pg.evaluate(()=>[...document.querySelectorAll('a,button,input,select,[role=tab],[role=radio],[role=checkbox]')].map(e=>{const r=e.getBoundingClientRect();return {t:e.tagName,txt:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,22),w:Math.round(r.width),h:Math.round(r.height)}}).filter(x=>x.w>0&&(x.h<44||x.w<44)&&!/^(A)$/.test(x.t)||0).slice(0,25))));
 await pg.close();
}
const pg=await ctx.newPage(); await pg.goto(base+'/methods',{waitUntil:'load'}); await pg.waitForTimeout(1500);
console.log('methods tocActive', await pg.evaluate(()=>[...document.querySelectorAll('nav a')].map(a=>a.textContent+':'+(a.getAttribute('aria-current')||'')).join('|')));
const d=await b.newContext({viewport:{width:1280,height:800}}); const q=await d.newPage(); await q.goto(base+'/methods',{waitUntil:'load'}); await q.waitForTimeout(1500);
console.log('m1280 toc', await q.evaluate(()=>[...document.querySelectorAll('nav a')].map(a=>a.textContent+':'+(a.getAttribute('aria-current')||'')+':'+getComputedStyle(a).fontWeight).join('|')));
console.log('prose', await q.evaluate(()=>{const p=document.querySelector('main p');const r=p.getBoundingClientRect();return [r.width, getComputedStyle(p).maxWidth, getComputedStyle(p).fontSize]}));
await b.close();
