// Real React components with isolated, persisted fixture APIs; never touches an app DB.
import { build } from "esbuild";
import puppeteer from "puppeteer";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";

const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import React from "react";
    import {createRoot} from "react-dom/client";
    import {QueryClient,QueryClientProvider,useQuery} from "@tanstack/react-query";
    import {TapListManager} from "./client/src/components/taplist-manager";
    import Taps from "./client/src/components/pub/TaplistSection";
    import Legacy from "./client/src/components/tap-list";
    import Checkin from "./client/src/components/checkin-modal";
    const beer=id=>({id,name:"Birra "+id,style:"IPA",abv:"6",description:"Prima riga\\nSeconda riga",brewery:{id:9,name:"Birrificio prova"}});
    const initial=[["spina",1],["pompa",2],["botte",3],[null,4],["pompa",5],["botte",6]].map(([tapType,id])=>({
      id,beer:beer(id),beerId:id,tapType,tapNumber:id,isVisible:id===4?null:id!==5,isActive:id!==6,prices:[{size:"33 cl",price:"5.00"}]
    }));
    const stored=sessionStorage.getItem("tap-fixture");
    window.stock=stored?JSON.parse(stored):initial;
    window.requests=[];window.lastCheckin=null;window.favorites=[];window.failNext=false;
    window.fetch=async(url,options={})=>{
      const path=String(url),method=options.method||"GET",body=options.body?JSON.parse(options.body):null;
      window.requests.push({url:path,method,body});
      const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}});
      if(method!=="GET"&&window.failNext){window.failNext=false;return response({message:"Test failure"},500)}
      const match=path.match(/\\/taplist(?:\\/(\\d+))?(\\/prices|\\/reorder)?$/);
      if(match){
        const id=Number(match[1]);
        if(method==="GET")return response(window.stock);
        if(path.endsWith("/reorder")){window.stock=body.order.map(i=>({...window.stock.find(t=>t.id===i.id),tapNumber:i.tapNumber}))}
        else if(method==="POST"&&!id){
          const item={...body,id:100,beer:beer(body.beerId),isActive:true,prices:[]};
          window.stock.push(item);sessionStorage.setItem("tap-fixture",JSON.stringify(window.stock));return response(item,201);
        }else if(method==="PATCH"){
          window.stock=window.stock.map(t=>t.id===id?{...t,...body,...(body.beerId?{beer:beer(body.beerId)}:{})}:t);
        }else if(method==="DELETE"){window.stock=window.stock.filter(t=>t.id!==id)}
        sessionStorage.setItem("tap-fixture",JSON.stringify(window.stock));
        return response(window.stock.find(t=>t.id===id)||{ok:true});
      }
      if(path.includes("/api/search"))return response({beers:[beer(99)]});
      if(path.endsWith("/next-tap"))return response([{id:77,beer_id:99,beer_name:"Prossima birra",brewery_name:"Birrificio prova"}]);
      if(path.includes("/api/beers/"))return response(beer(Number(path.split("/").pop())));
      return response([]);
    };
    const client=new QueryClient({defaultOptions:{queries:{retry:false,queryFn:async({queryKey})=>(await fetch(queryKey.join("/"))).json()},mutations:{retry:false}}});
    function App(){
      const {data=[]}=useQuery({queryKey:["/api/pubs","999","taplist"]});
      const [mode,setMode]=React.useState(new URL(location.href).searchParams.get("mode")||"public");
      const [target,setTarget]=React.useState(null);
      const only=new URL(location.href).searchParams.get("only");
      const rows=only?data.filter(t=>t.tapType===only):data;
      return <main className="mx-auto max-w-2xl p-3"><nav><button onClick={()=>setMode("public")}>Pubblico</button><button onClick={()=>setMode("manager")}>Gestione</button></nav>
        {mode==="manager"?<TapListManager pubId={999} tapList={rows} bottleList={[{id:88,beer:beer(2),isVisible:true}]}/>:
          mode==="legacy"?<Legacy tapList={rows} pub={{id:999,name:"Pub prova"}}/>:
          <Taps taps={rows} onCheckin={t=>{window.lastCheckin=t;setTarget(t)}} currentUserCanCheckin onToggleFavorite={id=>window.favorites.push(id)}/>}
        {target&&<Checkin open onClose={()=>setTarget(null)} beer={target.beer} tapType={target.tapType} pub={{id:999,name:"Pub prova"}}/>}
      </main>;
    }
    createRoot(document.getElementById("root")).render(<QueryClientProvider client={client}><App/></QueryClientProvider>);
  ` },
  bundle: true, write: false, jsx: "automatic", format: "iife",
  define: { "process.env.NODE_ENV": '"production"', "import.meta.env": "{}" },
  plugins: [{ name: "fixture-auth-only", setup(build) {
    build.onResolve({filter:/^@\/hooks\/useAuth$/},()=>({path:"fixture-auth",namespace:"fixture"}));
    build.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:'export const useAuth=()=>({user:{id:"fixture"},isAuthenticated:true,isLoading:false});'}));
  }}],
});
const assets = await readdir("dist/public/assets");
const css = (await Promise.all(assets.filter(f=>f.endsWith(".css")).map(f=>readFile(`dist/public/assets/${f}`,"utf8")))).join("\n");
const browser = await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||execFileSync("which",["chromium"],{encoding:"utf8"}).trim(),args:["--no-sandbox"]});
try {
  const page=await browser.newPage(), errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.setRequestInterception(true);
  page.on("request",r=>r.isNavigationRequest()?r.respond({status:200,contentType:"text/html",body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#FAF7F1"><div id="root"></div></body></html>'}):r.abort());
  const pause=()=>new Promise(r=>setTimeout(r,300));
  async function load(width=390,query="mode=public",reset=true) {
    await page.setViewport({width,height:844,isMobile:width<768,hasTouch:true});
    await page.goto(`http://tap-types.test/?${query}`);
    if(reset)await page.evaluate(()=>sessionStorage.clear());
    await page.addStyleTag({content:css});
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.waitForSelector(query.includes("manager")?'[data-testid="tap-manager-item-1"]':query.includes("legacy")?'a[href="/beer/1"]':'[data-testid="taplist-section"]');
    await pause();
  }
  async function clickText(text, scope="") {
    const selector=await page.evaluate(({text,scope})=>{
      const buttons=[...document.querySelectorAll(scope?scope+" button":"button")];
      const button=buttons.find(b=>b.textContent.trim()===text);
      if(!button)throw new Error("Missing button: "+text);
      button.dataset.fixtureClick="yes";return '[data-fixture-click="yes"]';
    },{text,scope});
    await page.$eval(selector,b=>b.scrollIntoView({block:"center"}));await page.click(selector);
    await page.evaluate(()=>document.querySelector('[data-fixture-click="yes"]')?.removeAttribute("data-fixture-click"));
    await pause();
  }
  const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"viewport overflow");
  const labels={spina:"Alla spina",pompa:"Hand pump",botte:"Alla botte"};
  const prices={spina:"Prezzi alla spina",pompa:"Prezzi in hand pump",botte:"Prezzi alla botte"};
  for(const width of [320,390,1280]){
    await load(width);
    await noOverflow();
    assert.equal(await page.$$eval('[data-testid="taplist-section"] h3',nodes=>nodes.map(n=>n.textContent).join("|")),"Alla spina|Hand pump|Alla botte");
    assert.equal(await page.$$eval('[data-testid^="taplist-tap-"]',nodes=>nodes.length),4);
    for(const [type,id] of [["spina",1],["pompa",2],["botte",3]]){
      assert.ok((await page.$eval(`[data-testid="taplist-tap-${id}"]`,n=>n.textContent)).includes(labels[type]));
      await page.$eval(`[data-testid="beer-detail-trigger-${id}"]`,n=>n.scrollIntoView({block:"center"}));
      await page.click(`[data-testid="beer-detail-trigger-${id}"]`);
      await page.waitForSelector('[data-testid="beer-detail-dialog"]');
      assert.ok(await page.$(`[role="dialog"] section[aria-label="${prices[type]}"]`));
      const text=await page.$eval('[data-testid="beer-detail-dialog"]',n=>n.textContent);
      if(type!=="spina")assert.ok(!text.includes("alla spina"));
      await noOverflow();
      await page.click('[aria-label="Chiudi finestra di dialogo"]');await pause();
    }
    console.log(`PASS ${width}px: visible types, sections, popup prices and no overflow`);
  }
  for(const type of Object.keys(labels)){
    await load(320,`mode=public&only=${type}`);
    assert.deepEqual(await page.$$eval('[data-testid="taplist-section"] h3',nodes=>nodes.map(n=>n.textContent)),[labels[type]]);
  }
  await load(390,"mode=legacy");
  for(const label of Object.values(labels))assert.ok((await page.$eval("main",n=>n.textContent)).includes(label));
  console.log("PASS single-type headings, legacy list, hidden/inactive filtering");

  for(const type of Object.keys(labels)){
    await load(320,"mode=manager");
    await clickText("Aggiungi Birra");
    await page.type('input[placeholder="Cerca per nome o birrificio..."]',"nuova");
    await page.waitForFunction(()=>[...document.querySelectorAll('[role="dialog"] .cursor-pointer')].some(b=>b.textContent.includes("Birra 99")));
    await page.evaluate(()=>[...document.querySelectorAll('[role="dialog"] .cursor-pointer')].find(b=>b.textContent.includes("Birra 99")).click());
    await clickText(labels[type],'[role="group"][aria-label="Tipo di erogazione"]');
    assert.equal(await page.$eval(`[role="group"] button[aria-pressed="true"]`,n=>n.textContent.trim()),labels[type]);
    await noOverflow();
    await clickText("Aggiungi alla taplist",'[role="dialog"]');
    await page.waitForSelector('[data-testid="tap-manager-item-100"]');
    assert.equal(await page.evaluate(()=>window.stock.find(t=>t.id===100).tapType),type);
    await load(390,"mode=manager",false);
    assert.equal(await page.evaluate(()=>window.stock.find(t=>t.id===100).tapType),type);
  }
  console.log("PASS creating and reloading all three types, selected buttons and mobile editor");

  await load(390,"mode=manager");
  await page.click('[aria-label="Modifica Birra 2"]');
  await page.waitForSelector('[role="group"] button[aria-pressed="true"]');
  assert.equal(await page.$eval('[role="group"] button[aria-pressed="true"]',n=>n.textContent.trim()),"Hand pump");
  await clickText("Alla botte",'[role="group"]');
  await clickText("Salva modifiche",'[data-testid="taplist-beer-dialog"]');
  await page.waitForFunction(()=>window.stock.find(t=>t.id===2).tapType==="botte");
  await page.waitForFunction(()=>!document.querySelector('[data-testid="taplist-beer-dialog"]'));
  await page.click('[aria-label="Nascondi Birra 2 dalla tap list"]');
  await page.waitForFunction(()=>window.stock.find(t=>t.id===2).isVisible===false);
  assert.ok(await page.evaluate(()=>!window.requests.some(r=>r.url.includes("/bottles/"))));
  await page.click('[aria-label="Rimuovi Birra 2 dalla tap list"]');
  await page.waitForSelector('[role="dialog"]');
  await clickText("Rimuovi senza sostituire",'[role="dialog"]');
  await page.waitForFunction(()=>!window.stock.some(t=>t.id===2));
  assert.ok(await page.evaluate(()=>!window.requests.some(r=>r.url.includes("/bottles/"))));
  console.log("PASS edit type, visibility and removal leave matching cantina untouched");

  await load(390,"mode=manager");
  await page.click('[aria-label="Rimuovi Birra 3 dalla tap list"]');
  await page.waitForSelector('[role="dialog"]');
  await page.evaluate(()=>window.failNext=true);
  await page.evaluate(()=>[...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent.includes("Prossima birra")).click());
  await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
  await pause();
  assert.equal(await page.evaluate(()=>window.stock.find(t=>t.id===3).beerId),3);
  assert.ok(await page.evaluate(()=>!window.requests.some(r=>r.method==="DELETE")));
  await page.click('[aria-label="Rimuovi Birra 3 dalla tap list"]');
  await page.waitForSelector('[role="dialog"]');
  await page.evaluate(()=>[...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent.includes("Prossima birra")).click());
  await page.waitForFunction(()=>window.stock.find(t=>t.id===3).beerId===99);
  const replaced=await page.evaluate(()=>window.stock.find(t=>t.id===3));
  assert.equal(replaced.tapType,"botte");assert.equal(replaced.tapNumber,3);
  assert.deepEqual(replaced.prices,[{size:"33 cl",price:"5.00"}]);
  console.log("PASS queued replacement preserves type, prices and position; failed save keeps original beer");

  await load(390,"mode=manager");
  await page.evaluate(()=>{
    const from=document.querySelector('[aria-label="Riordina Birra 1"]'), to=document.querySelector('[data-touch-sort-idx="2"]');
    const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
    const start=new Touch({identifier:1,target:from,clientX:a.x+a.width/2,clientY:a.y+a.height/2});
    const end=new Touch({identifier:1,target:from,clientX:b.x+b.width/2,clientY:b.y+20});
    from.dispatchEvent(new TouchEvent("touchstart",{bubbles:true,cancelable:true,touches:[start],changedTouches:[start]}));
    document.dispatchEvent(new TouchEvent("touchmove",{bubbles:true,cancelable:true,touches:[end],changedTouches:[end]}));
    document.dispatchEvent(new TouchEvent("touchend",{bubbles:true,cancelable:true,touches:[],changedTouches:[end]}));
  });
  await page.waitForFunction(()=>window.requests.some(r=>r.url.endsWith("/reorder")));
  const order=await page.evaluate(()=>window.stock.map(t=>[t.id,t.tapNumber,t.tapType]));
  assert.deepEqual(order.slice(0,3),[[2,1,"pompa"],[3,2,"botte"],[1,3,"spina"]]);
  assert.deepEqual(order.map(t=>t[1]),[1,2,3,4,5,6]);
  await load(390,"mode=manager",false);
  assert.deepEqual(await page.evaluate(()=>window.stock.map(t=>[t.id,t.tapNumber,t.tapType])),order);
  console.log("PASS mixed-service mobile drag: consecutive 1–X and same types after reload");

  await load();
  await page.click('[data-testid="taplist-tap-2"] button[aria-label="Aggiungi ai preferiti"]');
  assert.deepEqual(await page.evaluate(()=>window.favorites),[2]);
  await page.click('[data-testid="taplist-tap-2"] button[aria-label="Check-in"]');
  await page.waitForSelector('[role="dialog"]');
  assert.equal(await page.evaluate(()=>window.lastCheckin.tapType),"pompa");
  assert.ok(await page.$$eval('[role="dialog"] button',nodes=>nodes.some(n=>n.textContent.trim().includes("Hand pump")&&n.className.includes("bg-primary text-white"))));
  assert.deepEqual(errors,[]);
  console.log("PASS favorites and check-in retain the real service type; no browser errors");
} finally { await browser.close(); }
