import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  PageHeader,
  Spinner,
} from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { syncApi } from './sync.api.js';
import { useSyncStream } from './useSyncStream.js';

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatNumber = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));

const isUpToDate = (lastCandle) => {
  if (!lastCandle) return false;
  const last = new Date(lastCandle).getTime();
  if (Number.isNaN(last)) return false;
  return (Date.now() - last) < 3 * 24 * 60 * 60 * 1000;
};

const cardStateFor = (item, currentRun, lastFinished, evt) => {
  const symbol = item.symbol;
  const isRunning = currentRun && currentRun.status === 'running';
  if (isRunning && evt && evt.status === 'streaming') {
    return { state: 'syncing', runId: currentRun.runId };
  }
  if (isRunning && evt && (evt.status === 'ok' || evt.status === 'skipped')) {
    return { state: evt.status, runId: currentRun.runId };
  }
  if (isRunning && evt && evt.status === 'failed') {
    return { state: 'failed', runId: currentRun.runId };
  }
  if (isRunning) {
    const scope = currentRun.scope ?? {};
    const symbols = Array.isArray(scope.symbols) ? scope.symbols : null;
    const isIndicesRun = Array.isArray(scope.segments) && scope.segments.includes('NSE_INDEX');
    if (symbols ? symbols.includes(symbol) : isIndicesRun) {
      if (isUpToDate(item.lastCandle)) {
        return { state: 'skipped', runId: currentRun.runId };
      }
      return { state: 'queued', runId: currentRun.runId };
    }
  }
  if (lastFinished && lastFinished.symbols.includes(symbol)) {
    return { state: lastFinished.status, runId: lastFinished.runId };
  }
  return { state: 'idle', runId: null };
};

