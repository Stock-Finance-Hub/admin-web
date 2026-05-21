import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  PageHeader,
  Spinner,
} from "../../components/index.js";
import { extractErrorMessage } from "../../lib/api.js";
import { syncApi } from "./sync.api.js";
import { useSyncStream } from "./useSyncStream.js";

const STATUS_TONE = {
  ok: "success",
  partial: "warning",
  failed: "error",
  running: "neutral",
};

const PROGRESS_TONE = {
  ok: "success",
  failed: "danger",
  skipped: "warning",
  running: "info",
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (start, end) => {
  if (!start || !end) return "—";
  const ms = new Date(end) - new Date(start);
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs}s`;
};

const formatNumber = (n) =>
  n == null ? "—" : Number(n).toLocaleString("en-IN");

export function SyncPage() {
  const [health, setHealth] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [symbolsInput, setSymbolsInput] = useState("");

  const {
    status: streamStatus,
    currentRun,
    recentProgress,
  } = useSyncStream({ enabled: true });

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
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
      setError(extractErrorMessage(err, "Failed to load sync status"));
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
  const wsOpen = streamStatus === "open";
  useEffect(() => {
    if (!isRunning || wsOpen) return undefined;
    let inFlight = false;
    let ctrl = null;
    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      ctrl = new AbortController();
      try {
        await refresh(ctrl.signal);
      } finally {
        inFlight = false;
      }
    };
    const id = setInterval(tick, 4000);
    return () => {
      clearInterval(id);
      ctrl?.abort();
    };
  }, [isRunning, wsOpen, refresh]);

  useEffect(() => {
    if (!wsOpen) return undefined;
    if (!currentRun) return undefined;
    if (currentRun.status === "running") return undefined;
    const ctrl = new AbortController();
    queueMicrotask(() => {
      if (!ctrl.signal.aborted) refresh(ctrl.signal);
    });
    return () => ctrl.abort();
  }, [wsOpen, currentRun, refresh]);

  const handleTrigger = async (scopeOverride) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const scope = scopeOverride ?? null;
      await syncApi.triggerDaily(scope);
      setNotice("Sync started — refreshing status…");
      setTimeout(refresh, 1000);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to start sync"));
    } finally {
      setBusy(false);
    }
  };

  const handleTriggerAll = () => handleTrigger(null);
  const handleTriggerSymbols = () => {
    const symbols = symbolsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!symbols.length) {
      setError("Enter at least one symbol (comma-separated)");
      return;
    }
    handleTrigger({ symbols });
  };
  const handleTriggerIndicesOnly = async () => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await syncApi.triggerIndices();
      setNotice("Indices sync started — refreshing status…");
      setTimeout(refresh, 1000);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to start indices sync"));
    } finally {
      setBusy(false);
    }
  };

  const driftCard = useMemo(() => {
    const d = health?.drift;
    if (!d) return null;
    return (
      <Card>
        <CardBody className="px-6 py-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Data drift
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatNumber(d.companiesBehind)}
            <span className="ml-1 text-base font-normal text-slate-500">
              / {formatNumber(d.companiesTotal)}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            companies more than a day behind
            {d.p95LagDays != null &&
              ` · p95 lag ${d.p95LagDays.toFixed(1)} days`}
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
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Last successful daily sync
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {last ? formatDate(last.finishedAt) : "Never"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {last
              ? `${formatNumber(last.rowsUpserted)} rows upserted`
              : "No successful run yet"}
          </p>
        </CardBody>
      </Card>
    );
  }, [health]);

  const liveProgress = wsOpen && currentRun;
  const progressTotal = liveProgress ? (currentRun.total ?? 0) : 0;
  const progressIndex = liveProgress ? (currentRun.index ?? 0) : 0;
  const progressPct =
    liveProgress && progressTotal > 0
      ? Math.min(100, Math.round((progressIndex / progressTotal) * 100))
      : 0;
  const scopeLabel = (() => {
    if (!liveProgress) return null;
    const s = currentRun.scope;
    if (!s) return "all instruments";
    if (Array.isArray(s.segments) && s.segments.length) {
      if (s.segments.length === 1 && s.segments[0] === "NSE_INDEX")
        return "indices";
      if (s.segments.length === 1 && s.segments[0] === "NSE_EQ")
        return "equities";
      return s.segments.join(", ");
    }
    if (Array.isArray(s.symbols)) {
      return s.symbols.length === 1
        ? s.symbols[0]
        : `${s.symbols.length} symbols`;
    }
    if (s.index) return s.index;
    if (typeof s === "string") return s;
    return "all instruments";
  })();
  const lastSymbol = recentProgress.length
    ? recentProgress[recentProgress.length - 1].symbol
    : null;

  const statusCard = (
    <Card>
      <CardBody className="px-6 py-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Current state
        </p>
        <div className="mt-2 flex items-center gap-2">
          {liveProgress && currentRun.status === "running" ? (
            <>
              <Spinner size="sm" />
              <span className="text-lg font-semibold text-slate-900">
                Syncing {scopeLabel}
                {progressTotal > 0 && (
                  <span className="ml-1 text-base font-normal text-slate-500">
                    ({progressIndex} of {progressTotal})
                  </span>
                )}
              </span>
            </>
          ) : liveProgress ? (
            <span className="text-lg font-semibold text-slate-900">
              {currentRun.status === "ok" && "Finished"}
              {currentRun.status === "partial" && "Finished with errors"}
              {currentRun.status === "failed" && "Failed"}
              {!["ok", "partial", "failed"].includes(currentRun.status) &&
                currentRun.status}
            </span>
          ) : isRunning ? (
            <>
              <Spinner size="sm" />
              <span className="text-lg font-semibold text-slate-900">
                Running…
              </span>
            </>
          ) : (
            <span className="text-lg font-semibold text-slate-900">Idle</span>
          )}
        </div>
        {liveProgress && currentRun.status === "running" && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded bg-slate-200">
              {progressTotal > 0 ? (
                <div
                  className="h-2 rounded bg-emerald-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              ) : (
                <div className="h-2 w-1/3 animate-pulse rounded bg-emerald-400" />
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>
                {lastSymbol ? `Current: ${lastSymbol}` : "Preparing…"}
              </span>
              <span>{progressTotal > 0 ? `${progressPct}%` : ""}</span>
            </div>
          </div>
        )}
        {streamStatus === "unavailable" && (
          <p className="mt-2 text-xs text-slate-400">
            Live updates unavailable, polling instead
          </p>
        )}
      </CardBody>
    </Card>
  );

  const reversedLog = useMemo(
    () => recentProgress.slice(-10).reverse(),
    [recentProgress],
  );
  const progressLog =
    liveProgress && reversedLog.length > 0 ? (
      <Card>
        <CardBody className="px-6 py-4">
          <p className="mb-2 text-sm font-medium text-slate-900">
            Live progress
          </p>
          <div className="max-h-48 overflow-y-auto">
            <ul className="space-y-1 text-xs">
              {reversedLog.map((evt, idx) => (
                <li
                  key={`${evt.runId}-${evt.index}-${idx}`}
                  className="flex items-center gap-2"
                >
                  <span className="font-mono text-slate-700">
                    {evt.symbol ?? "—"}
                  </span>
                  <Badge tone={PROGRESS_TONE[evt.status] ?? "neutral"}>
                    {evt.status}
                  </Badge>
                  {evt.error && (
                    <span className="truncate text-red-600" title={evt.error}>
                      · {evt.error}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </CardBody>
      </Card>
    ) : null;

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

      {progressLog}

      <Card>
        <CardBody className="flex flex-col gap-3 px-6 py-4">
          <p className="text-sm font-medium text-slate-900">Run a sync</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleTriggerAll}
              loading={busy}
              disabled={busy || isRunning}
            >
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
            <Link
              to="/sync/indices"
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              Per-index sync →
            </Link>
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
              A sync is already in progress. Wait for it to finish before
              starting another.
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
                      <td className="py-2 pr-3 text-slate-700">
                        {formatDate(r.startedAt)}
                      </td>
                      <td className="py-2 pr-3 text-slate-700">{r.kind}</td>
                      <td className="py-2 pr-3 text-slate-700">{r.source}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-slate-700">
                        {r.companiesOk ?? 0}/{r.companiesTotal ?? 0}
                        {r.companiesFailed > 0 && (
                          <span className="text-red-600">
                            {" "}
                            · {r.companiesFailed} failed
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-slate-700">
                        {formatNumber(r.rowsUpserted)}
                      </td>
                      <td className="py-2 pr-3 text-slate-700">
                        {formatDuration(r.startedAt, r.finishedAt)}
                      </td>
                      <td className="py-2 pr-3 text-xs text-slate-500">
                        {r.triggeredBy}
                      </td>
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
