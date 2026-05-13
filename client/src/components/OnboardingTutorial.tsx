import { useEffect, useState } from "react";
import {
  Beer,
  MapPin,
  Star,
  Camera,
  Calendar,
  Building2,
  Store,
  ListPlus,
  QrCode,
  Bell,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";

const STORAGE_KEY = "fermenta-onboarding-v1";

type Slide = {
  icon: LucideIcon;
  badge: string;
  title: string;
  body: string;
  tone: "amber" | "blue" | "violet" | "emerald" | "rose";
};

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    badge: "Benvenuto",
    title: "Benvenuto su Fermenta.to",
    body: "La community italiana della birra artigianale. Scopri pub, birrifici e birre vicino a te, registra le tue bevute e segui gli eventi del settore.",
    tone: "amber",
  },
  {
    icon: MapPin,
    badge: "Per chi beve",
    title: "Trova pub e birre vicino a te",
    body: "Cerca pub e birrifici sulla mappa, filtra per stile, prezzo e distanza. Usa Sorprendimi per scoprire una birra a caso dal nostro catalogo da oltre 1M di referenze.",
    tone: "blue",
  },
  {
    icon: Star,
    badge: "Per chi beve",
    title: "Recensisci e tieni traccia",
    body: "Recensisci le birre in stile Untappd, scatta una foto del check-in e crea il tuo storico bevute. Segui altri utenti e vedi cosa stanno bevendo in tempo reale.",
    tone: "violet",
  },
  {
    icon: Camera,
    badge: "Scan",
    title: "Scansiona etichetta o codice a barre",
    body: "Inquadra una bottiglia con la fotocamera: riconosciamo automaticamente birra e birrificio combinando AI visiva, OCR e database mondiale Open Food Facts.",
    tone: "emerald",
  },
  {
    icon: Store,
    badge: "Per i publican",
    title: "Gestisci pub, taplist e menu",
    body: "Se hai un locale, registralo gratis. Dal dashboard aggiorni la spina, il menu food, gli orari e i prezzi. Tutto sincronizzato in tempo reale per i clienti.",
    tone: "amber",
  },
  {
    icon: Building2,
    badge: "Per i birrifici",
    title: "Pubblica le tue birre",
    body: "Se sei un birrificio, gestisci la pagina, carica le birre prodotte, statistiche di consumo nei pub partner e ricevi recensioni dirette dai clienti.",
    tone: "rose",
  },
  {
    icon: Bell,
    badge: "Bot Telegram & WhatsApp",
    title: "Aggiorna la taplist da chat",
    body: "Collega il bot dal dashboard e gestisci spina, prezzi e disponibilità scrivendo in italiano: cambia birra, nascondi spina 3, aggiorna prezzo da 4 a 5 euro.",
    tone: "blue",
  },
  {
    icon: Calendar,
    badge: "Eventi",
    title: "Crea e promuovi eventi",
    body: "Pub e birrifici possono pubblicare eventi (degustazioni, presentazioni, festival): vengono mostrati nell'hub eventi e gli utenti ricevono notifica push all'inizio.",
    tone: "violet",
  },
  {
    icon: QrCode,
    badge: "Festival mode",
    title: "Modalità festival con QR",
    body: "Per i festival è disponibile una taplist digitale dedicata: gli utenti scansionano un QR, vedono le birre disponibili, possono pagare via Stripe e lasciare voti.",
    tone: "emerald",
  },
  {
    icon: ListPlus,
    badge: "Tutto pronto",
    title: "Sei pronto a partire",
    body: "Esplora la home per iniziare. Puoi rivedere questo tutorial in qualsiasi momento dal menu laterale alla voce Rivedi tutorial.",
    tone: "amber",
  },
];

const toneClasses: Record<Slide["tone"], { bg: string; ring: string; text: string }> = {
  amber:   { bg: "bg-gradient-to-br from-amber-400 to-orange-500", ring: "ring-amber-200/40 dark:ring-amber-500/20", text: "text-orange-600 dark:text-amber-400" },
  blue:    { bg: "bg-gradient-to-br from-sky-400 to-blue-600",     ring: "ring-blue-200/40 dark:ring-blue-500/20",   text: "text-blue-600 dark:text-blue-400" },
  violet:  { bg: "bg-gradient-to-br from-violet-400 to-purple-600",ring: "ring-violet-200/40 dark:ring-violet-500/20",text: "text-violet-600 dark:text-violet-400" },
  emerald: { bg: "bg-gradient-to-br from-emerald-400 to-teal-600", ring: "ring-emerald-200/40 dark:ring-emerald-500/20",text: "text-emerald-600 dark:text-emerald-400" },
  rose:    { bg: "bg-gradient-to-br from-rose-400 to-pink-600",    ring: "ring-rose-200/40 dark:ring-rose-500/20",   text: "text-rose-600 dark:text-rose-400" },
};

interface OnboardingTutorialProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function OnboardingTutorial({ forceOpen, onClose }: OnboardingTutorialProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Mostra al primo avvio in app nativa o PWA installata.
  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
      const isStandalone =
        Capacitor.isNativePlatform?.() ||
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [forceOpen]);

  // Riapri il tutorial on-demand da qualsiasi punto dell'app via custom event
  useEffect(() => {
    const handler = () => { setStep(0); setOpen(true); };
    window.addEventListener("fermenta:open-onboarding", handler);
    return () => window.removeEventListener("fermenta:open-onboarding", handler);
  }, []);

  const close = () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    onClose?.();
  };

  if (!open) return null;

  const slide = SLIDES[step];
  const tone = toneClasses[slide.tone];
  const isLast = step === SLIDES.length - 1;
  const Icon = slide.icon;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        paddingLeft: "16px",
        paddingRight: "16px",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative w-full max-w-md max-h-full overflow-hidden rounded-3xl bg-background shadow-2xl flex flex-col">
        <button
          type="button"
          aria-label="Chiudi tutorial"
          onClick={close}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 flex items-center justify-center transition-colors"
          data-testid="button-onboarding-close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex-1 overflow-y-auto px-6 pt-10 pb-4 text-center">
          <div className={`mx-auto w-20 h-20 rounded-3xl ${tone.bg} ring-8 ${tone.ring} flex items-center justify-center shadow-lg`}>
            <Icon className="w-10 h-10 text-white" strokeWidth={2} />
          </div>

          <div className={`mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted ${tone.text} text-[11px] font-bold uppercase tracking-wider`}>
            {slide.badge}
          </div>

          <h2 id="onboarding-title" className="mt-3 text-2xl font-black text-foreground leading-tight">
            {slide.title}
          </h2>

          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {slide.body}
          </p>
        </div>

        <div className="px-6 pt-2 pb-5 border-t border-border/60 bg-background">
          <div className="flex items-center justify-center gap-1.5 mb-4" role="tablist">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button
                variant="ghost"
                onClick={() => setStep(s => Math.max(0, s - 1))}
                className="flex-1 rounded-2xl gap-1.5"
                data-testid="button-onboarding-prev"
              >
                <ChevronLeft className="w-4 h-4" />
                Indietro
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={close}
                className="flex-1 rounded-2xl text-muted-foreground"
                data-testid="button-onboarding-skip"
              >
                Salta
              </Button>
            )}
            {isLast ? (
              <Button
                onClick={close}
                className="flex-1 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-1.5"
                data-testid="button-onboarding-start"
              >
                Inizia
                <Sparkles className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setStep(s => Math.min(SLIDES.length - 1, s + 1))}
                className="flex-1 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-1.5"
                data-testid="button-onboarding-next"
              >
                Avanti
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function resetOnboarding() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
