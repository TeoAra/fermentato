import { build } from "esbuild";
import puppeteer from "puppeteer";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

// Isolated real-component harness: no auth bypass, no live API or database writes.
const bundle = await build({
  stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
    import React, {useState} from "react";
    import {createRoot} from "react-dom/client";
    import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
    import PubHero from "./client/src/components/pub/PubHero";
    import Overview from "./client/src/components/pub/OverviewSection";
    import Tabs from "./client/src/components/pub/StickyPubTabs";
    import BreweryHero from "./client/src/components/brewery/BreweryHero";
    const client = new QueryClient({defaultOptions:{queries:{queryFn:async()=>[],retry:false}}});
    const pub={id:77,name:"Un locale dal nome molto lungo per verificare il mobile",coverImageUrl:"/wide.svg",logoUrl:"/logo.svg",
      address:"Un indirizzo abbastanza lungo da richiedere più righe",city:"Città prova",phone:"000",
      description:"Una descrizione estesa con tutti i dettagli del locale. ".repeat(20),
      amenities:["Wi-Fi","Giardino","Cani ammessi","Cucina","Parcheggio","Accessibilità","Musica","Giochi","Tavoli esterni"],
      openingHours:{monday:{open:"18:00",close:"23:00",isClosed:false}},
      email:"test@example.test",websiteUrl:"https://example.test"};
    window.venueActions={call:0,directions:0,share:0,favorite:0,suggest:0};
    function App(){
      const [active,setActive]=useState("overview"),[favorite,setFavorite]=useState(false);
      const mode=new URL(location.href).searchParams.get("mode")??"pub";
      const cover=new URL(location.href).searchParams.get("cover")??"wide";
      const data={...pub,coverImageUrl:cover==="none"?null:cover==="broken"?"/broken.svg":cover==="portrait"?"/portrait.svg":pub.coverImageUrl};
      return <QueryClientProvider client={client}>{mode==="pub"?<>
        <PubHero pub={data} isFavorite={favorite} favoritesCount={8} openStatus={{status:"open",label:"Aperto",detail:"Fino alle 23:00"}}
          onCall={()=>window.venueActions.call++} onDirections={()=>window.venueActions.directions++}
          onShare={()=>window.venueActions.share++} onToggleFavorite={()=>{window.venueActions.favorite++;setFavorite(!favorite)}} />
        <div style={{padding:16}}><Overview pub={data} events={[]} onCall={()=>window.venueActions.call++}
          onDirections={()=>window.venueActions.directions++} onShowHours={()=>{}} /></div>
        <Tabs tabs={["overview","taplist","bottles","drinks","menu"].map((value,i)=>({value,label:["Panoramica","Taplist","Bottiglie","Bevande","Menu"][i]}))}
          activeTab={active} onTabChange={setActive}/><p id="active-tab">{active}</p>
        </>:<BreweryHero brewery={{...data,location:"Località dal nome esteso",websiteUrl:"https://example.test"}} breweryId={88}
          beersCount={24} isAdmin={false} isAuthenticated={true} isBreweryFavorited={favorite} favCount={7} favoritePending={false}
          onShare={()=>window.venueActions.share++} onToggleFavorite={()=>{window.venueActions.favorite++;setFavorite(!favorite)}}
          onOpenSuggest={()=>window.venueActions.suggest++}/>}</QueryClientProvider>
    }
    createRoot(document.getElementById("root")).render(<App/>);
  `},
  bundle: true, write: false, jsx: "automatic", format: "iife",
  define: {"process.env.NODE_ENV": '"production"', "import.meta.env": "{}"},
});
const assets = await readdir("dist/public/assets");
const css = await readFile(`dist/public/assets/${assets.find(name => name.endsWith(".css"))}`, "utf8");
const browser = await puppeteer.launch({
  headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || execFileSync("which", ["chromium"], {encoding:"utf8"}).trim(),
  args: ["--no-sandbox"],
});
try {
  const page=await browser.newPage();
  const errors=[];
  page.on("pageerror",error=>{errors.push(error.message);console.error(error.stack)});
  await page.setRequestInterception(true);
  page.on("request",request=>{
    if (request.isNavigationRequest()) return request.respond({status:200,contentType:"text/html",
      body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>'});
    if (request.url().endsWith("/broken.svg")) return request.respond({status:404,body:"Not found"});
    if (/\/(wide|portrait|logo)\.svg$/.test(request.url())) {
      const portrait=request.url().endsWith("/portrait.svg");
      return request.respond({status:200,contentType:"image/svg+xml",body:
        `<svg xmlns="http://www.w3.org/2000/svg" width="${portrait?400:1600}" height="${portrait?1000:400}"><rect width="100%" height="100%" fill="#e7be52"/><text x="10" y="50">LEFT</text><text x="70%" y="50">RIGHT</text></svg>`});
    }
    return request.respond({status:200,contentType:"application/json",body:"[]"});
  });
  async function load(width,mode="pub",cover="wide",dark=false){
    await page.setViewport({width,height:844,isMobile:width<768,hasTouch:width<768});
    await page.goto(`http://venue.test/?mode=${mode}&cover=${cover}`);
    await page.addStyleTag({content:css});
    if(dark) await page.evaluate(()=>document.documentElement.classList.add("dark"));
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.waitForSelector(`[data-testid="${mode}-hero"]`);
    await page.waitForFunction(()=>[...document.images].every(image=>image.complete));
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  async function assertNoOverflow(){
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), "page must fit the viewport");
  }
  async function click(selector){
    await page.$eval(selector,node=>node.scrollIntoView({block:"center"}));
    await page.click(selector);
    await new Promise(resolve=>setTimeout(resolve,40));
  }
  for (const width of [320,390,412,1280]){
    for(const mode of ["pub","brewery"]){
      await load(width,mode);
      await assertNoOverflow();
      const cover = await page.$eval(`[data-testid="${mode}-hero"] img`, image=>({
        fit:getComputedStyle(image).objectFit, transform:getComputedStyle(image).transform,
        natural:image.naturalWidth, width:image.getBoundingClientRect().width,
      }));
      assert.equal(cover.fit,"contain");
      assert.equal(cover.transform,"none");
      assert.ok(cover.natural>0&&cover.width>0);
      for(const action of ["share","favorite"]){
        const testId = mode==="brewery"&&action==="favorite" ? "button-follow-brewery" : `${mode}-hero-${action}`;
        await click(`[data-testid="${testId}"]`);
        assert.equal(await page.evaluate(action=>window.venueActions[action],action),1);
      }
      if(mode==="pub"){
        if(width===320){
          const description='[data-testid="overview-description-disclosure"]';
          const amenities='[data-testid="overview-amenities-disclosure"]';
          assert.equal(await page.$eval(description,node=>node.getAttribute("aria-expanded")),"false");
          await click(description);
          assert.equal(await page.$eval(description,node=>node.getAttribute("aria-expanded")),"true");
          assert.ok((await page.$eval('[data-testid="overview-description-content"]',node=>node.textContent)).length>1000);
          await click(description);
          assert.equal(await page.$eval(description,node=>node.getAttribute("aria-expanded")),"false");
          assert.equal(await page.evaluate(()=>document.body.textContent.includes("Tavoli esterni")),false);
          await click(amenities);
          assert.equal(await page.$eval(amenities,node=>node.getAttribute("aria-expanded")),"true");
          assert.ok(await page.evaluate(()=>document.body.textContent.includes("Tavoli esterni")));
          await click(amenities);
          assert.equal(await page.$eval(amenities,node=>node.getAttribute("aria-expanded")),"false");
          console.log("PASS description and services: expand/collapse without losing content");
        }
        for(const action of ["call","directions"]){
          await click(`[data-testid="pub-hero-${action}"]`);
          assert.equal(await page.evaluate(action=>window.venueActions[action],action),1);
        }
        if(width<768){
          const tabs=await page.$$eval('[data-testid="sticky-pub-tabs"] [role="tab"]',nodes=>nodes.map(node=>{
            const rect=node.getBoundingClientRect();return {left:rect.left,right:rect.right,height:rect.height};
          }));
          assert.equal(tabs.length,5);
          assert.ok(tabs.every(tab=>tab.left>=0&&tab.right<=width&&tab.height>=44),"all five tabs must remain reachable");
          await page.click('[data-testid="pub-tab-menu"]');
          assert.equal(await page.$eval("#active-tab",node=>node.textContent),"menu");
        }
      }
      console.log(`PASS ${mode}: cover fit, actions and layout at ${width}px`);
    }
  }
  for(const mode of ["pub","brewery"]){
    for(const cover of ["portrait","none","broken"]){
      await load(320,mode,cover,true);
      await assertNoOverflow();
      console.log(`PASS ${mode}: ${cover} cover in dark mode at 320px`);
    }
  }
  assert.deepEqual(errors,[]);
} finally { await browser.close() }
