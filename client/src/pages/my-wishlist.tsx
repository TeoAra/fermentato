import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Heart, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";

export default function MyWishlist() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wishlist = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/user/wishlist"],
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: (beerId: number) => apiRequest("DELETE", `/api/user/wishlist/${beerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/wishlist"] });
      toast({ title: "Rimossa dalla wishlist" });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#0B0D10] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Heart className="w-12 h-12 mx-auto text-stone-300" />
          <p className="text-stone-500">Accedi per vedere la tua wishlist</p>
          <Link href="/auth"><Button className="bg-primary text-white">Accedi</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#0B0D10] pb-24">
      <Helmet><title>Wishlist | Fermenta.to</title></Helmet>

      <div className="bg-white dark:bg-[#1A1D24] border-b border-stone-100 dark:border-[hsl(220,5%,27%)] px-4 py-5">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50 font-poppins">Wishlist</h1>
        <p className="text-sm text-stone-500 mt-0.5">{wishlist.length} {wishlist.length === 1 ? "birra" : "birre"} da provare</p>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 px-6 text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <Heart className="w-9 h-9 text-stone-300" />
          </div>
          <p className="font-semibold text-stone-700 dark:text-stone-300 font-poppins">Wishlist vuota</p>
          <p className="text-sm text-stone-400">Salva le birre che vuoi provare</p>
          <Link href="/explore/beers">
            <Button variant="outline" className="mt-2">Esplora birre</Button>
          </Link>
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {wishlist.map((item: any) => (
            <div
              key={item.beer_id}
              className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 hover:border-primary/30 flex items-center gap-3 p-3"
            >
              {item.beer_image ? (
                <img loading="lazy" src={item.beer_image} alt={item.beer_name} className="w-14 h-14 object-contain rounded-xl bg-stone-50 dark:bg-[#12151A]" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-[#12151A] flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-stone-300" />
                </div>
              )}
              <Link href={`/beer/${item.beer_id}`} className="flex-1 min-w-0">
                <p className="font-semibold text-stone-900 dark:text-stone-50 truncate text-sm font-poppins">{item.beer_name}</p>
                <p className="text-xs text-stone-400 mt-0.5">{item.brewery_name}</p>
                {item.beer_style && (
                  <span className="inline-block text-xs bg-stone-100 dark:bg-[#12151A] text-stone-500 rounded-full px-2 py-0.5 mt-1">{item.beer_style}</span>
                )}
              </Link>
              {item.beer_abv && (
                <span className="text-xs font-bold text-primary shrink-0">{item.beer_abv}%</span>
              )}
              <button
                className="w-8 h-8 flex items-center justify-center text-red-400 active:scale-90 transition-transform"
                onClick={() => removeMutation.mutate(item.beer_id)}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
