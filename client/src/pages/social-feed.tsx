import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Users, Package, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

function RatingStars({ rating }: { rating: number }) {
  const r = parseFloat(rating.toString());
  return (
    <span className="text-primary font-bold text-xs">
      {"★".repeat(Math.round(r))}{"☆".repeat(5 - Math.round(r))} {r.toFixed(1)}
    </span>
  );
}

export default function SocialFeed() {
  const { isAuthenticated } = useAuth();

  const { data: feed = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/user/feed"],
    enabled: isAuthenticated,
  });

  const { data: following = [] } = useQuery<any[]>({
    queryKey: ["/api/user/following"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[hsl(220,5%,14%)] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Users className="w-12 h-12 mx-auto text-stone-300" />
          <p className="text-stone-500">Accedi per vedere il feed degli amici</p>
          <Link href="/auth"><Button className="bg-primary text-white">Accedi</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[hsl(220,5%,14%)] pb-24">
      <Helmet><title>Feed amici | Fermenta.to</title></Helmet>

      <div className="bg-white dark:bg-[hsl(220,5%,18%)] border-b border-stone-100 dark:border-[hsl(220,5%,27%)] px-4 py-5">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50 font-poppins">Feed amici</h1>
        <p className="text-sm text-stone-500 mt-0.5">Segui {following.length} {following.length === 1 ? "persona" : "persone"}</p>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : feed.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 px-6 text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-white dark:bg-[hsl(220,5%,18%)] flex items-center justify-center shadow-sm">
            <Users className="w-9 h-9 text-stone-300" />
          </div>
          <p className="font-semibold text-stone-700 dark:text-stone-300 font-poppins">
            {following.length === 0 ? "Non stai seguendo nessuno" : "Nessuna attività recente"}
          </p>
          <p className="text-sm text-stone-400">
            {following.length === 0
              ? "Inizia a seguire altri appassionati di birra"
              : "I tuoi amici non hanno registrato assaggi di recente"}
          </p>
          <Link href="/explore/beers">
            <Button variant="outline" className="mt-2">Esplora birre</Button>
          </Link>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {feed.map((item: any) => (
            <div key={item.id} className="bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                {item.profile_image_url ? (
                  <img src={item.profile_image_url} alt={item.display_name ?? item.username} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary text-sm font-bold">
                      {(item.display_name ?? item.username ?? "?")[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/user/${item.username}`}>
                    <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">{item.display_name ?? item.username}</span>
                  </Link>
                  <p className="text-xs text-stone-400">
                    {formatDistanceToNow(new Date(item.tasted_at), { addSuffix: true, locale: it })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {item.beer_image ? (
                  <img src={item.beer_image} alt={item.beer_name} className="w-14 h-14 object-contain rounded-xl bg-stone-50 dark:bg-[hsl(220,5%,22%)] flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-[hsl(220,5%,22%)] flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-stone-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/beer/${item.beer_id}`}>
                    <p className="font-semibold text-stone-900 dark:text-stone-50 text-sm">{item.beer_name}</p>
                  </Link>
                  <p className="text-xs text-stone-400 mt-0.5">{item.brewery_name}</p>
                  {item.pub_id && item.pub_name && (
                    <Link href={`/pub/${item.pub_id}`}>
                      <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {item.pub_name}{item.pub_city ? `, ${item.pub_city}` : ""}
                      </p>
                    </Link>
                  )}
                  {item.rating && <div className="mt-1"><RatingStars rating={item.rating} /></div>}
                  {item.notes && <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 italic">"{item.notes}"</p>}
                  {item.photo_url && (
                    <img src={item.photo_url} alt="Foto assaggio" className="mt-2 rounded-xl w-full max-h-40 object-cover" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
