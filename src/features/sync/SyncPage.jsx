import { useCallback, useEffect, useMemo, useState } from 'react';

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

const STATUS_TONE = {
  ok: 'success',
  partial: 'warning',
  failed: 'error',
  running: 'neutral',
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatDuration = (start, end) => {
  if (!start || !end) return '—';
  const ms = new Date(end) - new Date(start);
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs}s`;
};

const formatNumber = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));

export function SyncPage() {
  const [health, setHealth] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [symbolsInput, setSymbolsInput] = useState('');

  const refresh = useCallback(async (signal) => {
    try {
      const [h, r] = await Promise.all([
        syncApi.health(signal),
        syncApi.listRuns(50, signal),
      ]);
      setHealth(h);
      setRuns(r);
      setError(null);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      setError(extractErrorMessage(err, 'Failed to load sync status'));
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      await refresh(ctrl.signal);
      setLoading(false);
    })();
    return () => ctrl.abort();
  }, [refresh]);

  const isRunning = health?.isRunning;
  useEffect(() => {
    if (!isRunning) return undefined;
    let inFlight = false;
    let ctrl = null;
    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      ctrl = new AbortController();
      try { await refresh(ctrl.signal); } finally { inFlight = false; }
    };
    const id = setInterval(tick, 4000);
    return () => {
      clearInterval(id);
      ctrl?.abort();
    };
  }, [isRunning, refresh]);

  const handleTrigger = async (scopeOverride) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const scope = scopeOverride ?? null;
      await syncApi.triggerDaily(scope);
      setNotice('Sync started — refreshing status…');
      setTimeout(refresh, 1000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to start sync'));
    } finally {
      setBusy(false);
    }
  };

  const handleTriggerAll = () => handleTrigger(null);
  const handleTriggerSymbols = () => {
    const symbols = symbolsInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (!symbols.length) {
      setError('Enter at least one symbol (comma-separated)');
      return;
    }
    handleTrigger({ symbols });
  };
  const handleTriggerIndicesOnly = () =>
    handleTrigger({ segments: ['NSE_INDEX'] });

  const driftCard = useMemo(() => {
    const d = health?.drift;
    if (!d) return null;
    return (
      <Card>
        <CardBody className="px-6 py-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Data drift</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatNumber(d.companiesBehind)}
            <span className="ml-1 text-base font-normal text-slate-500">
              / {formatNumber(d.companiesTotal)}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            companies more than a day behind
            {d.p95LagDays != null && ` · p95 lag ${d.p95LagDays.toFixed(1)} days`}
          </p>
        </CardBody>
      </Card>
    );
  }, [health]);

  const lastSuccessCard = useMemo(() => {
    const last = health?.lastDailySuccess;
    return (
      <Card>
        <CardBody className="px-6 py-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Last successful daily sync</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {last ? formatDate(last.finishedAt) : 'Never'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {last ? `${formatNumber(last.rowsUpserted)} rows upserted` : 'No successful run yet'}
          </p>
        </CardBody>
      </Card>
    );
  }, [health]);

  const statusCard = (
    <Card>
      <CardBody className="px-6 py-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Current state</p>
        <div className="mt-2 flex items-center gap-2">
          {isRunning ? (
            <>
              <Spinner size="sm" />
              <span className="text-lg font-semibold text-slate-900">Running…</span>
            </>
          ) : (
            <span className="text-lg font-semibold text-slate-900">Idle</span>
          )}
        </div>
      </CardBody>
    </Card>
  );

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
        title="Data sync"
        description="Trigger and monitor daily candle syncs (jugaad source)."
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statusCard}
        {lastSuccessCard}
        {driftCard}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3 px-6 py-4">
          <p className="text-sm font-medium text-slate-900">Run a sync</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleTriggerAll} loading={busy} disabled={busy || isRunning}>
              Run full daily sync
            </Button>
            <Button
              variant="secondary"
              onClick={handleTriggerIndicesOnly}
              loading={busy}
              disabled={busy || isRunning}
            >
              Indices only
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="RELIANCE, TCS, NIFTY 50"
              value={symbolsInput}
              onChange={(e) => setSymbolsInput(e.target.value)}
              className="flex-1 min-w-65 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
              disabled={busy || isRunning}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTriggerSymbols}
              loading={busy}
              disabled={busy || isRunning}
            >
              Sync these symbols
            </Button>
          </div>
          {isRunning && (
            <p className="text-xs text-slate-500">
              A sync is already in progress. Wait for it to finish before starting another.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="px-6 py-4">
          <p className="mb-3 text-sm font-medium text-slate-900">Recent runs</p>
          {runs.length === 0 ? (
            <p className="text-sm text-slate-500">No runs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Started</th>
                    <th className="py-2 pr-3">Kind</th>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Companies</th>
                    <th className="py-2 pr-3">Rows</th>
                    <th className="py-2 pr-3">Duration</th>
                    <th className="py-2 pr-3">By</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3 text-slate-700">{formatDate(r.startedAt)}</td>
                      <td className="py-2 pr-3 text-slate-700">{r.kind}</td>
                      <td className="py-2 pr-3 text-slate-700">{r.source}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-slate-700">
                        {r.companiesOk ?? 0}/{r.companiesTotal ?? 0}
                        {r.companiesFailed > 0 && (
                          <span className="text-red-600"> · {r.companiesFailed} failed</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-slate-700">{formatNumber(r.rowsUpserted)}</td>
                      <td className="py-2 pr-3 text-slate-700">
                        {formatDuration(r.startedAt, r.finishedAt)}
                      </td>
                      <td className="py-2 pr-3 text-xs text-slate-500">{r.triggeredBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
