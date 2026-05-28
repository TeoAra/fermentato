import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Droplets, Plus, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface PubLineCleaningProps {
  pubId: number;
  tapList: any[];
}

function cleaningBadge(daysSince: number | null) {
  if (daysSince === null) return { label: "Mai lavata", color: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400", urgent: true };
  if (daysSince >= 14) return { label: `${daysSince}gg — URGENTE`, color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400", urgent: true };
  if (daysSince >= 7) return { label: `${daysSince}gg`, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400", urgent: false };
  return { label: `${daysSince}gg`, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400", urgent: false };
}

export default function PubLineCleaning({ pubId, tapList }: PubLineCleaningProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cleaningForm, setCleaningForm] = useState<{ tapNumber: string; tapType: string; lineName: string; notes: string } | null>(null);

  const { data: cleanings = [] } = useQuery<any[]>({
    queryKey: ["/api/pubs", String(pubId), "tap-cleanings"],
    queryFn: () => apiRequest(`/api/pubs/${pubId}/tap-cleanings`),
    enabled: !!pubId,
    staleTime: 30000,
  });

  const addCleaningMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/pubs/${pubId}/tap-cleanings`, { method: "POST" }, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pubs", String(pubId), "tap-cleanings"] });
      setCleaningForm(null);
      toast({ title: "Lavaggio registrato!" });
    },
  });

  const lastCleaningByTap: Record<string, Date> = {};
  (cleanings as any[]).forEach((c: any) => {
    const key = c.tap_number != null ? String(c.tap_number) : c.tap_type ?? "—";
    const d = new Date(c.cleaned_at);
    if (!lastCleaningByTap[key] || d > lastCleaningByTap[key]) lastCleaningByTap[key] = d;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500" />
          Lavaggi linee
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-stone-200 rounded-xl text-xs"
          onClick={() => setCleaningForm(cleaningForm ? null : { tapNumber: "", tapType: "spina", lineName: "", notes: "" })}
        >
          <Plus className="h-3.5 w-3.5" />
          Registra lavaggio
        </Button>
      </div>

      {cleaningForm && (
        <Card className="border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            Registra nuovo lavaggio
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1 block">N° Spina</Label>
              <Input
                type="number" min="1" placeholder="Es: 1"
                value={cleaningForm.tapNumber}
                onChange={(e) => setCleaningForm({ ...cleaningForm, tapNumber: e.target.value })}
                className="h-9 border-stone-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block">Tipo linea</Label>
              <Select value={cleaningForm.tapType} onValueChange={(v) => setCleaningForm({ ...cleaningForm, tapType: v })}>
                <SelectTrigger className="h-9 border-stone-200 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="spina">Spina</SelectItem>
                  <SelectItem value="pompa">Pompa</SelectItem>
                  <SelectItem value="botte">Botte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block">Nome linea (opzionale)</Label>
            <Input
              placeholder="Es: Spina 1 – IPA del mese"
              value={cleaningForm.lineName}
              onChange={(e) => setCleaningForm({ ...cleaningForm, lineName: e.target.value })}
              className="h-9 border-stone-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block">Note</Label>
            <Textarea
              placeholder="Prodotto usato, osservazioni..."
              value={cleaningForm.notes}
              onChange={(e) => setCleaningForm({ ...cleaningForm, notes: e.target.value })}
              className="border-stone-200 rounded-xl text-sm resize-none"
              rows={2}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="border-stone-200 rounded-xl" onClick={() => setCleaningForm(null)}>
              Annulla
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              disabled={addCleaningMutation.isPending}
              onClick={() => addCleaningMutation.mutate({
                tapNumber: cleaningForm.tapNumber ? parseInt(cleaningForm.tapNumber) : null,
                tapType: cleaningForm.tapType,
                lineName: cleaningForm.lineName || null,
                notes: cleaningForm.notes || null,
              })}
            >
              <Droplets className="h-3.5 w-3.5 mr-1.5" />
              Registra
            </Button>
          </div>
        </Card>
      )}

      {/* Per-tap cleaning status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tapList.map((tap: any) => {
          const key = tap.tapNumber != null ? String(tap.tapNumber) : tap.tapType ?? "—";
          const lastCleaned = lastCleaningByTap[key] ?? null;
          const daysSince = lastCleaned ? differenceInDays(new Date(), lastCleaned) : null;
          const badge = cleaningBadge(daysSince);
          const beerName = tap.beer?.name || tap.beerName || "Spina vuota";
          return (
            <Card key={tap.id} className={`p-3.5 border-stone-200 dark:border-white/[0.06] ${badge.urgent ? 'ring-1 ring-red-200 dark:ring-red-800/40' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {tap.tapNumber && <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Spina {tap.tapNumber}</span>}
                    {badge.urgent && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate mt-0.5">{beerName}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Droplets className="h-3 w-3 text-muted-foreground/60" />
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                  </div>
                  {lastCleaned && <p className="text-[10px] text-muted-foreground mt-0.5">{format(lastCleaned, "dd/MM/yyyy HH:mm")}</p>}
                </div>
                <Button
                  size="sm" variant="outline"
                  className="h-7 px-2 text-[10px] border-stone-200 rounded-lg flex-shrink-0"
                  onClick={() => setCleaningForm({
                    tapNumber: tap.tapNumber ? String(tap.tapNumber) : "",
                    tapType: tap.tapType || "spina",
                    lineName: tap.tapNumber ? `Spina ${tap.tapNumber} – ${beerName}` : beerName,
                    notes: "",
                  })}
                >
                  <Droplets className="h-3 w-3 mr-1" />
                  Lava
                </Button>
              </div>
            </Card>
          );
        })}
        {tapList.length === 0 && (
          <Card className="p-6 col-span-full border-stone-200 dark:border-white/[0.06] text-center">
            <p className="text-sm text-muted-foreground">Nessuna spina attiva nella taplist</p>
          </Card>
        )}
      </div>

      {/* Cleaning history */}
      {(cleanings as any[]).length > 0 && (
        <Card className="border-stone-200 dark:border-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-white/[0.04] flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">Storico lavaggi</h4>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-white/[0.04]">
            {(cleanings as any[]).slice(0, 20).map((c: any) => (
              <div key={c.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  <div>
                    <span className="text-sm text-foreground font-medium">
                      {c.line_name || (c.tap_number ? `Spina ${c.tap_number}` : c.tap_type || "Linea")}
                    </span>
                    {c.notes && <p className="text-xs text-muted-foreground mt-0.5">{c.notes}</p>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(c.cleaned_at), "dd/MM/yy HH:mm")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
