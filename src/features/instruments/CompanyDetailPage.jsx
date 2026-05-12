import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  createChart,
} from 'lightweight-charts';

import {
  Alert,
  Badge,
  Card,
  CardBody,
  PageHeader,
  Spinner,
} from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { instrumentsApi } from './instruments.api.js';
import { LogoUploader } from './LogoUploader.jsx';

const RANGES = [
  { value: '1M',  label: '1M',  days: 30 },
  { value: '3M',  label: '3M',  days: 90 },
  { value: '6M',  label: '6M',  days: 180 },
  { value: '1Y',  label: '1Y',  days: 365 },
  { value: '5Y',  label: '5Y',  days: 365 * 5 },
  { value: 'ALL', label: 'All', days: null },
];

const TIMEFRAMES = [
  { value: '1d', label: '1D' },
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

const formatVolume = (n) => {
  if (n == null) return '—';
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  return n.toLocaleString('en-IN');
};

export function CompanyDetailPage() {
  const { segment, symbol } = useParams();

  const [instrument, setInstrument] = useState(null);
  const [candles, setCandles] = useState([]);
  const [range, setRange] = useState('1Y');
  const [timeframe, setTimeframe] = useState('1d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    instrumentsApi.getOne(segment, symbol)
      .then((inst) => { if (!cancelled) setInstrument(inst); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [segment, symbol]);

  const loadCandles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const days = RANGES.find((r) => r.value === range)?.days;
      const from = fromDateForRange(days);
      const data = await instrumentsApi.candles(segment, symbol, { timeframe, from });
      setCandles(data.candles ?? []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load price history'));
      setCandles([]);
    } finally {
      setLoading(false);
    }
  }, [segment, symbol, range, timeframe]);

  useEffect(() => { loadCandles(); }, [loadCandles]);

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

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      color: '#94a3b8',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.75, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const candleData = candles.map((c) => ({
      time: toUnixSec(c.ts),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    const volumeData = candles.map((c) => ({
      time: toUnixSec(c.ts),
      value: c.volume,
      color: c.close >= c.open ? 'rgba(22, 163, 74, 0.4)' : 'rgba(220, 38, 38, 0.4)',
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    if (candleData.length > 0) chartRef.current?.timeScale().fitContent();
  }, [candles]);

  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const change = latest && previous ? latest.close - previous.close : null;
  const changePct = latest && previous ? (change / previous.close) * 100 : null;

  const headerActions = useMemo(() => (
    <div className="flex items-center gap-4">
      <Link
        to={`/companies/${encodeURIComponent(segment)}/${encodeURIComponent(symbol)}/edit`}
        className="text-sm font-medium text-slate-700 hover:text-slate-900"
      >
        Edit
      </Link>
      <Link to="/companies" className="text-sm text-slate-500 underline hover:text-slate-700">
        ← Back to companies
      </Link>
    </div>
  ), [segment, symbol]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={instrument?.name || symbol}
        description={
          instrument
            ? `${instrument.symbol} · ${instrument.segment} · ISIN ${instrument.isin || '—'}`
            : `${symbol} · ${segment}`
        }
        actions={headerActions}
      />

      {instrument && (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-5 px-6 py-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              {instrument.logoUrl ? (
                <img
                  src={instrument.logoUrl}
                  alt=""
                  className="h-full w-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <span className="text-lg font-semibold text-slate-500">
                  {(instrument.symbol || '?').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{instrument.name}</p>
              <p className="text-xs text-slate-500">
                {instrument.symbol} · {instrument.segment} · ISIN {instrument.isin || '—'}
              </p>
            </div>
            <LogoUploader
              segment={instrument.segment}
              symbol={instrument.symbol}
              currentUrl={instrument.logoUrl}
              onUpdated={setInstrument}
            />
          </CardBody>
        </Card>
      )}

      {latest && (
        <Card>
          <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Last close</p>
              <p className="text-2xl font-semibold text-slate-900">
                ₹ {formatPrice(latest.close)}
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
              <p className="text-xs uppercase tracking-wide text-slate-500">Volume</p>
              <p className="text-lg font-medium text-slate-900">
                {formatVolume(latest.volume)}
              </p>
            </div>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setTimeframe(tf.value)}
              className={
                'rounded-md px-3 py-1.5 font-medium transition-colors ' +
                (timeframe === tf.value
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50')
              }
            >
              {tf.label}
            </button>
          ))}
        </div>
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
        <div className="relative h-[480px]">
          <div ref={chartContainerRef} className="h-full w-full" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Spinner size="lg" />
            </div>
          )}
          {!loading && candles.length === 0 && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              No data for the selected range and timeframe.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
