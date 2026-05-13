import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Copy, Check, Trash2, RefreshCw, ExternalLink,
  MessageCircle, Send, AlertCircle, CheckCircle2
} from "lucide-react";

interface BotStatus {
  telegram: boolean;
  whatsapp: boolean;
  telegramBotUsername: string | null;
  whatsappPhoneDisplay: string | null;
}

interface BotConnection {
  id: number;
  platform: string;
  chatId: string;
  displayName: string | null;
  createdAt: string;
}

interface Props {
  pubId?: number;
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "telegram") return <Send className="w-4 h-4 text-sky-500" />;
  return <MessageCircle className="w-4 h-4 text-emerald-500" />;
}

export default function BotConnectCard({ pubId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedToken, setCopiedToken] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"telegram" | "whatsapp">("telegram");

  const { data: status } = useQuery<BotStatus>({
    queryKey: ["/api/bot/status"],
    staleTime: 60 * 1000,
  });

  const { data: connections = [], isLoading } = useQuery<BotConnection[]>({
    queryKey: ["/api/bot/connections"],
    staleTime: 30 * 1000,
  });

  const generateToken = useMutation({
    mutationFn: () => apiRequest("/api/bot/link-token", { method: "POST" }, pubId ? { pubId } : {}),
    onSuccess: (data: any) => {
      setGeneratedToken(data.token);
    },
    onError: () => toast({ title: "Errore nella generazione del codice", variant: "destructive" }),
  });

  const unlinkMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/bot/connections/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bot/connections"] });
      toast({ title: "Bot scollegato" });
    },
  });

  const copyToken = async () => {
    if (!generatedToken) return;
    await navigator.clipboard.writeText(generatedToken).catch(() => {});
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const telegramConn = connections.find(c => c.platform === "telegram");
  const whatsappConn = connections.find(c => c.platform === "whatsapp");

  const telegramUsername = status?.telegramBotUsername;
  const whatsappPhone = status?.whatsappPhoneDisplay;

  return (
    <div className="space-y-4">
      {/* Connessioni attive */}
      {connections.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Bot collegati</p>
          {connections.map(conn => (
            <div key={conn.id} className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <PlatformIcon platform={conn.platform} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm capitalize">{conn.platform}</p>
                <p className="text-xs text-stone-500 truncate">{conn.displayName || conn.chatId}</p>
              </div>
              <Badge variant="secondary" className="text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Attivo
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unlinkMutation.mutate(conn.id)}
                disabled={unlinkMutation.isPending}
                className="text-stone-400 hover:text-red-500 h-8 w-8 p-0 rounded-xl"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Tab Telegram / WhatsApp */}
      <div className="flex bg-stone-100 dark:bg-[#1B2735]/60 rounded-2xl p-1 gap-1">
        {(["telegram", "whatsapp"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab
                ? "bg-white dark:bg-[#232F3D] text-foreground shadow-sm"
                : "text-stone-400 dark:text-stone-500"
            }`}
          >
            {tab === "telegram"
              ? <><Send className="w-3.5 h-3.5" /> Telegram</>
              : <><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</>}
          </button>
        ))}
      </div>

      {/* Contenuto Telegram */}
      {activeTab === "telegram" && (
        <div className="space-y-3">
          {!status?.telegram ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Bot Telegram non configurato</p>
                <p>L'admin deve impostare <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">TELEGRAM_BOT_TOKEN</code> e <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">TELEGRAM_BOT_USERNAME</code> nelle variabili di ambiente.</p>
              </div>
            </div>
          ) : telegramConn ? (
            <p className="text-sm text-stone-500 text-center py-2">✅ Telegram già collegato come <strong>{telegramConn.displayName}</strong></p>
          ) : (
            <>
              <div className="text-sm text-stone-600 dark:text-stone-400 space-y-2">
                <p className="font-semibold">Come collegare Telegram:</p>
                <ol className="space-y-1.5 text-xs text-stone-500 list-decimal list-inside">
                  <li>Genera un codice qui sotto (valido 15 minuti)</li>
                  <li>Apri il bot Telegram{telegramUsername ? <> <a href={`https://t.me/${telegramUsername.replace("@","")}`} target="_blank" rel="noopener noreferrer" className="text-sky-500 font-semibold hover:underline">{telegramUsername}</a></> : ""}</li>
                  <li>Invia il messaggio: <code className="bg-stone-100 dark:bg-[#1B2735] px-1 rounded">/start [codice]</code></li>
                </ol>
              </div>

              {generatedToken ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stone-500">Il tuo codice (valido 15 min):</p>
                  <div
                    className="flex items-center gap-2 p-3 bg-stone-100 dark:bg-[#1B2735] rounded-xl cursor-pointer"
                    onClick={copyToken}
                  >
                    <code className="flex-1 text-xs font-mono text-primary break-all">{generatedToken}</code>
                    {copiedToken
                      ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <Copy className="w-4 h-4 text-stone-400 flex-shrink-0" />}
                  </div>
                  {telegramUsername && (
                    <a
                      href={`https://t.me/${telegramUsername.replace("@","")}?start=${generatedToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="w-full gap-2 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl">
                        <Send className="w-4 h-4" />
                        Apri Telegram e collega
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateToken.mutate()}
                    disabled={generateToken.isPending}
                    className="w-full text-xs rounded-xl"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Rigenera codice
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => generateToken.mutate()}
                  disabled={generateToken.isPending}
                  className="w-full gap-2 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl"
                >
                  {generateToken.isPending
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                  Genera codice di collegamento
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Contenuto WhatsApp */}
      {activeTab === "whatsapp" && (
        <div className="space-y-3">
          {!status?.whatsapp ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">WhatsApp Business non configurato</p>
                <p>Richiede un account Meta Business con WhatsApp API. Contatta l'admin per abilitarlo.</p>
              </div>
            </div>
          ) : whatsappConn ? (
            <p className="text-sm text-stone-500 text-center py-2">✅ WhatsApp già collegato ({whatsappConn.displayName || whatsappConn.chatId})</p>
          ) : (
            <>
              <div className="text-sm text-stone-600 dark:text-stone-400 space-y-2">
                <p className="font-semibold">Come collegare WhatsApp:</p>
                <ol className="space-y-1.5 text-xs text-stone-500 list-decimal list-inside">
                  <li>Genera un codice qui sotto (valido 15 minuti)</li>
                  <li>Invia il codice su WhatsApp{whatsappPhone ? <> al numero <strong>{whatsappPhone}</strong></> : ""}</li>
                  <li>Il bot risponde con la conferma</li>
                </ol>
              </div>

              {generatedToken ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stone-500">Il tuo codice (valido 15 min):</p>
                  <div
                    className="flex items-center gap-2 p-3 bg-stone-100 dark:bg-[#1B2735] rounded-xl cursor-pointer"
                    onClick={copyToken}
                  >
                    <code className="flex-1 text-xs font-mono text-primary break-all">{generatedToken}</code>
                    {copiedToken
                      ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <Copy className="w-4 h-4 text-stone-400 flex-shrink-0" />}
                  </div>
                  {whatsappPhone && (
                    <a
                      href={`https://wa.me/${whatsappPhone.replace(/\D/g,"")}?text=${encodeURIComponent(generatedToken)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl">
                        <MessageCircle className="w-4 h-4" />
                        Apri WhatsApp e invia
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateToken.mutate()}
                    disabled={generateToken.isPending}
                    className="w-full text-xs rounded-xl"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Rigenera codice
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => generateToken.mutate()}
                  disabled={generateToken.isPending}
                  className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl"
                >
                  {generateToken.isPending
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <MessageCircle className="w-4 h-4" />}
                  Genera codice di collegamento
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Esempio comandi */}
      <div className="p-3 bg-stone-50 dark:bg-[#1B2735]/40 rounded-2xl border border-stone-100 dark:border-[#2F3D4D]/50">
        <p className="text-xs font-bold text-stone-500 mb-2">Esempi comandi:</p>
        <div className="space-y-1 text-xs text-stone-500 font-mono">
          {[
            "cambia Weizen con Hazy IPA di Birrificio X",
            "nascondi Pilsner",
            "prezzo Pale Ale: piccola 3.5 media 5",
            "togli cipolle caramellate da tutti i prodotti",
            "togli pancetta da Burger, Club Sandwich",
            "aggiungi rucola a Tagliere, Bruschetta",
            "birre  →  taplist  |  menu  →  menu cibo",
          ].map(ex => (
            <p key={ex} className="text-[11px] text-stone-400">→ <span className="text-stone-600 dark:text-stone-300">{ex}</span></p>
          ))}
        </div>
      </div>
    </div>
  );
}
