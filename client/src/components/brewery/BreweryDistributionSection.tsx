import { Link } from "wouter";
import { Store } from "lucide-react";

interface BreweryDistributionSectionProps {
  distribution: any[];
}

/**
 * Tab "Distribuzione" / "Dove trovarci" per /brewery/:id.
 * Griglia pub che servono le birre del birrificio (logo, città, count birre on tap).
 */
export default function BreweryDistributionSection({
  distribution,
}: BreweryDistributionSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Dove trovarci</h2>
        <span className="bg-stone-50 dark:bg-[#1A1D24]/40 text-primary text-[10px] font-bold px-3 py-1 rounded-full">
          {distribution.length} {distribution.length === 1 ? "LOCALE" : "LOCALI"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {distribution.map((pub: any) => (
          <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
            <div className="bg-white dark:bg-card rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-stone-100 dark:border-stone-200 hover:border-primary/20 transition-all cursor-pointer group">
              {pub.logo_url ? (
                <img
                  src={pub.logo_url}
                  alt={pub.name}
                  className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 lightbox-img"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-primary flex items-center justify-center flex-shrink-0">
                  <Store className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {pub.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-tight">
                  {[pub.city, pub.region].filter(Boolean).join(", ")}
                </p>
                <p className="text-[10px] text-primary font-bold mt-1 uppercase">
                  {pub.beer_count}{" "}
                  {Number(pub.beer_count) === 1 ? "birra" : "birre"} ON TAP
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
