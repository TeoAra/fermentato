import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { Beer, Droplets } from "lucide-react";

const ITEMS_PER_PAGE = 8;
const PAGE_INTERVAL = 30000;

type ScheduleSlot = { label: string; date?: string; openFrom: string; openTo: string };

interface FestivalData {
  festival: {
    id: number; name: string; description: string | null; location: string | null;
    startDate: string | null; endDate: string | null; logoUrl: string | null;
    coverImageUrl: string | null; schedule: ScheduleSlot[] | null;
    useTokens: boolean | null; tokenName: string | null;
  };
  taps: Array<{
    id: number; tapNumber: number; beerId: number | null;
    customBeerName: string | null; customBreweryName: string | null;
    style: string | null; abv: string | null; notes: string | null;
    isAvailable: boolean; tapType: string | null;
    beerName: string | null; beerStyle: string | null; beerAbv: string | null;
    beerImageUrl: string | null; breweryName: string | null; breweryLogoUrl: string | null;
    prices: Record<string, number> | null;
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

  // Wake lock
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

  const festival = data?.festival;
  const useTokens = !!(festival?.useTokens);
  const tokenName = festival?.tokenName || "token";

  const availableTaps = useMemo(() => {
    if (!data?.taps) return [];
    return data.taps.filter(t => t.isAvailable);
  }, [data?.taps]);

  // Collect all size columns across all taps
  const sizeColumns = useMemo(() => {
    const sizes = new Set<string>();
    availableTaps.forEach(tap => {
      if (tap.prices && typeof tap.prices === "object") {
        Object.keys(tap.prices).forEach(s => sizes.add(s));
      }
    });
    if (sizes.size === 0) return [];
    return Array.from(sizes);
  }, [availableTaps]);

  const hasPompa = availableTaps.some(t => t.tapType === "pompa");
  const hasSpina = availableTaps.some(t => (t.tapType || "spina") === "spina");

  const totalPages = Math.max(1, Math.ceil(availableTaps.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (totalPages <= 1) { setCurrentPage(0); return; }
    const interval = setInterval(() => setCurrentPage(p => (p + 1) % totalPages), PAGE_INTERVAL);
    return () => clearInterval(interval);
  }, [totalPages]);

  useEffect(() => { if (currentPage >= totalPages) setCurrentPage(0); }, [totalPages, currentPage]);

  const isCompact = availableTaps.length > 7;

  // Same grid layout as pub taplist, with price columns
  const gridCols = sizeColumns.length > 0
    ? `5vw 9vh 1fr 20vw 6vw ${sizeColumns.map(() => "9vw").join(" ")}`
    : `5vw 9vh 1fr 20vw 6vw`;

  const formatPrice = (price: number) => {
    if (useTokens) {
      const n = Number.isInteger(price) ? price : price.toFixed(1);
      return `${n} ${tokenName}`;
    }
    return `€${price.toFixed(2)}`;
  };

  const spinaTaps = availableTaps.filter(t => (t.tapType || "spina") === "spina");
  const pompaTaps = availableTaps.filter(t => t.tapType === "pompa");

  const renderRow = (tap: FestivalData["taps"][0], index: number, animIdx: number) => {
    const beerName = tap.beerName || tap.customBeerName || `Spina ${tap.tapNumber}`;
    const brewery = tap.breweryName || tap.customBreweryName || "";
    const style = tap.beerStyle || tap.style || "";
    const abv = tap.beerAbv || tap.abv || "";
    const imageUrl = tap.beerImageUrl;
    const isPompa = tap.tapType === "pompa";
    const prices = tap.prices && typeof tap.prices === "object" ? tap.prices : {};

    return (
      <div
        key={tap.id}
        className="tv-row"
        style={{
          gridTemplateColumns: gridCols,
          gap: "1.2vw",
          animationDelay: `${animIdx * 0.06}s`,
          borderLeft: isPompa ? "3px solid rgba(139,92,246,0.5)" : "3px solid transparent",
        }}
      >
        <div className="tv-tap-num">{tap.tapNumber}</div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="tv-beer-img-wrap">
            {imageUrl ? (
              <img src={imageUrl} alt="" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <Beer style={{ width: "45%", height: "45%", color: "rgba(245,158,11,0.3)" }} />
            )}
          </div>
        </div>

        <div className="tv-beer-info">
          <div className="tv-beer-name-row">
            <div className="tv-beer-name">{beerName}</div>
            {isPompa && (
              <span className="tv-badge-af" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", borderColor: "rgba(139,92,246,0.25)" }}>
                pompa
              </span>
            )}
          </div>
          {brewery && <div className="tv-beer-brewery">{brewery}</div>}
        </div>

        <div className="tv-beer-style">{style}</div>
        <div className="tv-beer-abv">{abv ? `${abv}%` : ""}</div>

        {sizeColumns.map((size, i) => (
          <div key={i} className="tv-price">
            {prices[size] != null ? (
              useTokens ? (
                <span style={{ color: "#fff", fontSize: isCompact ? "2.2vh" : "2.8vh" }}>
                  {Number.isInteger(prices[size]) ? prices[size] : prices[size].toFixed(1)}
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7em", marginLeft: "0.3em" }}>{tokenName}</span>
                </span>
              ) : (
                <><span className="tv-price-euro">€</span>{prices[size].toFixed(2)}</>
              )
            ) : (
              <span style={{ color: "rgba(255,255,255,0.1)" }}>—</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSectionDivider = (label: string, color: string, animIdx: number) => (
    <div key={`divider-${label}`} className="tv-section-divider" style={{ animationDelay: `${animIdx * 0.06}s` }}>
      <div className="tv-section-line" style={{ background: color }} />
      <span className="tv-section-label" style={{ color }}>{label}</span>
      <div className="tv-section-line" style={{ background: color }} />
    </div>
  );

  const renderRows = () => {
    let animIdx = 0;
    const rows: React.ReactNode[] = [];
    const pageStart = currentPage * ITEMS_PER_PAGE;
    const pageEnd = pageStart + ITEMS_PER_PAGE;
    let globalIdx = 0;

    if (!hasPompa || !hasSpina) {
      availableTaps.slice(pageStart, pageEnd).forEach((tap, i) => {
        rows.push(renderRow(tap, globalIdx++, animIdx++));
      });
    } else {
      const allOrdered = [...spinaTaps, null, ...pompaTaps];
      const paged = allOrdered.slice(pageStart, pageEnd);
      paged.forEach((tap, i) => {
        if (tap === null) {
          rows.push(renderSectionDivider("In Pompa", "rgba(139,92,246,0.8)", animIdx++));
        } else {
          rows.push(renderRow(tap, globalIdx++, animIdx++));
        }
      });
    }
    return rows;
  };

  return (
    <div className="tv-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; cursor: none; margin: 0; padding: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .tv-root {
          width: 100vw; height: 100vh;
          background: linear-gradient(165deg, #0c0c1d 0%, #111827 40%, #0f172a 100%);
          color: #fff;
          display: flex; flex-direction: column;
          overflow: hidden;
        }

        @keyframes rowSlide {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        .tv-header {
          padding: 1vh 3.5vw;
          display: flex; align-items: center; justify-content: space-between;
          background: linear-gradient(180deg, rgba(245,158,11,0.08) 0%, transparent 100%);
          border-bottom: 1px solid rgba(245,158,11,0.15);
          flex-shrink: 0;
        }
        .tv-header-left { display: flex; align-items: center; gap: 1.4vw; }
        .tv-header-logo {
          width: 4.5vh; height: 4.5vh;
          border-radius: 0.8vh;
          object-fit: cover;
          border: 2px solid rgba(245,158,11,0.3);
          box-shadow: 0 0 20px rgba(245,158,11,0.15);
        }
        .tv-header-logo-placeholder {
          width: 4.5vh; height: 4.5vh;
          border-radius: 0.8vh;
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(245,158,11,0.15);
        }
        .tv-pub-name {
          font-size: 3vh; font-weight: 800;
          background: linear-gradient(90deg, #fbbf24, #f59e0b, #d97706);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em; line-height: 1.1;
        }
        .tv-pub-sub {
          font-size: 1.2vh; color: rgba(255,255,255,0.4);
          font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase;
          margin-top: 0.2vh;
        }
        .tv-header-right { display: flex; align-items: center; gap: 2vw; }
        .tv-time {
          font-size: 3vh; font-weight: 700;
          color: rgba(255,255,255,0.85);
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
        }
        .tv-date {
          font-size: 1.2vh; color: rgba(255,255,255,0.35);
          text-align: right; text-transform: capitalize;
          margin-top: 0.1vh;
        }
        .tv-live {
          display: flex; align-items: center; gap: 0.5vw;
          font-size: 1.3vh; color: rgba(16,185,129,0.8);
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;
        }
        .tv-live-dot {
          width: 0.9vh; height: 0.9vh;
          background: #10b981; border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .tv-table-wrap {
          flex: 1; display: flex; flex-direction: column;
          padding: 1vh 3.5vw 1vh;
          overflow: hidden;
          gap: 0;
        }

        .tv-table-header {
          display: grid;
          align-items: center;
          padding: 0.7vh 2vw 0.7vh 2.4vw;
          border-bottom: 2px solid rgba(245,158,11,0.2);
          flex-shrink: 0;
          margin-bottom: 0.3vh;
        }
        .tv-col-label {
          font-size: ${isCompact ? "1.4vh" : "1.7vh"};
          font-weight: 700;
          color: rgba(245,158,11,0.6);
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .tv-col-label-right { text-align: right; }

        .tv-rows { flex: 1; display: flex; flex-direction: column; overflow: hidden; gap: 0; }

        .tv-row {
          display: grid;
          align-items: center;
          padding: 0 2vw;
          flex: 1;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          animation: rowSlide 0.5s ease-out both;
          transition: background 0.3s;
          min-height: 0;
        }
        .tv-row:nth-child(even) { background: rgba(255,255,255,0.018); }
        .tv-row:last-child { border-bottom: none; }

        .tv-section-divider {
          display: flex; align-items: center; gap: 1.5vw;
          padding: 0 2vw;
          flex-shrink: 0;
          height: 3vh;
          animation: rowSlide 0.5s ease-out both;
        }
        .tv-section-line { flex: 1; height: 1px; opacity: 0.4; }
        .tv-section-label {
          font-size: 1.5vh; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.18em;
          white-space: nowrap; flex-shrink: 0;
        }

        .tv-tap-num {
          font-size: ${isCompact ? "2.5vh" : "3.2vh"};
          font-weight: 800;
          color: rgba(245,158,11,0.35);
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        .tv-beer-img-wrap {
          width: ${isCompact ? "5.5vh" : "6.5vh"};
          height: ${isCompact ? "5.5vh" : "6.5vh"};
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .tv-beer-img-wrap img { width: 100%; height: 100%; object-fit: cover; }

        .tv-beer-info { display: flex; flex-direction: column; justify-content: center; min-width: 0; gap: 0.3vh; }
        .tv-beer-name-row { display: flex; align-items: center; gap: 0.8vw; min-width: 0; }
        .tv-beer-name {
          font-size: ${isCompact ? "2.8vh" : "3.6vh"};
          font-weight: 700; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          line-height: 1.2; letter-spacing: -0.01em;
          min-width: 0;
        }
        .tv-beer-brewery {
          font-size: ${isCompact ? "1.6vh" : "2.1vh"};
          color: rgba(251,191,36,0.7);
          font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          line-height: 1.3;
        }

        .tv-beer-style {
          font-size: ${isCompact ? "2vh" : "2.5vh"};
          color: rgba(255,255,255,0.5);
          font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-align: center;
        }

        .tv-beer-abv {
          font-size: ${isCompact ? "2.2vh" : "2.9vh"};
          font-weight: 700;
          color: rgba(245,158,11,0.85);
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        .tv-badge-af {
          font-size: ${isCompact ? "1.3vh" : "1.6vh"};
          padding: 0.2vh 0.6vw;
          border-radius: 999px;
          background: rgba(59,130,246,0.15);
          color: #60a5fa;
          border: 1px solid rgba(59,130,246,0.25);
          font-weight: 700; flex-shrink: 0; white-space: nowrap;
        }

        .tv-price {
          font-size: ${isCompact ? "2.6vh" : "3.3vh"};
          font-weight: 700; color: #fff;
          text-align: right; font-variant-numeric: tabular-nums;
        }
        .tv-price-euro { color: rgba(255,255,255,0.4); font-weight: 400; }

        .tv-footer {
          padding: 0.4vh 3.5vw;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .tv-footer-brand {
          font-size: 1.3vh; color: rgba(255,255,255,0.15);
          font-weight: 600; letter-spacing: 0.1em;
        }
        .tv-page-dots { display: flex; gap: 0.8vh; align-items: center; }
        .tv-page-dot {
          width: 0.8vh; height: 0.8vh;
          border-radius: 50%; background: rgba(255,255,255,0.15);
          transition: all 0.5s;
        }
        .tv-page-dot-active {
          background: #f59e0b; width: 2.5vh; border-radius: 0.4vh;
          box-shadow: 0 0 8px rgba(245,158,11,0.4);
        }
      `}</style>

      {/* Header */}
      <div className="tv-header">
        <div className="tv-header-left">
          {festival?.logoUrl ? (
            <img src={festival.logoUrl} alt="" className="tv-header-logo" />
          ) : (
            <div className="tv-header-logo-placeholder">
              <Beer style={{ width: "55%", height: "55%" }} className="text-white" />
            </div>
          )}
          <div>
            <div className="tv-pub-name">{festival?.name || "Festival Taplist"}</div>
            <div className="tv-pub-sub">
              {festival?.location ? festival.location : "Taplist live"}
              {useTokens && ` · ${tokenName}`}
            </div>
          </div>
        </div>
        <div className="tv-header-right">
          <div className="tv-live">
            <div className="tv-live-dot" />
            LIVE
          </div>
          <div>
            <div className="tv-time">
              {currentTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="tv-date">
              {currentTime.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>
        </div>
      </div>

      {availableTaps.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <Droplets style={{ width: "12vh", height: "12vh", color: "rgba(255,255,255,0.15)", margin: "0 auto 3vh" }} />
            <div style={{ fontSize: "4vh", fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
              Nessuna birra disponibile
            </div>
          </div>
        </div>
      ) : (
        <div className="tv-table-wrap">
          <div className="tv-table-header" style={{ gridTemplateColumns: gridCols, gap: "1.2vw" }}>
            <div className="tv-col-label" style={{ textAlign: "center" }}>#</div>
            <div className="tv-col-label"></div>
            <div className="tv-col-label">Birra</div>
            <div className="tv-col-label" style={{ textAlign: "center" }}>Stile</div>
            <div className="tv-col-label" style={{ textAlign: "center" }}>ABV</div>
            {sizeColumns.map((size, i) => (
              <div key={i} className="tv-col-label tv-col-label-right">{size}</div>
            ))}
          </div>
          <div className="tv-rows">{renderRows()}</div>
        </div>
      )}

      {/* Footer */}
      <div className="tv-footer">
        <div className="tv-footer-brand">FERMENTA.TO</div>
        {totalPages > 1 && (
          <div className="tv-page-dots">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div key={i} className={`tv-page-dot ${i === currentPage ? "tv-page-dot-active" : ""}`} />
            ))}
          </div>
        )}
        <div style={{ fontSize: "1.3vh", color: "rgba(255,255,255,0.2)", display: "flex", gap: "1.5vw", alignItems: "center" }}>
          {hasSpina && <span>{spinaTaps.length} spina</span>}
          {hasPompa && <span style={{ color: "rgba(139,92,246,0.5)" }}>{pompaTaps.length} pompa</span>}
        </div>
      </div>
    </div>
  );
}
