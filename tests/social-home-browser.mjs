// Isolated real pages/components with fixture APIs; no application auth bypass.
import assert from "node:assert/strict";
import { build } from "esbuild";
import puppeteer from "puppeteer";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const bundle=await build({
  stdin:{resolveDir:process.cwd(),loader:"tsx",contents:`
    import React from "react";
    import {createRoot} from "react-dom/client";
    import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
    import {HelmetProvider} from "react-helmet-async";
    import Home from "./client/src/pages/home";
    import Landing from "./client/src/pages/landing";
    import PubCard from "./client/src/components/pub-card";
    import BreweryCard from "./client/src/components/brewery-card";
    import BeerHero from "./client/src/components/beer/BeerHero";
    import {BottomNavigation,BottomNavProvider} from "./client/src/components/bottom-navigation";
    const pub={id:1,name:"Pub di prova",slug:"pub-prova",city:"Padova",address:"Via di prova",
      latitude:"45.401",longitude:"11.901",coverImageUrl:"/wide.svg",logoUrl:"/logo.svg",beerCount:6};
    const brewery={id:2,name:"Birrificio di prova",slug:"birrificio-prova",location:"Padova",country:"Italia",
      latitude:"45.42",longitude:"11.92",coverImageUrl:"/wide.svg",logoUrl:"/logo.svg",imageUrl:"/wide.svg",beerCount:8};
    const beer={id:3,name:"Birra di prova",style:"IPA",abv:"6.2",ibu:45,breweryId:2,
      breweryName:brewery.name,brewery,imageUrl:"/wide.svg",logoUrl:"/logo.svg"};
    const mode=new URLSearchParams(location.search).get("mode");
    const user=mode==="landing"?null:{id:"fixture-user",username:"fixture",userType:"customer"};
    function response(key){
      if(key==="/api/auth/user") return user;
      if(key==="/api/pubs") return [pub];
      if(key.startsWith("/api/breweries")) return [brewery];
      if(key==="/api/stats") return {pubs:1,breweries:1,beers:1,users:1,totalPubs:1,totalBreweries:1,totalBeers:1,totalUsers:1};
      if(key.includes("popular-styles")) return [{style:"IPA",count:1}];
      if(key.includes("trending")&&key.includes("beers")) return [beer];
      return [];
    }
    window.fetch=async(input)=>new Response(JSON.stringify(response(String(input).split("?")[0])),{status:200,headers:{"Content-Type":"application/json"}});
    const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false,staleTime:Infinity,queryFn:async({queryKey})=>response(String(queryKey[0]))}}});
    client.setQueryData(["/api/auth/user"],user);
    window.heroCalls={};const action=name=>()=>window.heroCalls[name]=(window.heroCalls[name]||0)+1;
    function App(){return <QueryClientProvider client={client}><HelmetProvider><BottomNavProvider>
      <header style={{height:100,paddingTop:44,boxSizing:"border-box"}}>Fermenta</header>
      {mode==="landing"?<Landing/>:mode==="home"?<Home/>:mode==="cards"?
        <main className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2"><PubCard pub={pub}/><BreweryCard brewery={brewery}/></main>:
        <main id="beer-surface"><BeerHero beer={beer} reviewsData={{avgRating:4.2,reviewCount:8}} totalLocations={3}
          checkinCount={6} isAdmin isAuthenticated isSearchingImage={false} isBeerFavorited={false}
          favoritePending={false} onShare={action("share")} onOpenEditDialog={action("edit")}
          onToggleFavorite={action("favorite")} onCheckin={action("checkin")} onReview={action("review")}/></main>}
      <BottomNavigation/>
    </BottomNavProvider></HelmetProvider></QueryClientProvider>}
    createRoot(document.getElementById("root")).render(<App/>);
  `},
  bundle:true,write:false,format:"iife",jsx:"automatic",
  define:{"process.env.NODE_ENV":'"production"',"import.meta.env":"{}"},
});
const css=(await Promise.all((await readdir("dist/public/assets")).filter(file=>file.endsWith(".css"))
  .map(file=>readFile("dist/public/assets/"+file,"utf8")))).join("\n");
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="300"><rect width="1600" height="300" fill="#b45309"/><text x="100" y="190" font-size="90" fill="white">Copertina intera</text></svg>';
const browser=await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||execFileSync("which",["chromium"],{encoding:"utf8"}).trim(),args:["--no-sandbox"]});
const errors=[];
try{
  const page=await browser.newPage();
  page.on("pageerror",error=>{errors.push(error.message);console.error(error.stack)});
  await page.setRequestInterception(true);
  page.on("request",request=>request.isNavigationRequest()
    ?request.respond({status:200,contentType:"text/html",body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>'})
    :request.url().endsWith(".svg")?request.respond({status:200,contentType:"image/svg+xml",body:svg}):request.abort());
  await page.evaluateOnNewDocument(()=>{
    if(location.origin!=="http://social.test"||self!==top)return;
    localStorage.setItem("fermenta:userLocation",JSON.stringify({lat:45.4,lng:11.9,accuracy:15,timestamp:Date.now()}));
    Object.defineProperty(navigator,"geolocation",{configurable:true,value:{watchPosition:()=>1,clearWatch:()=>{}}});
  });
  for(const dark of [false,true])for(const width of [320,390,412])for(const mode of ["home","landing","cards","beer"]){
    await page.setViewport({width,height:844,isMobile:true,hasTouch:true});
    await page.goto("http://social.test/?mode="+mode);
    await page.addStyleTag({content:css});
    await page.evaluate(dark=>{
      document.documentElement.classList.toggle("dark",dark);
      document.documentElement.style.setProperty("--frozen-sab","34px");
      document.documentElement.style.setProperty("--frozen-sat","44px");
    },dark);
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.waitForSelector("main h1,main a");
    await page.waitForFunction(()=>document.fonts.status==="loaded");
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${mode}: horizontal overflow`);
    if(mode==="home"||mode==="landing"){
      await page.waitForSelector('[data-testid="home-map-panel"]');
      const state=await page.$eval('[data-testid="home-map-panel"]',node=>{
        const rect=node.getBoundingClientRect(),nav=document.querySelector("[data-floating-bottom-bar]").getBoundingClientRect();
        const main=node.closest("main");
        const title=main.querySelector("h1");
        const search=[...main.querySelectorAll('a[href="/search"]')].find(link=>link.getBoundingClientRect().height>=44);
        return {height:rect.height,bottom:rect.bottom,navTop:nav.top,titleWeight:Number(getComputedStyle(title).fontWeight),search:!!search,searchBottom:search?.getBoundingClientRect().bottom};
      });
      assert.ok(state.height>=220&&state.height<=300);
      assert.ok(state.bottom<=state.navTop-8,`${mode} ${width}px: map must fit above navigation (${state.bottom}, ${state.navTop})`);
      assert.ok(state.search&&state.searchBottom<=state.navTop);
      assert.ok(state.titleWeight<=700);
      assert.equal(await page.evaluate(()=>document.body.innerText.includes("Esplora sulla mappa")),false);
    }else if(mode==="cards"){
      assert.ok(await page.$('main a[href="/pub/pub-prova"]'));
      assert.ok(await page.$('main a[href="/brewery/birrificio-prova"]'));
      const covers=await page.$$eval('main img[src="/wide.svg"]',images=>images.map(image=>getComputedStyle(image).objectFit));
      assert.equal(covers.length,2);assert.ok(covers.every(fit=>fit==="contain"));
      assert.ok(await page.evaluate(()=>document.body.innerText.includes("Padova")));
    }else{
      assert.ok(await page.$('[data-testid="beer-hero"]'));
      for(const selector of ["button-share","button-admin-edit-hero","button-favorite","button-checkin","button-review"]){
        await page.click(`[data-testid="${selector}"]`);
      }
      const calls=await page.evaluate(()=>window.heroCalls);
      for(const action of ["share","edit","favorite","checkin","review"])assert.ok(calls[action]>=1,`Preserved beer action: ${action}`);
      assert.ok(await page.evaluate(()=>document.body.innerText.includes("IPA")&&document.body.innerText.includes("Birra di prova")));
    }
    console.log(`PASS ${mode} ${width}px ${dark?"dark":"light"}: compact home, clean entity surfaces, intact actions`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
