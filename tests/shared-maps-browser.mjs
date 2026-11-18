import assert from "node:assert/strict";
import { build } from "esbuild";
import puppeteer from "puppeteer";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// Actual MapLibre cameras/sources; local style/tiles only, no database writes.
const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import React from "react";
    import {createRoot} from "react-dom/client";
    import Preview from "./client/src/components/location-preview-map";
    import {PubMap} from "./client/src/components/pub-map";
    import {EventMap} from "./client/src/components/event-map";
    const mode=new URLSearchParams(location.search).get("mode");
    const pins=[{id:1,name:"Locale <script>non eseguito</script>",title:"Evento prova",venueName:"Pub prova",
      sourceType:"pub",slug:"prova",latitude:"45.4",longitude:"11.9"}];
    function App(){
      const [items,setItems]=React.useState(pins);
      window.changePins=()=>setItems([{...pins[0],id:2,name:"Birrificio nuovo",type:"brewery",
        sourceType:"brewery",title:"Evento aggiornato",latitude:"45.41"}]);
      return <main style={{height:250,position:"relative"}}>{
        mode==="pub"?<PubMap pins={items} userLocation={{lat:45.401,lng:11.901}} radiusKm={5}/>:
        mode==="event"?<EventMap pins={items}/>:
        <Preview latitude={45.4} longitude={11.9} label="Luogo di prova" kind={mode==="brewery"?"brewery":"pub"}
          origin={mode==="route"?{lat:45.39,lng:11.87}:undefined}
          route={mode==="route"?{type:"LineString",coordinates:[[11.87,45.39],[11.95,45.42],[11.9,45.4]]}:undefined}/>
      }</main>;
    }
    createRoot(document.getElementById("root")).render(<App/>);
  ` },
  bundle: true, write: false, format: "iife", jsx: "automatic", loader: {".css":"empty"},
  define: {"process.env.NODE_ENV":'"production"',"import.meta.env":"{}"},
  plugins: [{
    name: "observe-real-map",
    setup(build) {
      build.onResolve({filter:/^maplibre-gl$/},()=>({path:"observed-map",namespace:"observer"}));
      build.onLoad({filter:/.*/,namespace:"observer"},()=>({loader:"js",resolveDir:process.cwd(),contents:`
        import actual from ${JSON.stringify(resolve("node_modules/maplibre-gl/dist/maplibre-gl.js"))};
        const original=actual.Map;
        actual.Map=class extends original {constructor(options){super(options);(window.realMaps??=[]).push(this)}};
        export default actual;
      `}));
    }
  }],
});
const assets=await readdir("dist/public/assets");
const css=(await Promise.all(assets.filter(name=>name.endsWith(".css")).map(name=>readFile(`dist/public/assets/${name}`,"utf8")))).join("\n");
const browser=await puppeteer.launch({
  executablePath:execFileSync("which",["chromium"],{encoding:"utf8"}).trim(),
  headless:true,args:["--no-sandbox","--enable-unsafe-swiftshader"],
});
let failStyle=false;
try {
  const page=await browser.newPage();
  const errors=[];
  page.on("pageerror",error=>{errors.push(error.message); console.error(error.stack)});
  await page.setRequestInterception(true);
  page.on("request",request=>{
    if(request.url().includes("tiles.openfreemap.org/styles/positron")) return request.respond({
      status:failStyle?503:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},
      body:JSON.stringify({version:8,glyphs:"https://maps.test/fonts/{fontstack}/{range}.pbf",sources:{},
        layers:[{id:"background",type:"background",paint:{"background-color":"#ffffff"}}]}),
    });
    if(request.url().includes("/fonts/")) return request.respond({status:200,contentType:"application/x-protobuf",body:Buffer.alloc(0)});
    if(request.isNavigationRequest()) return request.respond({status:200,contentType:"text/html",
      body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>'});
    return request.abort();
  });
  async function load(mode,width=390) {
    await page.setViewport({width,height:844,isMobile:width<768,hasTouch:width<768});
    await page.goto(`https://maps.test/?mode=${mode}`);
    await page.addStyleTag({content:css});
    await page.addScriptTag({content:bundle.outputFiles[0].text});
  }
  async function ready() {
    await page.waitForFunction(()=>window.realMaps?.at(-1)?.loaded());
    await page.waitForFunction(()=>window.realMaps.at(-1).getPaintProperty("background","background-color")==="#fff7ea");
  }
  for(const width of [320,390,1280]) for(const mode of ["detail","brewery","route","pub","event"]) {
    await load(mode,width);
    await ready();
    assert.equal(await page.$eval("canvas",canvas=>canvas.getBoundingClientRect().width>0),true);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(["detail","brewery","route"].includes(mode)) {
      await page.waitForSelector('[data-location-preview-state="ready"]');
      assert.ok(await page.$(`.fermenta-map-marker--${mode==="brewery"?"brewery":"pub"}`));
      assert.equal(await page.$eval(".fermenta-map-marker svg",svg=>svg.getAttribute("fill")),mode==="brewery"?"#0F766E":"#F59E0B");
      assert.equal(await page.$eval(".fermenta-map-marker svg",svg=>svg.querySelectorAll("path").length),1,"One plain pin, no interior icon");
      if(mode==="route") {
        assert.equal(await page.evaluate(async()=>{
          const data=await window.realMaps.at(-1).getSource("preview-route").getData();
          return (data.geometry??data.features[0].geometry).coordinates.length;
        }),3);
        assert.ok(await page.$(".fermenta-map-marker--origin"));
        const allVisible=await page.evaluate(()=>{
          const map=window.realMaps.at(-1),bounds=map.getBounds();
          return [[11.87,45.39],[11.95,45.42],[11.9,45.4]].every(point=>bounds.contains(point));
        });
        assert.equal(allVisible,true,"Entire route, including its bend, fits preview");
      }
    } else {
      const source=mode==="pub"?"pins":"events";
      const layer=mode==="pub"?"unclustered":"event-unclustered";
      assert.equal(await page.evaluate(()=>["pub","brewery","event"].every(kind=>window.realMaps.at(-1).hasImage(`fermenta-${kind}`))),true);
      await page.waitForFunction(async source=>{
        const data=await window.realMaps.at(-1).getSource(source)?.getData();
        return data?.features.length===1;
      },{},source);
      // Fire the actual registered selection handler with a deterministic feature.
      await page.evaluate(async ({source,layer})=>{
        const map=window.realMaps.at(-1);
        const feature=(await map.getSource(source).getData()).features[0];
        const originalQuery=map.queryRenderedFeatures.bind(map);
        map.queryRenderedFeatures=(_point,options)=>options?.layers?.includes(layer)?[feature]:[];
        const point=map.project(feature.geometry.coordinates);
        map.fire("click",{point,lngLat:map.getCenter(),originalEvent:new MouseEvent("click")});
        map.queryRenderedFeatures=originalQuery;
      },{source,layer});
      await page.waitForSelector(".fermenta-popup a");
      const bottomPosition=await page.$eval(".fermenta-popup",node=>{
        const popup=node.getBoundingClientRect();
        const controls=document.querySelector(".maplibregl-ctrl-top-right").getBoundingClientRect();
        return {bottom:popup.bottom,controlsTop:controls.top,containerBottom:node.parentElement.getBoundingClientRect().bottom};
      });
      assert.ok(bottomPosition.bottom<=bottomPosition.controlsTop,"Venue card remains above bottom controls");
      const href=await page.$eval(".fermenta-popup a",a=>a.getAttribute("href"));
      assert.equal(href,mode==="pub"?"/pub/prova":"/eventi/pub/1");
      assert.equal(await page.$(".fermenta-popup script"),null);
      await page.evaluate(()=>window.changePins());
      await page.waitForFunction(async source=>(await window.realMaps.at(-1).getSource(source).getData()).features[0].properties.id===2,{timeout:5000},source).catch(async error=>{
        console.log("Update diagnostics",mode,await page.evaluate(()=>({
          text:document.body.textContent,maps:window.realMaps?.length
        })),errors);
        throw error;
      });
      if(mode==="pub") assert.ok(await page.evaluate(()=>Boolean(window.realMaps.at(-1).getSource("radius-circle"))));
    }
    console.log(`PASS ${mode}: ${width}px, shared cartography, selection/route/data`);
  }
  for(const mode of ["detail","pub","event"]) {
    failStyle=true;
    await load(mode);
    await page.waitForFunction(()=>document.body.textContent.includes("Mappa non disponibile"));
    failStyle=false;
    await page.evaluate(()=>[...document.querySelectorAll("button")].find(b=>b.textContent==="Riprova").click());
    await ready();
    await page.waitForFunction(()=>!document.body.textContent.includes("Mappa non disponibile"));
    console.log(`PASS ${mode}: load failure and retry`);
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
