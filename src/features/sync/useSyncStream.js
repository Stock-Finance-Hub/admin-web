import { useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '../../lib/config.js';
import { syncApi } from './sync.api.js';

const BACKOFFS = [1000, 2000, 5000, 15000, 30000];
const MAX_LOG = 50;

const deriveWsBase = () => {
  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = new URL(API_BASE_URL, fallbackOrigin);
  const proto = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${url.host}`;
};

export function useSyncStream({ enabled = true } = {}) {
  const [status, setStatus] = useState(enabled ? 'connecting' : 'closed');
  const [lastEvent, setLastEvent] = useState(null);
  const [currentRun, setCurrentRun] = useState(null);
  const [recentProgress, setRecentProgress] = useState([]);

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const attemptRef = useRef(0);
  const enabledRef = useRef(enabled);
  const unmountedRef = useRef(false);
  const statusRef = useRef(status);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    unmountedRef.current = false;

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const closeSocket = () => {
      const ws = wsRef.current;
      wsRef.current = null;
      if (!ws) return;
      try {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, 'client cleanup');
        }
      } catch {
        wsRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (!enabledRef.current || unmountedRef.current) return;
      if (statusRef.current === 'unavailable') return;
      const delay = BACKOFFS[Math.min(attemptRef.current, BACKOFFS.length - 1)];
      attemptRef.current += 1;
      clearReconnect();
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    const handleEvent = (evt) => {
      setLastEvent(evt);
      switch (evt.type) {
        case 'snapshot': {
          if (evt.isRunning && evt.currentRun) {
            const r = evt.currentRun;
            setCurrentRun({
              runId: r.id,
              total: r.total ?? r.progress?.total ?? null,
              index: r.progress?.index ?? r.index ?? 0,
              status: r.status ?? 'running',
              scope: r.scope ?? null,
            });
          } else {
            setCurrentRun(null);
          }
          break;
        }
        case 'started': {
          setCurrentRun({
            runId: evt.runId,
            total: evt.total ?? null,
            index: 0,
            status: 'running',
            scope: evt.scope ?? null,
          });
          setRecentProgress([]);
          break;
        }
        case 'progress': {
          setCurrentRun((prev) => {
            const base = prev && prev.runId === evt.runId
              ? prev
              : { runId: evt.runId, total: evt.total ?? null, index: 0, status: 'running', scope: null };
            return {
              ...base,
              total: evt.total ?? base.total,
              index: evt.index ?? base.index,
              status: 'running',
            };
          });
          setRecentProgress((prev) => {
            const next = prev.length >= MAX_LOG ? prev.slice(prev.length - MAX_LOG + 1) : prev.slice();
            next.push(evt);
            return next;
          });
          break;
        }
        case 'finished': {
          setCurrentRun((prev) => {
            if (!prev || prev.runId !== evt.runId) {
              return {
                runId: evt.runId,
                total: prev?.total ?? null,
                index: prev?.index ?? 0,
                status: evt.status,
                scope: prev?.scope ?? null,
              };
            }
            return { ...prev, status: evt.status };
          });
          break;
        }
        case 'error': {
          closeSocket();
          setStatus('closed');
          break;
        }
        case 'ping':
        default:
          break;
      }
    };

    async function connect() {
      if (!enabledRef.current || unmountedRef.current) return;
      setStatus('connecting');
      let ticketResp;
      try {
        ticketResp = await syncApi.wsTicket();
      } catch (err) {
        if (err?.response?.status === 503) {
          setStatus('unavailable');
          return;
        }
        scheduleReconnect();
        return;
      }
      if (!ticketResp?.ticket || unmountedRef.current || !enabledRef.current) return;

      let ws;
      try {
        const wsBase = deriveWsBase();
        ws = new WebSocket(`${wsBase}/ws/sync?ticket=${encodeURIComponent(ticketResp.ticket)}`);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        setStatus('open');
      };
      ws.onmessage = (msg) => {
        if (typeof msg.data !== 'string') return;
        let data;
        try {
          data = JSON.parse(msg.data);
        } catch {
          return;
        }
        handleEvent(data);
      };
      ws.onerror = () => {};
      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null;
        if (unmountedRef.current) return;
        if (event.code === 4401) {
          setStatus('closed');
          return;
        }
        setStatus('closed');
        scheduleReconnect();
      };
    }

    if (enabled) {
      attemptRef.current = 0;
      connect();
    } else {
      closeSocket();
      clearReconnect();
      queueMicrotask(() => {
        if (!unmountedRef.current && !enabledRef.current) setStatus('closed');
      });
    }

    return () => {
      unmountedRef.current = true;
      clearReconnect();
      closeSocket();
    };
  }, [enabled]);

  return { status, lastEvent, currentRun, recentProgress };
}
