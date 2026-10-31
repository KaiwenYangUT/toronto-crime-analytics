import { createRequire } from 'module'; const require=createRequire(process.cwd()+'/package.json'); const { chromium } = require('playwright');
const base='http://localhost:4173/toronto-crime-analytics';
const O='/Users/kevinyang/Downloads/toronto-crime-analytics/reviews/shots/';
const b=await chromium.launch();
const log=(...a)=>console.log(...a);
// Explore interactions desktop
{
 const ctx=await b.newContext({viewport:{width:1280,height:800}}); const pg=await ctx.newPage();
 await pg.goto(base+'/explore',{waitUntil:'load'}); await pg.waitForTimeout(2500);
 // filter panel scroll metrics
 log('panel', await pg.evaluate(()=>{const el=[...document.querySelectorAll('*')].find(e=>/^Filters$/.test(e.textContent.trim())&&e.tagName.match(/H2|H3/)); let p=el; while(p&&p.scrollHeight<=p.clientHeight+2)p=p.parentElement; return p?{tag:p.tagName,cls:p.className,sh:p.scrollHeight,ch:p.clientHeight,pos:getComputedStyle(p).position,ov:getComputedStyle(p).overflowY}:null}));
 await pg.getByRole('checkbox',{name:'Auto theft'}).click(); await pg.waitForTimeout(1500);
 await pg.screenshot({path:O+'explore-interact-autotheft-1280.png'});
 log('counts', await pg.evaluate(()=>document.querySelector('[aria-live]')?.textContent));
 await pg.getByRole('radio',{name:'Near a destination'}).click(); await pg.waitForTimeout(1500);
 await pg.screenshot({path:O+'explore-interact-near-1280.png'});
 await pg.screenshot({path:O+'explore-interact-near-1280-full.png',fullPage:true});
 await ctx.close();
}
// Explore mobile: Filters sheet
{
 const ctx=await b.newContext({viewport:{width:375,height:812},hasTouch:true}); const pg=await ctx.newPage();
 await pg.goto(base+'/explore',{waitUntil:'load'}); await pg.waitForTimeout(2500);
 await pg.getByRole('button',{name:'Filters'}).click(); await pg.waitForTimeout(800);
 await pg.screenshot({path:O+'explore-filters-sheet-375.png'});
 await ctx.close();
}
// Mobile menu
for (const scheme of ['light','dark']){
 const ctx=await b.newContext({viewport:{width:375,height:812},colorScheme:scheme}); const pg=await ctx.newPage();
 await pg.goto(base+'/',{waitUntil:'load'}); await pg.waitForTimeout(1500);
 await pg.getByRole('button',{name:'Menu'}).click(); await pg.waitForTimeout(600);
 await pg.screenshot({path:O+`menu-open-375-${scheme}.png`});
 await ctx.close();
}
// Keyboard
{
 const ctx=await b.newContext({viewport:{width:1280,height:800}}); const pg=await ctx.newPage();
 await pg.goto(base+'/',{waitUntil:'load'}); await pg.waitForTimeout(1500);
 const seq=[];
 for(let i=0;i<16;i++){ await pg.keyboard.press('Tab'); const d=await pg.evaluate(()=>{const e=document.activeElement;const cs=getComputedStyle(e);const r=e.getBoundingClientRect();return {t:e.tagName,txt:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,30),outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor,shadow:cs.boxShadow.slice(0,60),w:Math.round(r.width),h:Math.round(r.height)}}); seq.push(d); if(i===0||i===1||i===8||i===9) await pg.screenshot({path:O+`kbd-home-tab${i+1}.png`,clip:{x:0,y:0,width:1280,height:120}}); }
 log('kbd',JSON.stringify(seq,null,0));
 // theme toggle via keyboard
 await ctx.close();
}
// Explore keyboard
{
 const ctx=await b.newContext({viewport:{width:1280,height:800}}); const pg=await ctx.newPage();
 await pg.goto(base+'/explore',{waitUntil:'load'}); await pg.waitForTimeout(2000);
 for(let i=0;i<14;i++) await pg.keyboard.press('Tab');
 await pg.screenshot({path:O+'kbd-explore-tab14.png'});
 const d=await pg.evaluate(()=>{const e=document.activeElement;const cs=getComputedStyle(e);return {t:e.tagName,txt:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,30),outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor}});
 log('explore focus',JSON.stringify(d));
 await ctx.close();
}
// reduced motion + a11y alt table check
{
 const ctx=await b.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'}); const pg=await ctx.newPage();
 await pg.goto(base+'/predict',{waitUntil:'load'}); await pg.waitForTimeout(2500);
 log('anim', await pg.evaluate(()=>{const els=[...document.querySelectorAll('*')];return els.filter(e=>{const c=getComputedStyle(e);return (parseFloat(c.transitionDuration)>0.01)||(c.animationName!=='none'&&parseFloat(c.animationDuration)>0.01)}).length}));
 await ctx.close();
}
// figures vs table buttons per route
{
 const ctx=await b.newContext({viewport:{width:1280,height:800}}); 
 for(const p of ['/','/explore','/explain','/predict','/paper','/methods','/about']){
  const pg=await ctx.newPage(); await pg.goto(base+p,{waitUntil:'load'}); await pg.waitForTimeout(2500);
  log(p, await pg.evaluate(()=>({figs:document.querySelectorAll('figure').length,svgs:document.querySelectorAll('svg[role=img], .vega-embed, canvas').length,tbl:[...document.querySelectorAll('button')].filter(b=>/data table/i.test(b.textContent)).length,csv:[...document.querySelectorAll('button,a')].filter(b=>/CSV/i.test(b.textContent)).length,imgNoAlt:[...document.querySelectorAll('img')].filter(i=>!i.alt).length,fs:getComputedStyle(document.body).fontSize,p:[...document.querySelectorAll('main p')].slice(0,40).map(e=>e.getBoundingClientRect().width).reduce((a,b)=>Math.max(a,b),0)})));
  await pg.close();
 }
 await ctx.close();
}
await b.close();
