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
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#151515] dark:text-[#F5F5F5]">Dove trovarci</h2>
        <span className="bg-[#FFF7EA] dark:bg-[#F59E0B]/15 text-[#F59E0B] text-[10px] font-bold px-3 py-1 rounded-full">
          {distribution.length} {distribution.length === 1 ? "LOCALE" : "LOCALI"}
        </span>
      </div>

      <div className="space-y-2.5">
        {distribution.map((pub: any) => (
          <Link key={pub.id} href={`/pub/${pub.slug || pub.id}`}>
            <div className="bg-white dark:bg-[#1A1D24] rounded-[20px] p-4 flex items-center gap-4 border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] active:scale-[0.99] transition-all cursor-pointer">
              {pub.logo_url ? (
                <img
                  src={pub.logo_url}
                  alt={pub.name}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#FFF7EA] dark:bg-[#F59E0B]/15 flex items-center justify-center flex-shrink-0">
                  <Store className="w-6 h-6 text-[#F59E0B]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#151515] dark:text-[#F5F5F5] truncate">
                  {pub.name}
                </p>
                <p className="text-[10px] text-[#6B6357] dark:text-[#B7BDC7] truncate uppercase font-bold tracking-tight mt-0.5">
                  {[pub.city, pub.region].filter(Boolean).join(", ")}
                </p>
                <p className="text-[10px] text-[#F59E0B] font-bold mt-1 uppercase">
                  {pub.beer_count}{" "}
                  {Number(pub.beer_count) === 1 ? "birra" : "birre"} on tap
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
