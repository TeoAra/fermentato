import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { Beer, Droplets } from "lucide-react";

const ITEMS_PER_PAGE = 10;
const PAGE_INTERVAL = 30000;

export default function TaplistTV() {
  const { id } = useParams<{ id: string }>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const { data: pub } = useQuery({
    queryKey: ["/api/pubs", id],
    enabled: !!id,
    refetchInterval: 15000,
  });

  const { data: tapList = [] } = useQuery({
    queryKey: ["/api/pubs", id, "taplist"],
    enabled: !!id,
    refetchInterval: 10000,
  });

  const { data: pubSizes = [] } = useQuery({
    queryKey: ["/api/pubs", id, "sizes"],
    enabled: !!id,
  });

  const activeTaps = useMemo(() => {
    return Array.isArray(tapList) ? tapList.filter((t: any) => t.isActive !== false) : [];
  }, [tapList]);

  const totalPages = Math.max(1, Math.ceil(activeTaps.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (totalPages <= 1) { setCurrentPage(0); return; }
    const interval = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, PAGE_INTERVAL);
    return () => clearInterval(interval);
  }, [totalPages]);

  useEffect(() => {
    if (currentPage >= totalPages) setCurrentPage(0);
  }, [totalPages, currentPage]);

  const pageTaps = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return activeTaps.slice(start, start + ITEMS_PER_PAGE);
  }, [activeTaps, currentPage]);

  const sizeColumns = useMemo(() => {
    const sizes = new Set<string>();
    activeTaps.forEach((tap: any) => {
      const prices = tap.prices || [];
      prices.forEach((p: any) => { if (p.size) sizes.add(p.size); });
    });
    if (sizes.size === 0) return ["Prezzo"];
    return Array.from(sizes);
  }, [activeTaps]);

  const rowCount = pageTaps.length;
  const isCompact = rowCount > 8;

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
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        .tv-header {
          padding: 2vh 3vw;
          display: flex; align-items: center; justify-content: space-between;
          background: linear-gradient(180deg, rgba(245,158,11,0.08) 0%, transparent 100%);
          border-bottom: 1px solid rgba(245,158,11,0.15);
          flex-shrink: 0;
        }
        .tv-header-left { display: flex; align-items: center; gap: 1.5vw; }
        .tv-header-logo {
          width: 7vh; height: 7vh;
          border-radius: 1.2vh;
          object-fit: cover;
          border: 2px solid rgba(245,158,11,0.3);
          box-shadow: 0 0 20px rgba(245,158,11,0.15);
        }
        .tv-header-logo-placeholder {
          width: 7vh; height: 7vh;
          border-radius: 1.2vh;
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(245,158,11,0.15);
        }
        .tv-pub-name {
          font-size: 4.5vh; font-weight: 800;
          background: linear-gradient(90deg, #fbbf24, #f59e0b, #d97706);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em; line-height: 1.1;
        }
        .tv-pub-sub {
          font-size: 1.8vh; color: rgba(255,255,255,0.4);
          font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase;
          margin-top: 0.3vh;
        }
        .tv-header-right { display: flex; align-items: center; gap: 2vw; }
        .tv-time {
          font-size: 4.5vh; font-weight: 700;
          color: rgba(255,255,255,0.85);
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
        }
        .tv-date {
          font-size: 1.5vh; color: rgba(255,255,255,0.35);
          text-align: right; text-transform: capitalize;
        }
        .tv-live {
          display: flex; align-items: center; gap: 0.5vw;
          font-size: 1.4vh; color: rgba(16,185,129,0.8);
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;
        }
        .tv-live-dot {
          width: 1vh; height: 1vh;
          background: #10b981; border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .tv-table-wrap {
          flex: 1; display: flex; flex-direction: column;
          padding: 1.5vh 3vw 1vh;
          overflow: hidden;
        }

        .tv-table-header {
          display: grid;
          align-items: center;
          padding: 1.5vh 2vw;
          border-bottom: 2px solid rgba(245,158,11,0.2);
          flex-shrink: 0;
        }
        .tv-col-label {
          font-size: ${isCompact ? '1.4vh' : '1.6vh'};
          font-weight: 700;
          color: rgba(245,158,11,0.6);
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .tv-col-label-right { text-align: right; }

        .tv-rows { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

        .tv-row {
          display: grid;
          align-items: center;
          padding: ${isCompact ? '0 2vw' : '0 2vw'};
          flex: 1;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          animation: rowSlide 0.5s ease-out both;
          transition: background 0.3s;
          min-height: 0;
        }
        .tv-row:nth-child(even) { background: rgba(255,255,255,0.015); }
        .tv-row:last-child { border-bottom: none; }

        .tv-tap-num {
          font-size: ${isCompact ? '2.5vh' : '3vh'};
          font-weight: 800;
          color: rgba(245,158,11,0.35);
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        .tv-beer-img-wrap {
          width: ${isCompact ? '5.5vh' : '7vh'};
          height: ${isCompact ? '5.5vh' : '7vh'};
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .tv-beer-img-wrap img {
          width: 100%; height: 100%; object-fit: cover;
        }

        .tv-beer-info { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
        .tv-beer-name {
          font-size: ${isCompact ? '2.8vh' : '3.5vh'};
          font-weight: 700; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          line-height: 1.2; letter-spacing: -0.01em;
        }
        .tv-beer-brewery {
          font-size: ${isCompact ? '1.6vh' : '2vh'};
          color: rgba(251,191,36,0.7);
          font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          line-height: 1.3;
        }

        .tv-beer-style {
          font-size: ${isCompact ? '1.5vh' : '1.8vh'};
          color: rgba(255,255,255,0.5);
          font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .tv-beer-abv {
          font-size: ${isCompact ? '2.2vh' : '2.8vh'};
          font-weight: 700;
          color: rgba(245,158,11,0.85);
          text-align: center;
          font-variant-numeric: tabular-nums;
        }

        .tv-badges {
          display: flex; gap: 0.5vw; align-items: center; justify-content: center;
        }
        .tv-badge-gf {
          font-size: ${isCompact ? '1.2vh' : '1.4vh'};
          padding: 0.3vh 0.8vw;
          border-radius: 999px;
          background: rgba(16,185,129,0.15);
          color: #34d399;
          border: 1px solid rgba(16,185,129,0.25);
          font-weight: 700;
        }
        .tv-badge-af {
          font-size: ${isCompact ? '1.2vh' : '1.4vh'};
          padding: 0.3vh 0.8vw;
          border-radius: 999px;
          background: rgba(59,130,246,0.15);
          color: #60a5fa;
          border: 1px solid rgba(59,130,246,0.25);
          font-weight: 700;
        }

        .tv-price {
          font-size: ${isCompact ? '2.6vh' : '3.2vh'};
          font-weight: 700;
          color: #fff;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .tv-price-euro { color: rgba(255,255,255,0.4); font-weight: 400; }

        .tv-footer {
          padding: 0.5vh 3vw;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
          border-top: 1px solid rgba(255,255,255,0.03);
        }
        .tv-footer-brand {
          font-size: 1.2vh; color: rgba(255,255,255,0.15);
          font-weight: 600; letter-spacing: 0.1em;
        }
        .tv-page-dots {
          display: flex; gap: 0.8vh; align-items: center;
        }
        .tv-page-dot {
          width: 0.8vh; height: 0.8vh;
          border-radius: 50%; background: rgba(255,255,255,0.15);
          transition: all 0.5s;
        }
        .tv-page-dot-active {
          background: #f59e0b;
          width: 2.5vh;
          border-radius: 0.4vh;
          box-shadow: 0 0 8px rgba(245,158,11,0.4);
        }
      `}</style>

      <div className="tv-header">
        <div className="tv-header-left">
          {(pub as any)?.logoUrl ? (
            <img src={(pub as any).logoUrl} alt="" className="tv-header-logo" />
          ) : (
            <div className="tv-header-logo-placeholder">
              <Beer style={{ width: '55%', height: '55%' }} className="text-white" />
            </div>
          )}
          <div>
            <div className="tv-pub-name">{(pub as any)?.name || "Taplist"}</div>
            <div className="tv-pub-sub">Birre alla spina</div>
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

      {activeTaps.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <Droplets style={{ width: '12vh', height: '12vh', color: 'rgba(255,255,255,0.15)', margin: '0 auto 3vh' }} />
            <div style={{ fontSize: '4vh', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
              Nessuna birra alla spina
            </div>
          </div>
        </div>
      ) : (
        <div className="tv-table-wrap">
          <div
            className="tv-table-header"
            style={{
              gridTemplateColumns: `4vw 8vh 1fr 12vw 6vw 4vw ${sizeColumns.map(() => '8vw').join(' ')}`,
              gap: '1vw',
            }}
          >
            <div className="tv-col-label" style={{ textAlign: 'center' }}>#</div>
            <div className="tv-col-label"></div>
            <div className="tv-col-label">Birra</div>
            <div className="tv-col-label">Stile</div>
            <div className="tv-col-label" style={{ textAlign: 'center' }}>ABV</div>
            <div className="tv-col-label"></div>
            {sizeColumns.map((size, i) => (
              <div key={i} className="tv-col-label tv-col-label-right">{size}</div>
            ))}
          </div>

          <div className="tv-rows">
            {pageTaps.map((tap: any, index: number) => {
              const beer = tap.beer || {};
              const brewery = beer.brewery?.name || beer.breweryName || "";
              const prices = tap.prices || [];
              const imageUrl = beer.imageUrl || beer.image_url || null;
              const breweryLogo = beer.brewery?.logoUrl || null;
              const displayImg = imageUrl || breweryLogo;

              const priceMap: Record<string, string> = {};
              prices.forEach((p: any) => {
                if (p.size) priceMap[p.size] = p.price;
                else priceMap["Prezzo"] = p.price;
              });

              return (
                <div
                  key={tap.id}
                  className="tv-row"
                  style={{
                    gridTemplateColumns: `4vw 8vh 1fr 12vw 6vw 4vw ${sizeColumns.map(() => '8vw').join(' ')}`,
                    gap: '1vw',
                    animationDelay: `${index * 0.06}s`,
                  }}
                >
                  <div className="tv-tap-num">{tap.tapNumber || index + 1}</div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="tv-beer-img-wrap">
                      {displayImg ? (
                        <img
                          src={displayImg}
                          alt=""
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Beer style={{ width: '45%', height: '45%', color: 'rgba(245,158,11,0.3)' }} />
                      )}
                    </div>
                  </div>

                  <div className="tv-beer-info">
                    <div className="tv-beer-name">{beer.name || "Birra"}</div>
                    {brewery && <div className="tv-beer-brewery">{brewery}</div>}
                  </div>

                  <div className="tv-beer-style">{beer.style || ""}</div>

                  <div className="tv-beer-abv">{beer.abv ? `${beer.abv}%` : ""}</div>

                  <div className="tv-badges">
                    {beer.isGlutenFree && <span className="tv-badge-gf">GF</span>}
                    {beer.isAlcoholFree && <span className="tv-badge-af">0.0</span>}
                  </div>

                  {sizeColumns.map((size, i) => (
                    <div key={i} className="tv-price">
                      {priceMap[size] ? (
                        <>
                          <span className="tv-price-euro">€</span>
                          {parseFloat(priceMap[size]).toFixed(2)}
                        </>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.1)' }}>—</span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="tv-footer">
        <div className="tv-footer-brand">FERMENTA.TO</div>
        {totalPages > 1 && (
          <div className="tv-page-dots">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={`tv-page-dot ${i === currentPage ? 'tv-page-dot-active' : ''}`}
              />
            ))}
          </div>
        )}
        <div style={{ fontSize: '1.2vh', color: 'rgba(255,255,255,0.15)' }}>
          {activeTaps.length} alla spina
        </div>
      </div>
    </div>
  );
}
