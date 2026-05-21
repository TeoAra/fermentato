import { DEFAULT_LOCALE } from "./locale";
import type { Device, ProjectState, Slide } from "./types";

let _id = 0;
export const nid = () => `s_${Date.now().toString(36)}_${(_id++).toString(36)}`;

const it = (s: string) => ({ it: s });

type Seed = {
  layout: Slide["layout"];
  label: string;
  headline: string;
  screenshot: string;
  inverted?: boolean;
};

function build(seeds: Seed[]): Slide[] {
  return seeds.map(s => ({
    id: nid(),
    layout: s.layout,
    label: it(s.label),
    headline: it(s.headline),
    screenshot: s.screenshot,
    inverted: s.inverted,
  }));
}

const PHONE_SEEDS: Seed[] = [
  {
    layout: "hero",
    label: "BENVENUTO",
    headline: "Trova la birra\nperfetta.",
    screenshot: "/screenshots/{platform}/{device}/{locale}/01.png",
  },
  {
    layout: "device-bottom",
    label: "PUB & LOCALI",
    headline: "I migliori pub\nartigianali.",
    screenshot: "/screenshots/{platform}/{device}/{locale}/02.png",
  },
  {
    layout: "device-top",
    label: "CATALOGO",
    headline: "Oltre 1 milione\ndi birre.",
    screenshot: "/screenshots/{platform}/{device}/{locale}/03.png",
    inverted: true,
  },
  {
    layout: "device-bottom",
    label: "EVENTI",
    headline: "Mai più senza\nun evento.",
    screenshot: "/screenshots/{platform}/{device}/{locale}/04.png",
  },
  {
    layout: "hero",
    label: "FESTIVAL MODE",
    headline: "Il tuo festival\ndigitale.",
    screenshot: "/screenshots/{platform}/{device}/{locale}/05.png",
  },
  {
    layout: "device-top",
    label: "OGNI BIRRA",
    headline: "Recensisci,\nsalva, condividi.",
    screenshot: "/screenshots/{platform}/{device}/{locale}/06.png",
    inverted: true,
  },
];

function iphoneSlides(): Slide[] {
  return build(PHONE_SEEDS.map(s => ({
    ...s,
    screenshot: s.screenshot.replace("{platform}", "apple").replace("{device}", "iphone"),
  })));
}

function androidSlides(): Slide[] {
  return build(PHONE_SEEDS.map(s => ({
    ...s,
    screenshot: s.screenshot.replace("{platform}", "android").replace("{device}", "phone"),
  })));
}

function ipadStarter(): Slide[] {
  return build([
    {
      layout: "hero",
      label: "BENVENUTO",
      headline: "Trova la birra\nperfetta.",
      screenshot: "/screenshots/apple/ipad/{locale}/01.png",
    },
    {
      layout: "device-bottom",
      label: "CATALOGO",
      headline: "Oltre 1 milione\ndi birre artigianali.",
      screenshot: "/screenshots/apple/ipad/{locale}/02.png",
    },
    {
      layout: "device-top",
      label: "FESTIVAL MODE",
      headline: "Il tuo festival\ndigitale.",
      screenshot: "/screenshots/apple/ipad/{locale}/03.png",
      inverted: true,
    },
  ]);
}

function tabletStarter(device: "tablet-7" | "tablet-10"): Slide[] {
  const base = `/android/${device}/it`;
  return build([
    {
      layout: "hero",
      label: "FERMENTA.TO",
      headline: "Trova la birra\nperfetta.",
      screenshot: `${base}/01.png`,
    },
    {
      layout: "split-landscape",
      label: "PUB & LOCALI",
      headline: "I migliori pub\nartigianali vicino a te.",
      screenshot: `${base}/02.png`,
    },
    {
      layout: "device-top",
      label: "CATALOGO",
      headline: "Oltre 1 milione\ndi birre.",
      screenshot: `${base}/03.png`,
      inverted: true,
    },
    {
      layout: "device-bottom",
      label: "EVENTI",
      headline: "Mai più senza\nun evento.",
      screenshot: `${base}/04.png`,
    },
    {
      layout: "hero",
      label: "FESTIVAL MODE",
      headline: "Il tuo festival\ndigitale.",
      screenshot: `${base}/05.png`,
    },
    {
      layout: "device-top",
      label: "OGNI BIRRA",
      headline: "Recensisci,\nsalva, condividi.",
      screenshot: `${base}/06.png`,
      inverted: true,
    },
  ]);
}

function fgStarter(): Slide[] {
  return build([
    {
      layout: "feature-graphic",
      label: "",
      headline: "Fermenta.to — la birra artigianale, in tasca.",
      screenshot: "",
    },
  ]);
}

export const DEFAULT_PROJECT: ProjectState = {
  appName: "Fermenta.to",
  themeId: "fermenta-orange",
  locales: ["it"],
  locale: "it",
  device: "iphone",
  orientation: "portrait",
  appIcon: "/app-icon.png",
  slidesByDevice: {
    iphone: iphoneSlides(),
    android: androidSlides(),
    ipad: ipadStarter(),
    "android-7": tabletStarter("tablet-7"),
    "android-10": tabletStarter("tablet-10"),
    "feature-graphic": fgStarter(),
  },
};

export function newSlide(layout: Slide["layout"] = "device-bottom"): Slide {
  return {
    id: nid(),
    layout,
    label: it("NUOVO"),
    headline: it("Modifica\nquesta scritta."),
    screenshot: "",
  };
}

export function detectPlatform(device: Device): "ios" | "android" {
  return device === "iphone" || device === "ipad" ? "ios" : "android";
}
