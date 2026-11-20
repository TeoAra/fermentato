// Actual dashboard and public page; fixture APIs persist only in browser sessionStorage.
import assert from "node:assert/strict";
import { build } from "esbuild";
import puppeteer from "puppeteer";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";

const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import React from "react";
    import {createRoot} from "react-dom/client";
    import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
    import {HelmetProvider} from "react-helmet-async";
    import {Route} from "wouter";
    import Dashboard from "./client/src/pages/brewery-dashboard";
    import Detail from "./client/src/pages/brewery-detail";
    import {BottomNavProvider} from "./client/src/components/bottom-navigation";
    import {parseBreweryProfilePatch,publicBreweryProfile} from "./shared/brewery-profile";
    const mode=new URL(location.href).searchParams.get("mode")||"owner";
    const original={id:77,name:"Birrificio Artigianale delle Colline",location:"Via della Birra 12",region:"Veneto",country:"Italia",
      description:"Vecchio riassunto",descriptionHtml:"&lt;p&gt;La nostra storia&lt;/p&gt;&lt;p&gt;Seconda riga&lt;/p&gt;",
      logoUrl:"https://example.test/logo.png",coverImageUrl:"https://example.test/cover.png",websiteUrl:"https://example.test/",
      email:"pubblica@example.test",phone:"+39 0123 456",instagramUrl:"https://instagram.com/prova",facebookUrl:"",tiktokUrl:"",
      latitude:"45.1234",longitude:"11.9876",vatNumber:"VAT-RESERVED"};
    window.profile=JSON.parse(sessionStorage.getItem("brewery-profile")||"null")||original;
    window.requests=[];window.failNext=false;
    window.fetch=async(url,options={})=>{
      const path=String(url),method=options.method||"GET",body=options.body?JSON.parse(options.body):null;
      window.requests.push({path,method,body});
      const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}});
      if(method==="PATCH"){
        if(window.failNext){window.failNext=false;return response({message:"Salvataggio non riuscito"},500)}
        try{window.profile={...window.profile,...parseBreweryProfilePatch(body)}}
        catch(error){return response({message:error.issues?.[0]?.message||"Profilo non valido"},400)}
        sessionStorage.setItem("brewery-profile",JSON.stringify(window.profile));
        return response(window.profile);
      }
      if(path==="/api/brewery/my")return response({brewery:window.profile,beers:[]});
      if(path==="/api/admin/breweries/77/profile")return response(window.profile);
      if(path==="/api/breweries/77")return response({...publicBreweryProfile(window.profile),hasOwner:true});
      if(path.includes("request-status"))return response({hasRequest:false});
      if(path.includes("stats-extended"))return response({viewsSeries:[],checkinSeries:[],topBeersByViews:[],topBeersByCheckins:[],pubs:[],totalCheckins:0});
      if(path.endsWith("/stats"))return response({viewsWeek:0,viewsAllTime:0,topBeers:[],totalReviews:0,totalFavorites:0});
      if(path.endsWith("/rating"))return response({avgRating:null,reviewCount:0});
      if(path.endsWith("/count"))return response({count:"0"});
      if(path.includes("reviews"))return response({reviews:[]});
      return response([]);
    };
    const client=new QueryClient({defaultOptions:{queries:{retry:false,queryFn:async({queryKey})=>(await fetch(queryKey.join("/"))).json()},mutations:{retry:false}}});
    createRoot(document.getElementById("root")).render(
      <HelmetProvider><QueryClientProvider client={client}><BottomNavProvider>
        {mode==="public"?<Route path="/brewery/:id"><Detail/></Route>:<Dashboard adminBreweryId={mode==="admin"?77:undefined}/>}
      </BottomNavProvider></QueryClientProvider></HelmetProvider>
    );
  ` },
  bundle: true, write: false, jsx: "automatic", format: "iife",
  define: { "process.env.NODE_ENV": '"production"', "import.meta.env": "{}" },
  plugins: [{ name: "isolated-profile-fixtures", setup(build) {
    build.onResolve({filter:/^@\/hooks\/useAuth$/},()=>({path:"auth",namespace:"fixture"}));
    build.onResolve({filter:/^@\/components\/location-preview-map$/},()=>({path:"map",namespace:"fixture"}));
    build.onLoad({filter:/.*/,namespace:"fixture"},({path})=>({loader:"tsx",resolveDir:process.cwd(),contents:path==="auth"?
      'export const useAuth=()=>{const mode=new URL(location.href).searchParams.get("mode");const admin=mode==="admin";return {isLoading:false,isAuthenticated:mode!=="public",user:mode==="public"?null:{id:"fixture-owner",breweryId:admin?null:77,userType:admin?"admin":"brewery_owner",activeRole:admin?"admin":"brewery_owner",roles:[admin?"admin":"brewery_owner"]}}};':
      'export default function Map({latitude,longitude}){return <div data-testid="profile-map" data-lat={latitude} data-lng={longitude}>Mappa</div>};'}));
  }}],
});
const files=await readdir("dist/public/assets");
const css=(await Promise.all(files.filter(f=>f.endsWith(".css")).map(f=>readFile(`dist/public/assets/${f}`,"utf8")))).join("\n");
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||execFileSync("which",["chromium"],{encoding:"utf8"}).trim(),headless:true,args:["--no-sandbox"]});
try {
  const page=await browser.newPage(),errors=[];
  page.on("pageerror",e=>{errors.push(e.message);console.error("Browser error:",e.message)});
  await page.setRequestInterception(true);
  page.on("request",r=>r.isNavigationRequest()?r.respond({status:200,contentType:"text/html",body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div></body></html>'}):r.abort());
  const pause=()=>new Promise(r=>setTimeout(r,300));
  async function load(mode,width=390,reset=true){
    await page.setViewport({width,height:844,isMobile:width<768,hasTouch:true});
    await page.goto(`http://brewery-profile.test/brewery/77?mode=${mode}`);
    if(reset)await page.evaluate(()=>sessionStorage.clear());
    await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.waitForSelector(mode==="public"?'[data-testid="brewery-overview-section"]':'[data-testid="brewery-profile-home"]');
    await pause();
  }
  async function clickText(text,scope=""){
    await page.evaluate(({text,scope})=>{
      const button=[...document.querySelectorAll(scope?scope+" button":"button")].find(b=>b.textContent.trim()===text);
      if(!button)throw new Error("Missing button "+text);
      button.dataset.fixtureClick="yes";button.scrollIntoView({block:"center"});
    },{text,scope});
    await page.click('[data-fixture-click="yes"]');await page.evaluate(()=>document.querySelector('[data-fixture-click="yes"]')?.removeAttribute("data-fixture-click"));await pause();
  }
  const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"No horizontal overflow");
  async function fill(selector,value){
    await page.$eval(selector,n=>{n.scrollIntoView({block:"center"});n.focus();n.select()});
    await page.keyboard.type(value);if(!value)await page.keyboard.press("Backspace");
  }
  for(const mode of ["owner","admin"])for(const width of [320,390,1280]){
    await load(mode,width);
    await overflow();
    const home=await page.$eval('[data-testid="brewery-profile-home"]',n=>n.textContent);
    for(const label of ["Modifica profilo","Chi siamo","Contatti","Logo e copertina","Vedi pagina pubblica"])assert.ok(home.includes(label),label);
    assert.ok(!home.includes("<p>")&&!home.includes("VAT-RESERVED"));
    assert.equal(await page.$$eval('[data-testid="brewery-dashboard-dock"] [data-nav-item]',nodes=>nodes.length),5);
    await clickText("Chi siamo",'[data-testid="brewery-profile-home"]');
    await page.waitForSelector('[data-testid="brewery-profile-dialog"]');
    await page.waitForFunction(()=>document.activeElement?.id==="brewery-profile-description");
    assert.equal(await page.$eval("#brewery-profile-description",n=>n.value),"La nostra storia\nSeconda riga");
    await page.evaluate(()=>window.originalDescriptionNode=document.querySelector("#brewery-profile-description"));
    await page.keyboard.type(" nuova\nAltra riga");
    assert.ok(await page.evaluate(()=>document.activeElement===window.originalDescriptionNode&&window.originalDescriptionNode===document.querySelector("#brewery-profile-description")));
    await overflow();
    assert.ok(await page.$eval('[data-testid="brewery-profile-dialog"]',root=>[root,...root.querySelectorAll("*")].filter(n=>n.scrollHeight>n.clientHeight+2&&["auto","scroll"].includes(getComputedStyle(n).overflowY)).length<=1));
    await clickText("Annulla",'[data-testid="brewery-profile-dialog"]');
    await clickText("Chi siamo",'[data-testid="brewery-profile-home"]');
    assert.equal(await page.$eval("#brewery-profile-description",n=>n.value),"La nostra storia\nSeconda riga");
    const description="Profilo aggiornato\nSeconda riga pubblica";
    await fill("#brewery-profile-description",description);
    await page.$eval('[data-testid="brewery-profile-save"]',n=>{n.focus();n.click()});
    await page.waitForFunction(()=>!document.querySelector('[data-testid="brewery-profile-dialog"]'));
    const saved=await page.evaluate(()=>({profile:window.profile,request:window.requests.find(r=>r.method==="PATCH")}));
    assert.equal(saved.profile.description,description);
    assert.equal(saved.profile.latitude,"45.1234");assert.equal(saved.profile.longitude,"11.9876");
    assert.equal(saved.profile.logoUrl,"https://example.test/logo.png");
    assert.equal(saved.profile.vatNumber,"VAT-RESERVED");
    assert.equal(saved.request.path,mode==="admin"?"/api/admin/breweries/77":"/api/brewery/profile");
    assert.ok(!("descriptionHtml" in saved.request.body));
    await clickText("Modifica profilo",'[data-testid="brewery-profile-home"]');
    assert.equal(await page.$eval("#brewery-profile-description",n=>n.value),description);
    await clickText("Annulla",'[data-testid="brewery-profile-dialog"]');
    await load("public",width,false);
    const visible=await page.$eval('[data-testid="brewery-overview-section"]',n=>n.textContent);
    assert.ok(visible.includes("Profilo aggiornato")&&visible.includes("Seconda riga pubblica"));
    assert.ok(!visible.includes("VAT-RESERVED")&&!visible.includes("<p>"));
    assert.equal(await page.$eval('[data-testid="brewery-public-phone"]',n=>n.getAttribute("href")),"tel:+390123456");
    assert.equal(await page.$eval('[data-testid="brewery-public-email"]',n=>n.getAttribute("href")),"mailto:pubblica@example.test");
    assert.equal(await page.$eval('[data-testid="profile-map"]',n=>n.dataset.lat),"45.1234");
    assert.ok(visible.includes("Via della Birra 12"));
    await overflow();
    console.log(`PASS ${mode} ${width}px: shortcuts, plain text, cancel/reopen, focus, one scroll, save, public fields and preserved coordinates/images`);
  }
  for(const mode of ["owner","admin"]){
    await load(mode);
    for(const [label,tab] of [["Info Birrificio","info"],["Novità & Uscite","annunci"]]){
      await page.evaluate(label=>[...document.querySelectorAll('[data-testid="brewery-profile-home"] button')].find(b=>b.textContent.trim().startsWith(label)).click(),label);
      await page.waitForFunction(tab=>document.querySelector('[role="tabpanel"][data-state="active"]')?.id.endsWith("-content-"+tab),{},tab);
      await page.$eval('[data-nav-item="overview"]',n=>n.click());
      await page.waitForSelector('[data-testid="brewery-profile-home"][data-state="active"]');
    }
    await clickText("Logo e copertina",'[data-testid="brewery-profile-home"]');
    await page.waitForSelector('[data-testid="button-remove-image"]');
    await page.$eval('[data-testid="button-remove-image"]',n=>n.click());
    await page.waitForFunction(()=>window.profile.logoUrl===null);
    assert.equal(await page.evaluate(()=>window.profile.coverImageUrl),"https://example.test/cover.png");
    assert.equal(await page.evaluate(()=>window.profile.latitude),"45.1234");
    await page.waitForFunction(()=>document.querySelectorAll('[data-testid="button-remove-image"]').length===1);
    await page.$eval('[data-testid="button-remove-image"]',n=>n.click());
    await page.waitForFunction(()=>window.profile.coverImageUrl===null);
    assert.equal(await page.evaluate(()=>window.profile.phone),"+39 0123 456");
    console.log(`PASS ${mode}: Info/Novità reached from Home and intentional logo/cover removal preserves other fields`);
  }
  await load("owner");
  await clickText("Contatti",'[data-testid="brewery-profile-home"]');
  await page.waitForFunction(()=>document.activeElement?.id==="brewery-profile-website");
  await fill("#brewery-profile-phone","");
  await page.$eval('[data-testid="brewery-profile-save"]',n=>n.click());
  await page.waitForFunction(()=>!document.querySelector('[data-testid="brewery-profile-dialog"]'));
  await load("public",390,false);
  assert.equal(await page.$('[data-testid="brewery-public-phone"]'),null);
  await load("owner",390,false);
  await clickText("Modifica profilo",'[data-testid="brewery-profile-home"]');
  await fill("#brewery-profile-name","");
  await page.$eval('[data-testid="brewery-profile-save"]',n=>n.click());await page.waitForSelector('[role="alert"]');
  assert.equal(await page.evaluate(()=>window.requests.filter(r=>r.method==="PATCH").length),0);
  await fill("#brewery-profile-name","Nome valido");
  await page.evaluate(()=>window.failNext=true);
  await page.$eval('[data-testid="brewery-profile-save"]',n=>n.click());
  await page.waitForFunction(()=>document.querySelector('[role="alert"]')?.textContent.includes("Salvataggio non riuscito"));
  assert.equal(await page.$eval("#brewery-profile-name",n=>n.value),"Nome valido");
  assert.ok(await page.$('[data-testid="brewery-profile-dialog"]'));
  assert.deepEqual(errors,[]);
  console.log("PASS intentional clearing, required validation, visible save error and preserved draft");
} finally {await browser.close()}
