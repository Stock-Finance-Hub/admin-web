import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CandlestickSeries,
  ColorType,
  createChart,
} from 'lightweight-charts';

import {
  Alert,
  Badge,
  Card,
  CardBody,
  EmptyState,
  PageHeader,
  Spinner,
} from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { instrumentsApi } from './instruments.api.js';

const RANGES = [
  { value: '1M',  label: '1M',  days: 30 },
  { value: '3M',  label: '3M',  days: 90 },
  { value: '6M',  label: '6M',  days: 180 },
  { value: '1Y',  label: '1Y',  days: 365 },
  { value: '5Y',  label: '5Y',  days: 365 * 5 },
  { value: 'ALL', label: 'All', days: null },
];

const isoDate = (d) => d.toISOString().slice(0, 10);
const fromDateForRange = (days) => {
  if (days == null) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoDate(d);
};
const toUnixSec = (iso) => Math.floor(new Date(iso).getTime() / 1000);

const formatPrice = (n) => {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

function ConstituentCard({ instrument }) {
  const { symbol, name, logoUrl, segment } = instrument;
  return (
    <Link
      to={`/companies/${encodeURIComponent(segment)}/${encodeURIComponent(symbol)}`}
      className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 transition-colors hover:border-slate-400 hover:bg-slate-50"
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          className="h-9 w-9 shrink-0 rounded-md bg-slate-100 object-contain"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-200 text-xs font-semibold text-slate-600">
          {(symbol || '?').slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{symbol}</p>
        <p className="truncate text-xs text-slate-500">{name ?? '—'}</p>
      </div>
    </Link>
  );
}

export function IndexDetailPage() {
  const { symbol: rawSymbol } = useParams();
  const symbol = decodeURIComponent(rawSymbol ?? '');
  const segment = 'NSE_INDEX';

  const [instrument, setInstrument] = useState(null);
  const [candles, setCandles] = useState([]);
  const [range, setRange] = useState('1Y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [constituents, setConstituents] = useState([]);
  const [constituentSymbols, setConstituentSymbols] = useState([]);
  const [constituentsLoading, setConstituentsLoading] = useState(true);
  const [constituentsError, setConstituentsError] = useState(null);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    instrumentsApi.getOne(segment, symbol)
      .then((inst) => { if (!cancelled) setInstrument(inst); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [symbol]);

  const loadCandles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const days = RANGES.find((r) => r.value === range)?.days;
      const from = fromDateForRange(days);
      const data = await instrumentsApi.candles(segment, symbol, { timeframe: '1d', from });
      setCandles(data.candles ?? []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load price history'));
      setCandles([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, range]);

  useEffect(() => { loadCandles(); }, [loadCandles]);

  useEffect(() => {
    let cancelled = false;
    setConstituentsLoading(true);
    setConstituentsError(null);
    setConstituents([]);
    setConstituentSymbols([]);

    (async () => {
      try {
        const csv = await instrumentsApi.indexConstituents(symbol);
        if (cancelled) return;
        const symbols = (csv.items ?? []).map((c) => c.symbol);
        setConstituentSymbols(symbols);
        if (symbols.length === 0) {
          setConstituentsLoading(false);
          return;
        }
        const enriched = await instrumentsApi.bySymbols(symbols);
        if (!cancelled) setConstituents(enriched.items ?? []);
      } catch (err) {
        if (!cancelled) setConstituentsError(extractErrorMessage(err, 'Failed to load constituents'));
      } finally {
        if (!cancelled) setConstituentsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [symbol]);

  useEffect(() => {
    if (!chartContainerRef.current) return undefined;
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'white' },
        textColor: '#475569',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      rightPriceScale: { borderColor: '#e2e8f0' },
      timeScale: { borderColor: '#e2e8f0', timeVisible: false, secondsVisible: false },
      crosshair: { mode: 1 },
      autoSize: true,
    });
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#16a34a',
      downColor: '#dc2626',
      borderUpColor: '#16a34a',
      borderDownColor: '#dc2626',
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
    });
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const data = candles.map((c) => ({
      time: toUnixSec(c.ts),
      open: c.open, high: c.high, low: c.low, close: c.close,
    }));
    candleSeriesRef.current.setData(data);
    if (data.length > 0) chartRef.current?.timeScale().fitContent();
  }, [candles]);

  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const change = latest && previous ? latest.close - previous.close : null;
  const changePct = latest && previous ? (change / previous.close) * 100 : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={instrument?.name || symbol}
        description={`${symbol} · NSE_INDEX`}
        actions={
          <Link to="/indices" className="text-sm text-slate-500 underline hover:text-slate-700">
            ← Back to indices
          </Link>
        }
      />

      {latest && (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Last close</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatPrice(latest.close)}
              </p>
            </div>
            {change != null && (
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Change</p>
                <p className={
                  'text-lg font-medium ' +
                  (change >= 0 ? 'text-emerald-600' : 'text-red-600')
                }>
                  {change >= 0 ? '+' : ''}{formatPrice(change)} ({changePct?.toFixed(2)}%)
                </p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Latest session</p>
              <p className="text-lg font-medium text-slate-900">
                {new Date(latest.ts).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
            <div className="ml-auto">
              <Badge tone="neutral">{candles.length.toLocaleString()} bars</Badge>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={
                'rounded-md px-3 py-1.5 font-medium transition-colors ' +
                (range === r.value
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50')
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <Card className="overflow-hidden">
        <div className="relative h-105">
          <div ref={chartContainerRef} className="h-full w-full" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Spinner size="lg" />
            </div>
          )}
          {!loading && candles.length === 0 && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              No data for the selected range. Run a sync to populate this index.
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardBody className="px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-900">Constituents</p>
            <Badge tone="neutral">
              {constituentSymbols.length === 0
                ? '—'
                : `${constituents.length} of ${constituentSymbols.length}`}
            </Badge>
          </div>
          {constituentsLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" /> Loading constituents from NSE…
            </div>
          ) : constituentsError ? (
            <Alert tone="error">{constituentsError}</Alert>
          ) : constituentSymbols.length === 0 ? (
            <EmptyState
              title="No constituents available"
              description="NSE doesn't publish a constituent list for this index."
            />
          ) : constituents.length === 0 ? (
            <p className="text-sm text-slate-500">
              {constituentSymbols.length} constituents from NSE — none are in the instruments table yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {constituents.map((c) => (
                <ConstituentCard key={`${c.segment}|${c.symbol}`} instrument={c} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
