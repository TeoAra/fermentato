import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { Beer, Droplets, Star } from "lucide-react";

const ITEMS_PER_PAGE = 8;
const PAGE_INTERVAL = 12000;

type ScheduleSlot = { label: string; date?: string; openFrom: string; openTo: string };

interface FestivalData {
  festival: {
    id: number; name: string; description: string | null; location: string | null;
    startDate: string | null; endDate: string | null; logoUrl: string | null;
    coverImageUrl: string | null; schedule: ScheduleSlot[] | null;
  };
  taps: Array<{
    id: number; tapNumber: number; beerId: number | null;
    customBeerName: string | null; customBreweryName: string | null;
    style: string | null; abv: string | null; notes: string | null;
    isAvailable: boolean; tapType: string | null;
    beerName: string | null; beerStyle: string | null; beerAbv: string | null;
    beerImageUrl: string | null; breweryId: number | null;
    breweryName: string | null; breweryLogoUrl: string | null;
    avgRating: number | null; ratingCount: number;
  }>;
  food: any[];
}

export default function FestivalTV() {
  const { slug } = useParams<{ slug: string }>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await (navigator as any).wakeLock.request("screen");
          wakeLock.addEventListener("release", () => { setTimeout(requestWakeLock, 1000); });
        }
      } catch (e) {}
    };
    requestWakeLock();
    const handleVisibility = () => { if (document.visibilityState === "visible") requestWakeLock(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  const { data } = useQuery<FestivalData>({
    queryKey: ["/api/festivals", slug],
    queryFn: async () => {
      const r = await fetch(`/api/festivals/${slug}`, { credentials: "include" });
      if (!r.ok) throw new Error("Fetch failed");
      return r.json();
    },
    refetchInterval: 15000,
    retry: false,
    enabled: !!slug,
  });

  const availableTaps = useMemo(() => {
    if (!data?.taps) return [];
    return data.taps.filter(t => t.isAvailable);
  }, [data?.taps]);

  const totalPages = Math.max(1, Math.ceil(availableTaps.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (totalPages <= 1) { setCurrentPage(0); return; }
    const interval = setInterval(() => setCurrentPage(p => (p + 1) % totalPages), PAGE_INTERVAL);
    return () => clearInterval(interval);
  }, [totalPages]);

  useEffect(() => { if (currentPage >= totalPages) setCurrentPage(0); }, [totalPages, currentPage]);

  const pageTaps = availableTaps.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  const isCompact = availableTaps.length > 7;
  const festival = data?.festival;

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      background: "#0a0a0a",
      color: "#fff",
      minHeight: "100vh",
      width: "100vw",
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .tv-row-fest {
          display: grid;
          grid-template-columns: 5vw 8vh 1fr 10vw 8vw;
          align-items: center;
          gap: 2vw;
          padding: ${isCompact ? "1.2vh 2.5vw" : "1.8vh 2.5vw"};
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: background 0.3s;
          animation: slideIn 0.4s ease both;
        }
        .tv-row-fest:last-child { border-bottom: none; }
        .tv-row-fest:hover { background: rgba(251,146,60,0.07); }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tv-tap-num-fest {
          font-size: ${isCompact ? "1.4vw" : "1.7vw"};
          font-weight: 800;
          color: #f59e0b;
          text-align: center;
          line-height: 1;
        }
        .tv-img-wrap-fest {
          width: ${isCompact ? "7vh" : "8vh"};
          height: ${isCompact ? "7vh" : "8vh"};
          border-radius: 1vw;
          overflow: hidden;
          background: #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tv-img-wrap-fest img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .tv-info-fest {
          display: flex;
          flex-direction: column;
          gap: 0.4vh;
          min-width: 0;
        }
        .tv-name-fest {
          font-size: ${isCompact ? "1.6vw" : "2vw"};
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.15;
        }
        .tv-brewery-fest {
          font-size: ${isCompact ? "1.1vw" : "1.3vw"};
          color: #f59e0b;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tv-style-fest {
          font-size: ${isCompact ? "0.95vw" : "1.1vw"};
          color: rgba(255,255,255,0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tv-abv-fest {
          font-size: ${isCompact ? "1.2vw" : "1.5vw"};
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          text-align: center;
        }
        .tv-rating-fest {
          font-size: ${isCompact ? "1.1vw" : "1.4vw"};
          font-weight: 700;
          color: #f59e0b;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3vw;
        }
        .tv-pompa-badge {
          display: inline-block;
          font-size: ${isCompact ? "0.8vw" : "0.9vw"};
          background: rgba(59,130,246,0.3);
          color: #93c5fd;
          border: 1px solid rgba(59,130,246,0.4);
          border-radius: 999px;
          padding: 0.1vh 0.5vw;
          font-weight: 600;
          margin-left: 0.5vw;
          vertical-align: middle;
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: festival?.coverImageUrl
          ? `linear-gradient(to right, rgba(10,10,10,0.92), rgba(20,10,5,0.85)), url(${festival.coverImageUrl}) center/cover`
          : "linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)",
        padding: "2vh 3vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "2px solid rgba(245,158,11,0.3)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2vw" }}>
          {festival?.logoUrl ? (
            <img src={festival.logoUrl} alt="" style={{ width: "8vh", height: "8vh", borderRadius: "1.2vw", objectFit: "cover", border: "2px solid rgba(245,158,11,0.5)" }} />
          ) : (
            <div style={{ width: "8vh", height: "8vh", borderRadius: "1.2vw", background: "rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              🍺
            </div>
          )}
          <div>
            <div style={{ fontSize: "2.8vw", fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>{festival?.name || "Festival Taplist"}</div>
            {festival?.location && (
              <div style={{ fontSize: "1.1vw", color: "rgba(255,255,255,0.6)", marginTop: "0.3vh" }}>{festival.location}</div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "3.5vw", fontWeight: 800, color: "#f59e0b", fontVariantNumeric: "tabular-nums" }}>
            {formatTime(currentTime)}
          </div>
          <div style={{ fontSize: "1vw", color: "rgba(255,255,255,0.5)", marginTop: "0.3vh" }}>
            {availableTaps.length} birr{availableTaps.length === 1 ? "a" : "e"} disponibil{availableTaps.length === 1 ? "e" : "i"}
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "5vw 8vh 1fr 10vw 8vw",
        gap: "2vw",
        padding: "0.8vh 2.5vw",
        background: "rgba(245,158,11,0.1)",
        borderBottom: "1px solid rgba(245,158,11,0.2)",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: "0.8vw", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>N°</div>
        <div></div>
        <div style={{ fontSize: "0.8vw", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Birra</div>
        <div style={{ fontSize: "0.8vw", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>ABV</div>
        <div style={{ fontSize: "0.8vw", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>Voto</div>
      </div>

      {/* Tap rows */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {pageTaps.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "2vh" }}>
            <div style={{ fontSize: "6vh", opacity: 0.3 }}>🍺</div>
            <div style={{ fontSize: "2vw", color: "rgba(255,255,255,0.4)" }}>Nessuna birra disponibile</div>
          </div>
        ) : (
          pageTaps.map((tap, idx) => {
            const name = tap.beerName || tap.customBeerName || `Spina ${tap.tapNumber}`;
            const brewery = tap.breweryName || tap.customBreweryName || "";
            const style = tap.beerStyle || tap.style || "";
            const abv = tap.beerAbv || tap.abv || "";
            const imageUrl = tap.beerImageUrl;
            return (
              <div key={tap.id} className="tv-row-fest" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="tv-tap-num-fest">{tap.tapNumber}</div>
                <div className="tv-img-wrap-fest">
                  {imageUrl ? (
                    <img src={imageUrl} alt={name} />
                  ) : (
                    <span style={{ fontSize: "4vh", opacity: 0.3 }}>🍺</span>
                  )}
                </div>
                <div className="tv-info-fest">
                  <div className="tv-name-fest">
                    {name}
                    {tap.tapType === "pompa" && <span className="tv-pompa-badge">In pompa</span>}
                  </div>
                  {brewery && <div className="tv-brewery-fest">{brewery}</div>}
                  {style && <div className="tv-style-fest">{style}</div>}
                </div>
                <div className="tv-abv-fest">
                  {abv ? `${abv}%` : ""}
                </div>
                <div className="tv-rating-fest">
                  {tap.avgRating !== null && tap.ratingCount > 0 ? (
                    <>
                      <span style={{ fontSize: isCompact ? "1vw" : "1.2vw", color: "#f59e0b" }}>★</span>
                      {Number(tap.avgRating).toFixed(1)}
                    </>
                  ) : (
                    <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "1.2vw" }}>—</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1vh 2.5vw",
        background: "rgba(0,0,0,0.5)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "0.1em" }}>
          fermenta.to
        </div>
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: "0.5vw" }}>
            {Array.from({ length: totalPages }, (_, i) => (
              <div key={i} style={{
                width: "0.6vw", height: "0.6vw", borderRadius: "50%",
                background: i === currentPage ? "#f59e0b" : "rgba(255,255,255,0.2)",
                transition: "background 0.3s",
              }} />
            ))}
          </div>
        )}
        <div style={{ fontSize: "0.9vw", color: "rgba(255,255,255,0.3)" }}>
          Aggiornato in tempo reale
        </div>
      </div>
    </div>
  );
}
