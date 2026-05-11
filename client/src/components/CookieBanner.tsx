import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, X, ChevronDown, ChevronUp, Shield, BarChart3, Target, Settings2 } from "lucide-react";

const STORAGE_KEY = "fermenta_cookie_consent";

interface CookiePreferences {
  essential: boolean;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  preferences: false,
  analytics: false,
  marketing: false,
};

function loadPreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePreferences(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("cookieConsentUpdated", { detail: prefs }));
}

export function getCookiePreferences(): CookiePreferences | null {
  return loadPreferences();
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const existing = loadPreferences();
    if (!existing) {
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    const all = { essential: true, preferences: true, analytics: true, marketing: true };
    savePreferences(all);
    setVisible(false);
  };

  const acceptEssential = () => {
    const min = { essential: true, preferences: false, analytics: false, marketing: false };
    savePreferences(min);
    setVisible(false);
  };

  const saveCustom = () => {
    savePreferences({ ...prefs, essential: true });
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-3 md:p-6 pb-[calc(64px+env(safe-area-inset-bottom)+8px)] lg:pb-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Main banner */}
        {!showSettings ? (
          <div className="p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                <Cookie className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-foreground dark:text-white mb-1">
                  🍪 Utilizziamo i cookie
                </h3>
                <p className="text-sm text-muted-foreground dark:text-stone-300 leading-relaxed">
                  Usiamo cookie e tecnologie simili per migliorare la tua esperienza, analizzare il traffico e personalizzare i contenuti. 
                  Puoi scegliere quali accettare o consultare la nostra{" "}
                  <a href="/privacy" className="text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-700">
                    Privacy Policy
                  </a>.
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    onClick={acceptAll}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-sm h-9 px-4"
                  >
                    Accetta tutti
                  </Button>
                  <Button
                    onClick={acceptEssential}
                    variant="outline"
                    className="text-sm h-9 px-4"
                  >
                    Solo essenziali
                  </Button>
                  <Button
                    onClick={() => setShowSettings(true)}
                    variant="ghost"
                    className="text-sm h-9 px-4 text-muted-foreground dark:text-stone-300"
                  >
                    <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                    Personalizza
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Detailed settings panel */
          <div className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <Settings2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-base font-bold text-foreground dark:text-white">Impostazioni Cookie</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Essential */}
              <CookieCategory
                icon={<Shield className="w-4 h-4 text-green-600" />}
                color="green"
                title="Cookie Essenziali"
                badge="Sempre attivi"
                description="Indispensabili per il funzionamento del sito: gestione sessione, sicurezza, preferenze di base. Non possono essere disattivati."
                details={[
                  "Sessione utente autenticata",
                  "Protezione CSRF e sicurezza",
                  "Preferenze lingua e tema",
                  "Carrello e contenuti salvati temporaneamente",
                ]}
                checked={true}
                disabled={true}
                onChange={() => {}}
              />

              {/* Preferences */}
              <CookieCategory
                icon={<Settings2 className="w-4 h-4 text-blue-600" />}
                color="blue"
                title="Cookie di Preferenze"
                badge="Opzionali"
                description="Permettono al sito di ricordare le tue scelte (lista in criteri di ricerca, filtri, layout) per offrire un'esperienza personalizzata."
                details={[
                  "Ricordare le tue preferenze di ricerca",
                  "Salvataggio filtri e ordinamento",
                  "Preferenze di visualizzazione (lista/griglia)",
                  "Ultima posizione nella navigazione",
                ]}
                checked={prefs.preferences}
                onChange={(v) => setPrefs(p => ({ ...p, preferences: v }))}
              />

              {/* Analytics */}
              <CookieCategory
                icon={<BarChart3 className="w-4 h-4 text-purple-600" />}
                color="purple"
                title="Cookie Analitici"
                badge="Opzionali"
                description="Ci aiutano a capire come gli utenti interagiscono con il sito tramite Google Analytics. I dati sono aggregati e anonimi."
                details={[
                  "Google Analytics 4 (traffico e comportamento)",
                  "Pagine più visitate e percorsi di navigazione",
                  "Tempo di permanenza e frequenza di rimbalzo",
                  "Provenienza geografica aggregata",
                ]}
                checked={prefs.analytics}
                onChange={(v) => setPrefs(p => ({ ...p, analytics: v }))}
              />

              {/* Marketing */}
              <CookieCategory
                icon={<Target className="w-4 h-4 text-red-600" />}
                color="red"
                title="Cookie di Marketing"
                badge="Opzionali"
                description="Utilizzati per mostrare contenuti promozionali rilevanti per i tuoi interessi e per misurare l'efficacia delle campagne."
                details={[
                  "Profilazione per pubblicità pertinente",
                  "Pixel di tracciamento per retargeting",
                  "Misurazione conversioni campagne",
                  "Condivisione dati con partner pubblicitari",
                ]}
                checked={prefs.marketing}
                onChange={(v) => setPrefs(p => ({ ...p, marketing: v }))}
              />
            </div>

            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button onClick={saveCustom} className="bg-amber-500 hover:bg-amber-600 text-white text-sm h-9 px-4">
                Salva preferenze
              </Button>
              <Button onClick={acceptAll} variant="outline" className="text-sm h-9 px-4">
                Accetta tutti
              </Button>
              <Button onClick={acceptEssential} variant="ghost" className="text-sm h-9 px-3 text-muted-foreground">
                Solo essenziali
              </Button>
            </div>
            <p className="text-xs text-stone-400 mt-3">
              Puoi modificare le preferenze in qualsiasi momento dal footer del sito.
              Consulta la nostra <a href="/privacy" className="underline underline-offset-1">Privacy Policy</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CookieCategory({
  icon, color, title, badge, description, details, checked, disabled, onChange,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  badge: string;
  description: string;
  details: string[];
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const colorMap: Record<string, string> = {
    green: "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800",
    blue: "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800",
    purple: "bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800",
    red: "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.green}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground dark:text-white">{title}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                disabled
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-stone-100 text-muted-foreground dark:bg-gray-800 dark:text-stone-400"
              }`}>
                {badge}
              </span>
            </div>
            <p className="text-xs text-muted-foreground dark:text-stone-400 mt-1 leading-relaxed">{description}</p>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground dark:text-stone-400 mt-1.5 hover:text-muted-foreground dark:hover:text-gray-200 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? "Meno dettagli" : "Dettagli"}
            </button>
            {expanded && (
              <ul className="mt-2 space-y-0.5">
                {details.map((d, i) => (
                  <li key={i} className="text-xs text-muted-foreground dark:text-stone-400 flex items-start gap-1.5">
                    <span className="mt-1 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          className="flex-shrink-0 mt-0.5"
        />
      </div>
    </div>
  );
}

export function CookieSettingsButton() {
  const reopen = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };
  return (
    <button onClick={reopen} className="text-xs text-muted-foreground hover:text-muted-foreground dark:hover:text-stone-300 underline underline-offset-2">
      Gestisci preferenze cookie
    </button>
  );
}
