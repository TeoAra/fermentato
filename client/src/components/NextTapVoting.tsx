import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { ThumbsUp, Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import BeerSearchCombobox from "@/components/BeerSearchCombobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NextTapVotingProps {
  pubId: number;
  isOwner?: boolean;
}

export function NextTapVoting({ pubId, isOwner }: NextTapVotingProps) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedBeer, setSelectedBeer] = useState<any>(null);

  const { data: proposals = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/pubs/${pubId}/next-tap`],
  });

  const voteMutation = useMutation({
    mutationFn: ({ proposalId, voted }: { proposalId: number; voted: boolean }) =>
      voted
        ? apiRequest("DELETE", `/api/next-tap/${proposalId}/vote`)
        : apiRequest("POST", `/api/next-tap/${proposalId}/vote`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${pubId}/next-tap`] });
    },
  });

  const addMutation = useMutation({
    mutationFn: (beerId: number) => apiRequest("POST", `/api/pubs/${pubId}/next-tap`, { beerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pubs/${pubId}/next-tap`] });
      setShowAdd(false);
      setSelectedBeer(null);
      toast({ title: "Proposta aggiunta!" });
    },
    onError: (e: any) => toast({ title: "Errore", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (proposalId: number) => apiRequest("DELETE", `/api/next-tap/${proposalId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/pubs/${pubId}/next-tap`] }),
  });

  if (isLoading) return null;

  const maxVotes = Math.max(...proposals.map((p: any) => parseInt(p.vote_count ?? 0)), 1);

  return (
    <div className="bg-white dark:bg-[#1A1D24] rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-stone-800 dark:text-stone-200 font-poppins text-sm flex items-center gap-1.5">
            🍺 Prossima Spina
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">Vota la birra che vuoi alla spina</p>
        </div>
        {isOwner && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs h-8"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Proponi
          </Button>
        )}
      </div>

      {proposals.length === 0 ? (
        <div className="px-4 pb-4 text-center py-6">
          <p className="text-sm text-stone-400">Nessuna proposta ancora</p>
          {isOwner && (
            <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Aggiungi la prima proposta
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-stone-50 dark:divide-[#12151A]">
          {proposals.map((proposal: any, index: number) => {
            const votes = parseInt(proposal.vote_count ?? 0);
            const voted = proposal.user_voted;
            const pct = Math.round((votes / maxVotes) * 100);
            return (
              <div key={proposal.id} className="px-4 py-3 flex items-center gap-3">
                <span className={cn("text-xs font-bold w-5 text-center", index === 0 ? "text-primary" : "text-stone-400")}>
                  {index + 1}
                </span>
                {proposal.beer_image ? (
                  <img src={proposal.beer_image} alt={proposal.beer_name} className="w-12 h-12 object-contain rounded-xl bg-stone-50 dark:bg-[#12151A] flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-[#12151A] flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-stone-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/beer/${proposal.beer_id}`}>
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-50 truncate">{proposal.beer_name}</p>
                  </Link>
                  <p className="text-xs text-stone-400">{proposal.brewery_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-stone-100 dark:bg-[#23262E] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", index === 0 ? "bg-primary" : "bg-stone-300 dark:bg-stone-600")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-400 shrink-0">{votes} {votes === 1 ? "voto" : "voti"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {isAuthenticated && (
                    <button
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90",
                        voted ? "bg-primary text-white" : "bg-stone-100 dark:bg-[#12151A] text-stone-400"
                      )}
                      onClick={() => voteMutation.mutate({ proposalId: proposal.id, voted })}
                      disabled={voteMutation.isPending}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                  )}
                  {isOwner && (
                    <button
                      className="w-8 h-8 rounded-full flex items-center justify-center text-red-300 active:scale-90"
                      onClick={() => deleteMutation.mutate(proposal.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add proposal dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="rounded-2xl mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-poppins">Proponi una birra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <BeerSearchCombobox
              value={selectedBeer}
              onChange={setSelectedBeer}
              placeholder="Cerca birra..."
            />
            <Button
              className="w-full rounded-xl bg-primary text-white"
              disabled={!selectedBeer || addMutation.isPending}
              onClick={() => selectedBeer && addMutation.mutate(selectedBeer.id)}
            >
              {addMutation.isPending ? "Aggiunta..." : "Aggiungi proposta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
