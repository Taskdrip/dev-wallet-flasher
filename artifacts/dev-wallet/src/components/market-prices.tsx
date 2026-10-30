import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type PriceRecord = {
  usd: number;
  usd_24h_change?: number;
  last_updated_at?: number;
};

type CoinGeckoResponse = Record<string, PriceRecord>;

const MARKET_ASSETS = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC" },
  { id: "ethereum", name: "Ethereum", symbol: "ETH" },
  { id: "binancecoin", name: "BNB Chain", symbol: "BNB" },
  { id: "tron", name: "TRON", symbol: "TRX" },
  { id: "tether", name: "Tether", symbol: "USDT" },
] as const;

async function getMarketPrices(): Promise<CoinGeckoResponse> {
  const ids = MARKET_ASSETS.map((asset) => asset.id).join(",");
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Market data is temporarily rate limited. Try again shortly."
        : "Market prices are temporarily unavailable.",
    );
  }

  const data = (await response.json()) as CoinGeckoResponse;
  for (const asset of MARKET_ASSETS) {
    if (typeof data[asset.id]?.usd !== "number" || !Number.isFinite(data[asset.id].usd)) {
      throw new Error("The market data provider returned incomplete prices.");
    }
  }
  return data;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  }).format(price);
}

export function MarketPrices() {
  const { data, error, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["market-prices"],
    queryFn: getMarketPrices,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  return (
    <section
      aria-label="Live cryptocurrency prices"
      className="mx-auto mb-12 max-w-5xl rounded-2xl border border-white/10 bg-slate-950/65 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white">Market snapshot</h2>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            Live
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          {isFetching && !isLoading ? "Refreshing…" : "Refreshes every minute"}
        </span>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4">
          <p role="status" className="text-sm text-slate-300">
            {error instanceof Error ? error.message : "Market prices are temporarily unavailable."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Loading prices">
          {MARKET_ASSETS.map((asset) => (
            <div key={asset.id} className="h-[84px] animate-pulse rounded-xl bg-white/[0.06]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {MARKET_ASSETS.map((asset) => {
            const price = data?.[asset.id];
            const change = price?.usd_24h_change ?? 0;
            const positive = change >= 0;
            const TrendIcon = positive ? TrendingUp : TrendingDown;

            return (
              <article
                key={asset.id}
                className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300">{asset.symbol}</span>
                  <span className="truncate text-[10px] text-slate-500">{asset.name}</span>
                </div>
                <p className="mt-3 text-lg font-bold tracking-tight text-white">
                  {formatPrice(price?.usd ?? 0)}
                </p>
                <p className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                  <TrendIcon className="h-3 w-3" />
                  {positive ? "+" : ""}{change.toFixed(2)}% <span className="text-slate-500">24h</span>
                </p>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-right text-[10px] text-slate-500">
        Public market data via CoinGecko
        {dataUpdatedAt ? ` · Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : ""}
      </p>
    </section>
  );
}
