// Real navigation components and verbatim dashboard dock JSX, isolated from auth/API.
import assert from "node:assert/strict";
import { build } from "esbuild";
import ts from "typescript";
import puppeteer from "puppeteer";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";

async function extractDock(path, name) {
  const file = ts.createSourceFile(path, await readFile(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let dock;
  const declarations = [];
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === "FloatingBottomBar") dock = node.getText(file);
    if (ts.isVariableDeclaration(node) && ["sections", "mobilePrimarySections", "mobileMoreSections"].includes(node.name.getText(file))) {
      declarations.push(`const ${node.name.getText(file)}=${node.initializer.getText(file)};`);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(dock, `Missing floating navigation in ${path}`);
  const aliases = file.statements.filter(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === "lucide-react")
    .flatMap(node => node.importClause?.namedBindings?.elements || [])
    .map(node => `const ${node.name.text}=Icons.${node.propertyName?.text || node.name.text};`).join("\n");
  return `function ${name}({hidden}){
    ${aliases}
    const [activeTab,setActiveTab]=React.useState("overview");
    const [currentSection,setCurrentSection]=React.useState("overview");
    const [activeProfileTab,changeProfileTab]=React.useState("overview");
    const isBrewModalOpen=hidden, isAnyModalOpen=hidden, isProfileModalOpen=hidden;
    const setMobileMenuOpen=value=>window.moreOpened=value;
    ${declarations.join("\n")}
    return ${dock};
  }`;
}

const ownerComponents = await Promise.all([
  extractDock("client/src/pages/brewery-dashboard.tsx", "BreweryDock"),
  extractDock("client/src/pages/smart-pub-dashboard.tsx", "PubOwnerDock"),
  extractDock("client/src/pages/user-profile-new.tsx", "ProfileDock"),
]);
const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import React from "react";
    import { createRoot } from "react-dom/client";
    import * as Icons from "lucide-react";
    import { QueryClient,QueryClientProvider } from "@tanstack/react-query";
    import { BottomNavigation,BottomNavProvider } from "./client/src/components/bottom-navigation";
    import StickyPubTabs from "./client/src/components/pub/StickyPubTabs";
    import { FloatingBottomBar } from "./client/src/components/floating-bottom-bar";
    ${ownerComponents.join("\n")}
    const client=new QueryClient({defaultOptions:{queries:{retry:false,queryFn:async()=>null}}});
    client.setQueryData(["/api/auth/user"],null);
    function App(){
      const mode=new URLSearchParams(location.search).get("mode");
      const [hidden,setHidden]=React.useState(false),[tab,setTab]=React.useState("overview");
      window.hideNav=setHidden;
      const tabs=[
        {value:"overview",label:"Panoramica",icon:<Icons.Home/>},
        {value:"taplist",label:"Spine",icon:<Icons.Beer/>},
        {value:"bottles",label:"Cantina",icon:<Icons.Wine/>},
        {value:"drinks",label:"Bevande",icon:<Icons.CupSoda/>},
        {value:"menu",label:"Menu",icon:<Icons.Utensils/>}
      ];
      return <QueryClientProvider client={client}><BottomNavProvider>
        <main className="main-content-pb" style={{minHeight:1800}}>Contenuti della pagina</main>
        {mode==="global"?<BottomNavigation/>:mode==="pub"?<StickyPubTabs tabs={tabs} activeTab={tab} onTabChange={setTab}/>:
          mode==="brewery"?<BreweryDock hidden={hidden}/>:mode==="pub-owner"?<PubOwnerDock hidden={hidden}/>:<ProfileDock hidden={hidden}/>}
      </BottomNavProvider></QueryClientProvider>;
    }
    createRoot(document.getElementById("root")).render(<App/>);
  ` },
  bundle: true, write: false, format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "import.meta.env": "{}" },
});
const styles = (await Promise.all((await readdir("dist/public/assets")).filter(name=>name.endsWith(".css"))
  .map(name=>readFile(`dist/public/assets/${name}`,"utf8")))).join("\n");
const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || execFileSync("which",["chromium"],{encoding:"utf8"}).trim(), headless:true,args:["--no-sandbox"] });
const errors=[];
try {
  const page=await browser.newPage();
  page.on("pageerror",error=>errors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request",request=>request.isNavigationRequest()?request.respond({status:200,contentType:"text/html",body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>'}):request.abort());
  for(const dark of [false,true]) for(const width of [320,390,412]){
    for(const mode of ["global","pub","brewery","pub-owner","profile"]){
      await page.setViewport({width,height:874,isMobile:true,hasTouch:true,deviceScaleFactor:1});
      await page.goto(`http://navigation.test/?mode=${mode}`);
      await page.addStyleTag({content:styles});
      await page.evaluate(dark=>{
        document.documentElement.classList.toggle("dark",dark);
        document.documentElement.style.setProperty("--frozen-sab","34px");
      },dark);
      await page.addScriptTag({content:bundle.outputFiles[0].text});
      await page.waitForSelector("[data-floating-bottom-bar]");
      const state=await page.$eval("[data-floating-bottom-bar]",nav=>{
        const rect=nav.getBoundingClientRect(),css=getComputedStyle(nav);
        const buttons=[...nav.querySelectorAll("[data-nav-item]")];
        const active=buttons.find(button=>button.dataset.active==="true");
        const inactive=buttons.find(button=>button.dataset.active!=="true");
        return {
          count:buttons.length,height:rect.height,
          fits:rect.left>=10&&rect.right<=innerWidth-10,
          gap:innerHeight-rect.bottom,
          transform:css.transform,blur:css.backdropFilter,
          labels:buttons.every(button=>Boolean(button.getAttribute("aria-label"))&&Boolean(button.title)),
          iconOnly:buttons.every(button=>{
            const label=button.querySelector(".sr-only");
            return label&&label.getBoundingClientRect().width<=1&&Boolean(button.querySelector("svg,img"));
          }),
          touch:buttons.every(button=>button.getBoundingClientRect().height>=44&&button.getBoundingClientRect().width>=44),
          activeVisible:active&&getComputedStyle(active).color!==getComputedStyle(inactive).color&&getComputedStyle(active).backgroundColor!=="rgba(0, 0, 0, 0)",
        };
      });
      assert.ok(state.count>=4&&state.count<=5);
      assert.ok(state.height>=52&&state.height<=60,`Compact bar ${mode}: ${state.height}`);
      assert.equal(state.gap,46,"Frozen inset applied once plus 12px gap");
      for(const key of ["fits","labels","iconOnly","touch","activeVisible"]) assert.equal(state[key],true,`${mode}: ${key}`);
      assert.equal(state.transform,"none"); assert.equal(state.blur,"none");
      if(mode==="global"){
        assert.equal(await page.$eval('[data-nav-item="search"]',node=>node.getAttribute("href")),"/search");
        assert.equal(await page.$eval('[data-nav-item="account"]',node=>node.getAttribute("href")),"/login");
      }else{
        const second='[data-floating-bottom-bar] [data-nav-item]:nth-child(2)';
        await page.click(second);
        assert.equal(await page.$eval(second,node=>node.getAttribute("aria-selected")),"true");
        await page.keyboard.press("ArrowRight");
        assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('[data-floating-bottom-bar] [data-nav-item]:nth-child(3)')),true);
        await page.keyboard.press("Enter");
        assert.equal(await page.$eval('[data-floating-bottom-bar] [data-nav-item]:nth-child(3)',node=>node.getAttribute("aria-selected")),"true");
        if(mode==="pub-owner"){
          await page.click('[data-testid="smartpub-dock-more"]');
          assert.equal(await page.evaluate(()=>window.moreOpened),true);
        }
        if(mode!=="pub"){
          await page.evaluate(()=>window.hideNav(true));
          await page.waitForFunction(()=>getComputedStyle(document.querySelector("[data-floating-bottom-bar]")).visibility==="hidden");
          await page.evaluate(()=>window.hideNav(false));
          await page.waitForFunction(()=>getComputedStyle(document.querySelector("[data-floating-bottom-bar]")).visibility!=="hidden");
        }
      }
      console.log(`PASS ${mode}: ${width}px ${dark?"dark":"light"}, floating56px, icon-only, routes/tabs, keyboard and native inset`);
    }
  }
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
