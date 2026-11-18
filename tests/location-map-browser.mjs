import { build } from "esbuild";
import puppeteer from "puppeteer";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";

const assets = await readdir("dist/public/assets");
const css = (await Promise.all(assets.filter(name => name.endsWith(".css")).map(name => readFile(`dist/public/assets/${name}`, "utf8")))).join("\n");
const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader:"tsx", contents:`
    import React, {useState, useMemo} from "react";
    import {createRoot} from "react-dom/client";
    import HomeMapPanel from "./client/src/components/home-map-panel";
    import Indicator from "./client/src/components/pull-to-refresh-indicator";
    import {useGeolocation} from "./client/src/hooks/useGeolocation";
    import {usePullToRefresh} from "./client/src/hooks/use-pull-to-refresh";
    import {locateAccurately, isLocationPermissionDenied} from "./client/src/lib/geolocation";
    window.locateAccurately = locateAccurately;
    window.isLocationPermissionDenied = isLocationPermissionDenied;
    function App() {
      const geo = useGeolocation();
      const [distance, setDistance] = useState(10);
      const [pubs, setPubs] = useState(true), [breweries,setBreweries] = useState(true);
      const location = useMemo(()=>geo.lat===null?null:{lat:geo.lat,lng:geo.lng},[geo.lat,geo.lng]);
      window.geoRequest=geo.request; window.geoClear=geo.clear;
      const refresh = usePullToRefresh(()=>{window.refreshCalls++;return new Promise((resolve,reject)=>{window.resolveRefresh=resolve;window.rejectRefresh=reject})});
      return <><div id="pull-surface" style={{height:70}}>Trascina qui per aggiornare</div><Indicator {...refresh}/>
      <pre id="geo-state" style={{display:"none"}}>{JSON.stringify(geo)}</pre>
      <div style={{position:"fixed",top:0,left:0,right:0,height:50,zIndex:9999}}>Header di prova</div>
      <div style={{transform:"translateZ(0)"}}><HomeMapPanel pubs={[{id:1,name:"Pub prova",latitude:"45.401",longitude:"11.901",slug:"prova"}]}
        breweries={[{id:2,name:"Birrificio prova",latitude:"45.43",longitude:"11.93"}]}
        userLocation={location} accuracy={geo.accuracy} isCached={geo.isCached} locationStatus={geo.status}
        locationError={geo.error} recenterToken={geo.requestId} onRequestLocation={geo.request}
        distanceKm={distance} onDistanceChange={setDistance} showPubs={pubs} onShowPubsChange={setPubs}
        showBreweries={breweries} onShowBreweriesChange={setBreweries}/></div><div style={{height:1000}} /></>;
    }
    createRoot(document.getElementById("root")).render(<App/>);
  `},
  bundle:true,write:false,format:"iife",jsx:"automatic",loader:{".css":"empty"},define:{"process.env.NODE_ENV":'"production"',"import.meta.env":"{}"},
  plugins:[{
    name:"capacitor-fixtures",
    setup(build){
      build.onResolve({filter:/^@capacitor\/(core|geolocation)$/}, args=>({path:args.path,namespace:"fixture"}));
      build.onLoad({filter:/.*/,namespace:"fixture"},args=>({contents:args.path.endsWith("/core")
        ? 'export const Capacitor={isNativePlatform:()=>!!window.nativeMode};'
        : `export const Geolocation={
            requestPermissions:async()=>({location:window.nativePermission??"granted",coarseLocation:window.nativeCoarsePermission??"granted"}),
            checkPermissions:async()=>({location:"granted"}),
            watchPosition:async(options,callback)=>{
              window.nativeCallback=callback;window.nativeOptions=options;
              if(window.nativeImmediateFix) callback(window.nativeImmediateFix);
              await new Promise(resolve=>setTimeout(resolve,20));return "native-watch";
            },
            clearWatch:async({id})=>window.nativeCleared.push(id)
          };`
      }));
    }
  }]
});
const browser = await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || execFileSync("which",["chromium"],{encoding:"utf8"}).trim(),args:["--no-sandbox","--enable-unsafe-swiftshader"]});
const errors=[];
let failMapStyle=false;
try {
  const page=await browser.newPage();
  page.on("pageerror",error=>{errors.push(error.message);console.error(error.stack)});
  await page.setRequestInterception(true);
  page.on("request",request=>request.url()==="https://tiles.openfreemap.org/styles/positron"
    ? request.respond({status:failMapStyle?503:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify({
      version:8,sources:{},layers:[{id:"background",type:"background",paint:{"background-color":"#fff7ea"}}]
    })})
    : request.isNavigationRequest()
    ? request.respond({status:200,contentType:"text/html",body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>'})
    : request.abort());
  await page.evaluateOnNewDocument(()=>{
    window.refreshCalls=0;window.watchCalls=[];window.browserCleared=[];window.nativeCleared=[];
    Object.defineProperty(navigator,"geolocation",{configurable:true,value:{
      watchPosition(success,error,options){window.watchCalls.push({success,error,options});return window.watchCalls.length-1},
      clearWatch(id){window.browserCleared.push(id)}
    }});
  });
  async function load(width, expectedState="ready") {
    await page.setViewport({width,height:844,isMobile:true,hasTouch:true});
    await page.goto("http://fixture.test/");
    await page.addStyleTag({content:css});
    await page.evaluate(()=>{
      document.documentElement.style.setProperty("--frozen-sat","47px");
      document.documentElement.style.setProperty("--frozen-sab","34px");
    });
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.waitForSelector("[data-map-center]");
    await page.waitForSelector(`[data-vector-map-state="${expectedState}"]`);
  }
  const state=()=>page.$eval("#geo-state",node=>JSON.parse(node.textContent));
  async function touch(selector,dx=0,dy=90,cancel=false) {
    await page.evaluate(({selector,dx,dy,cancel})=>{
      const target=document.querySelector(selector);
      const emit=(type,x,y)=>target.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,
        touches:type==="touchend"||type==="touchcancel"?[]:[new Touch({identifier:1,target,clientX:x,clientY:y})]}));
      emit("touchstart",30,20);emit("touchmove",30+dx,20+dy);emit(cancel?"touchcancel":"touchend",30+dx,20+dy);
    },{selector,dx,dy,cancel});
    await new Promise(resolve=>setTimeout(resolve,40));
  }
  for(const width of [320,390,412]){
    await load(width);
    const height=await page.$eval('[data-testid="home-map-panel"]',node=>node.getBoundingClientRect().height);
    assert.ok(height>=220&&height<=300,`Compact map: ${height}`);
    assert.equal(await page.evaluate(()=>document.body.innerText.includes("Esplora sulla mappa")),false);
    assert.equal(await page.$('[data-testid="home-map-selected-venue"]'),null);
    await page.click('[aria-label="Apri filtri mappa"]');
    const geometry=await page.$eval('[aria-label="Filtri mappa"]',node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right}});
    assert.ok(geometry.left>=0&&geometry.right<=width);
    assert.equal(await page.$eval("#map-radius",node=>node.disabled),true);
    assert.equal(await page.$("a[aria-label='Apri preferiti']"),null);
    await page.click('[aria-label="Chiudi filtri"]');
    await page.click('[aria-label="Espandi mappa a schermo intero"]');
    assert.equal(await page.$eval("body",node=>node.style.overflow),"hidden");
    assert.ok(await page.$('[role="dialog"][aria-modal="true"]'));
    const fullscreen=await page.$eval('[data-testid="home-map-panel"]',node=>{
      const r=node.getBoundingClientRect();
      return {inRoot:Boolean(node.closest("#root")),top:r.top,left:r.left,width:r.width,height:r.height};
    });
    assert.equal(fullscreen.inRoot,false,"Fullscreen escapes transformed page ancestors");
    assert.equal(fullscreen.top,0);
    assert.equal(fullscreen.left,0);
    assert.equal(fullscreen.width,width);
    assert.equal(fullscreen.height,844);
    await page.keyboard.press("Escape");
    assert.equal(await page.$('[role="dialog"][aria-modal="true"]'),null);
    assert.equal(await page.$eval("body",node=>node.style.overflow),"");
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    console.log(`PASS map controls/fullscreen at ${width}px`);
  }
  await page.evaluate(()=>{void window.geoRequest()});
  await page.waitForFunction(()=>window.watchCalls.length===1);
  assert.deepEqual(await page.evaluate(()=>window.watchCalls[0].options),{enableHighAccuracy:true,maximumAge:0,timeout:25000});
  await page.evaluate(()=>window.watchCalls[0].success({coords:{latitude:45.4,longitude:11.9,accuracy:2500},timestamp:Date.now()}));
  assert.equal((await state()).status,"requesting");
  assert.equal(await page.evaluate(()=>window.browserCleared.length),0);
  await page.evaluate(()=>window.watchCalls[0].success({coords:{latitude:45.401,longitude:11.901,accuracy:15},timestamp:Date.now()}));
  await page.waitForFunction(()=>JSON.parse(document.querySelector("#geo-state").textContent).status==="granted");
  assert.equal((await state()).accuracy,15);
  assert.equal(await page.evaluate(()=>window.browserCleared.length),1);
  await page.waitForFunction(()=>document.querySelector("[data-map-center]").dataset.mapCenter==="45.401,11.901");
  assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem("fermenta:userLocation")).timestamp>0));
  await page.click('[aria-label="Apri filtri mappa"]');
  await page.select("#map-radius","5");
  await page.click('[aria-label="Chiudi filtri"]');
  console.log("PASS GPS: coarse fix continues, precise fix moves map, watch is cleaned up");
  await page.click('[aria-label="Pub: Pub prova"]');
  const detail=await page.$eval('a[href="/pub/prova"]',node=>{const rect=node.getBoundingClientRect();return {left:rect.left,right:rect.right,height:rect.height}});
  assert.ok(detail.left>=0&&detail.right<=412&&detail.height>=44);
  const popupGeometry=await page.$eval('[data-testid="home-map-selected-venue"]',node=>{
    const panel=node.closest('[data-testid="home-map-panel"]').getBoundingClientRect();
    const popup=node.getBoundingClientRect();
    return {top:popup.top-panel.top,left:popup.left-panel.left,bottom:popup.bottom-panel.bottom};
  });
  assert.ok(popupGeometry.top>=10);
  assert.ok(popupGeometry.left>=10&&popupGeometry.left<=14);
  assert.ok(popupGeometry.bottom<=0);
  assert.equal(await page.$eval('[data-testid="home-map-selected-venue"]',node=>node.dataset.venueType),"pub");
  await page.click('[aria-label="Chiudi dettagli locale"]');
  await page.waitForFunction(()=>!document.querySelector('[data-testid="home-map-selected-venue"]'));
  await page.waitForSelector('[aria-label="Riduci mappa"]');
  await page.click('[aria-label="Riduci mappa"]');
  await page.click('[aria-label="Riduci mappa"]');
  await page.waitForFunction(()=>{
    const marker=document.querySelector('[aria-label="Birrificio: Birrificio prova"]')?.getBoundingClientRect();
    const panel=document.querySelector('[data-testid="home-map-panel"]').getBoundingClientRect();
    return marker&&marker.top>=panel.top&&marker.bottom<=panel.bottom;
  });
  await page.click('[aria-label="Birrificio: Birrificio prova"]');
  assert.equal(await page.$eval('[data-testid="home-map-selected-venue"]',node=>node.dataset.venueType),"brewery");
  assert.equal(await page.$eval('[data-testid="home-map-selected-venue"] a',node=>node.getAttribute("href")),"/brewery/2");
  await page.click('[aria-label="Apri filtri mappa"]');
  await page.click('[aria-label="Filtri mappa"] label:nth-of-type(2) input');
  await page.waitForFunction(()=>!document.querySelector('[data-testid="home-map-selected-venue"]'));
  await page.click('[aria-label="Chiudi filtri"]');
  console.log("PASS compact map: bottom venue details, working links/close/filter clearing");

  await page.click('[aria-label="Espandi mappa a schermo intero"]');
  await page.waitForSelector('[data-vector-map-state="ready"]');
  await page.waitForSelector('[aria-label="Pub: Pub prova"]',{timeout:5000}).catch(async error=>{
    console.log("Fullscreen diagnostics",await page.evaluate(()=>({
      center:document.querySelector("[data-map-center]")?.dataset.mapCenter,
      zoom:document.querySelector("[data-map-center]")?.dataset.mapZoom,
      labels:[...document.querySelectorAll("button")].map(node=>node.getAttribute("aria-label")),
      geo:document.querySelector("#geo-state")?.textContent
    })));
    throw error;
  });
  await page.click('[aria-label="Pub: Pub prova"]');
  const bottomCard=await page.$eval('[data-testid="home-map-selected-venue"]',node=>{
    const r=node.getBoundingClientRect();
    const controls=document.querySelector('[aria-label="Apri filtri mappa"]').getBoundingClientRect();
    return {top:r.top,bottom:r.bottom,controlsTop:controls.top,visible:document.elementFromPoint(r.left+20,r.top+20)?.closest('[data-testid="home-map-selected-venue"]')===node};
  });
  assert.ok(bottomCard.top>422&&bottomCard.bottom<bottomCard.controlsTop);
  assert.equal(bottomCard.visible,true,"Card is above app header/dock and actually hit-testable");
  await page.click('[aria-label="Apri filtri mappa"]');
  const filtersBottom=await page.$eval('[aria-label="Filtri mappa"]',node=>{
    const r=node.getBoundingClientRect();
    return {bottom:r.bottom,visible:document.elementFromPoint(r.left+20,r.top+20)?.closest('[aria-label="Filtri mappa"]')===node};
  });
  assert.ok(Math.abs(filtersBottom.bottom-734)<=1);
  assert.equal(filtersBottom.visible,true);
  assert.equal(await page.$eval('[data-testid="home-map-selected-venue"]',node=>getComputedStyle(node).display),"none");
  await page.click('[aria-label="Chiudi filtri"]');
  assert.equal(await page.$eval('[data-testid="home-map-selected-venue"]',node=>getComputedStyle(node).display)!=="none",true);
  await page.keyboard.press("Escape");
  console.log("PASS fullscreen: viewport portal, bottom card and filters, safe area once, no overlap");

  await touch("#pull-surface",70,10);
  await touch("#pull-surface",0,90,true);
  await touch("[data-map-center]");
  assert.equal(await page.evaluate(()=>window.refreshCalls),0);
  await touch("#pull-surface");
  await touch("#pull-surface");
  assert.equal(await page.evaluate(()=>window.refreshCalls),1);
  await page.evaluate(()=>window.resolveRefresh());
  await page.waitForFunction(()=>!document.body.textContent.includes("Aggiornamento in corso"));
  await touch("#pull-surface");
  await page.evaluate(()=>window.rejectRefresh(new Error("Errore di prova")));
  await page.waitForFunction(()=>document.body.textContent.includes("Errore di prova"));
  console.log("PASS pull refresh: ignored map/horizontal/cancel, no duplicate, visible errors");

  const native = await page.evaluate(async()=>{
    window.nativeMode=true;
    window.nativeImmediateFix={coords:{latitude:45.4,longitude:11.9,accuracy:12},timestamp:Date.now()};
    const result=await window.locateAccurately({timeout:200});
    await new Promise(resolve=>setTimeout(resolve,35));
    return {accuracy:result.coords.accuracy,cleared:window.nativeCleared,options:window.nativeOptions};
  });
  assert.equal(native.accuracy,12);
  assert.ok(native.cleared.includes("native-watch"));
  assert.equal(native.options.enableHighAccuracy,true);
  const cancelled=await page.evaluate(async()=>{
    window.nativeMode=false;
    const controller=new AbortController();
    const promise=window.locateAccurately({signal:controller.signal,timeout:200}).catch(error=>error.name);
    controller.abort();return promise;
  });
  assert.equal(cancelled,"AbortError");
  const timeout=await page.evaluate(async()=>window.locateAccurately({timeout:80}).then(()=>false,error=>!window.isLocationPermissionDenied(error)));
  assert.equal(timeout,true);
  const coarse=await page.evaluate(async()=>{
    window.nativeMode=true;window.nativePermission="denied";window.nativeCoarsePermission="granted";
    window.nativeImmediateFix={coords:{latitude:45.4,longitude:11.9,accuracy:2000},timestamp:Date.now()};
    return (await window.locateAccurately({timeout:100})).coords.accuracy;
  });
  assert.equal(coarse,2000);
  await page.evaluate(()=>{window.nativeMode=false;window.geoClear();void window.geoRequest()});
  await page.waitForFunction(()=>window.watchCalls.length>=4);
  await page.evaluate(()=>window.watchCalls.at(-1).error({code:1,message:"Permission denied"}));
  await page.waitForFunction(()=>JSON.parse(document.querySelector("#geo-state").textContent).status==="denied");
  console.log("PASS native GPS: synchronous first-fix cleanup race and abort");
  console.log("PASS location errors: timeout is not permission denial; coarse permission remains usable");
  failMapStyle=true;
  await load(390,"error");
  assert.ok(await page.$('[role="alert"]'));
  failMapStyle=false;
  await page.click('[role="alert"] button');
  await page.waitForSelector('[data-vector-map-state="ready"]');
  assert.equal(await page.$('[role="alert"]'),null);
  console.log("PASS vector map: failed style is explicit, retry recreates a working map");
  assert.deepEqual(errors,[]);
} finally {await browser.close()}