export function IndicesSyncPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [lastFinished, setLastFinished] = useState(null);

  const { status: streamStatus, currentRun, recentProgress } = useSyncStream({ enabled: true });

  const loadCoverage = useCallback(async (signal) => {
    try {
      const data = await syncApi.indicesCoverage(signal);
      setItems(data);
      setError(null);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      setError(extractErrorMessage(err, 'Failed to load indices coverage'));
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      await loadCoverage(ctrl.signal);
      setLoading(false);
    })();
    return () => ctrl.abort();
  }, [loadCoverage]);

  useEffect(() => {
    if (!currentRun || currentRun.status === 'running') return;
    const scope = currentRun.scope ?? {};
    const symbols = Array.isArray(scope.symbols)
      ? scope.symbols
      : items.map((i) => i.symbol);
    setLastFinished({
      runId: currentRun.runId,
      status: currentRun.status,
      symbols,
    });
    const ctrl = new AbortController();
    queueMicrotask(() => {
      if (!ctrl.signal.aborted) loadCoverage(ctrl.signal);
    });
    return () => ctrl.abort();
  }, [currentRun, items, loadCoverage]);

  const progressBySymbol = useMemo(() => {
    const map = new Map();
    for (const evt of recentProgress) {
      if (!evt?.symbol) continue;
      map.set(evt.symbol, evt);
    }
    return map;
  }, [recentProgress]);

  const lastEvent = recentProgress.length ? recentProgress[recentProgress.length - 1] : null;
  useEffect(() => {
    if (!lastEvent) return;
    if (!['ok', 'failed', 'skipped'].includes(lastEvent.status)) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      if (!ctrl.signal.aborted) loadCoverage(ctrl.signal);
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [lastEvent, loadCoverage]);

  const anyRunning = currentRun?.status === 'running';

  const triggerOne = async (symbol) => {
    setBusy(symbol);
    setNotice(null);
    setError(null);
    try {
      await syncApi.triggerOneIndex(symbol);
      setNotice(`Sync started for ${symbol}…`);
    } catch (err) {
      if (err?.response?.status === 409) {
        setError('A sync is already in progress. Wait for it to finish.');
      } else {
        setError(extractErrorMessage(err, `Failed to sync ${symbol}`));
      }
    } finally {
      setBusy(null);
    }
  };

  const triggerAll = async () => {
    setBusy('__all__');
    setNotice(null);
    setError(null);
    try {
      await syncApi.triggerIndices();
      setNotice('Indices sync started for all symbols…');
    } catch (err) {
      if (err?.response?.status === 409) {
        setError('A sync is already in progress. Wait for it to finish.');
      } else {
        setError(extractErrorMessage(err, 'Failed to start indices sync'));
      }
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Indices sync"
        description="Backfill or refresh 1d candles for each NSE benchmark/sectoral index."
        actions={
          <Link to="/sync" className="text-sm text-slate-500 underline hover:text-slate-700">
            ← Back to data sync
          </Link>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-900">All indices</p>
            <p className="text-xs text-slate-500">
              Runs every index sequentially. {anyRunning ? 'A sync is currently running.' : ''}
            </p>
          </div>
          <Button
            onClick={triggerAll}
            loading={busy === '__all__'}
            disabled={Boolean(busy) || anyRunning}
          >
            Sync all indices
          </Button>
        </CardBody>
      </Card>

      {streamStatus === 'unavailable' && (
        <Alert tone="warning">Live updates unavailable — refresh to see progress.</Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const evt = progressBySymbol.get(item.symbol);
          const card = cardStateFor(item, currentRun, lastFinished, evt);
          const isSyncing = card.state === 'syncing';
          const isThisCardBusy = busy === item.symbol;
          const disabled = Boolean(busy) || anyRunning;

          let stateBadge = null;
          if (isSyncing) stateBadge = <Badge tone="info">Syncing</Badge>;
          else if (card.state === 'queued') stateBadge = <Badge tone="neutral">Queued</Badge>;
          else if (card.state === 'ok') stateBadge = <Badge tone="success">Done</Badge>;
          else if (card.state === 'skipped') stateBadge = <Badge tone="neutral">Up to date</Badge>;
          else if (card.state === 'partial') stateBadge = <Badge tone="warning">Partial</Badge>;
          else if (card.state === 'failed') stateBadge = <Badge tone="danger">Failed</Badge>;

          return (
            <Card key={item.symbol}>
              <CardBody className="flex flex-col gap-3 px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.symbol}
                    </p>
                    <p className="truncate text-xs text-slate-500">{item.name ?? '—'}</p>
                  </div>
                  {stateBadge}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Last candle</p>
                    <p className="font-medium text-slate-900">{formatDate(item.lastCandle)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Bars</p>
                    <p className="font-medium text-slate-900">{formatNumber(item.barCount)}</p>
                  </div>
                </div>

                <div className="h-1.5 overflow-hidden rounded bg-slate-200">
                  {isSyncing && evt?.status === 'streaming' && evt.subTotal > 0 ? (
                    <div
                      className="h-1.5 rounded bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, Math.round((evt.subDone / evt.subTotal) * 100))}%` }}
                    />
                  ) : isSyncing ? (
                    <div className="h-1.5 w-1/3 animate-pulse rounded bg-emerald-400" />
                  ) : card.state === 'ok' ? (
                    <div className="h-1.5 w-full rounded bg-emerald-500" />
                  ) : card.state === 'skipped' ? (
                    <div className="h-1.5 w-full rounded bg-slate-400" />
                  ) : card.state === 'failed' ? (
                    <div className="h-1.5 w-full rounded bg-red-500" />
                  ) : card.state === 'partial' ? (
                    <div className="h-1.5 w-full rounded bg-amber-500" />
                  ) : card.state === 'queued' ? (
                    <div className="h-1.5 w-1/12 rounded bg-slate-300" />
                  ) : null}
                </div>

                {evt && (
                  <p className="truncate text-xs text-slate-500">
                    {evt.status === 'streaming' && evt.subTotal > 0 &&
                      `Day ${formatNumber(evt.subDone)} of ${formatNumber(evt.subTotal)} · ${formatNumber(evt.fetched ?? 0)} bars`}
                    {evt.status === 'ok' && evt.fetched != null && `Fetched ${formatNumber(evt.fetched)} bars`}
                    {evt.status === 'failed' && evt.error}
                    {evt.status === 'skipped' && 'Already up to date'}
                  </p>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => triggerOne(item.symbol)}
                  loading={isThisCardBusy}
                  disabled={disabled}
                >
                  {isSyncing ? 'Syncing…' : card.state === 'queued' ? 'Queued' : 'Sync this index'}
                </Button>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
