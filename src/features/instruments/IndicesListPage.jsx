import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
} from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { instrumentsApi } from './instruments.api.js';

export function IndicesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await instrumentsApi.list({
          segment: 'NSE_INDEX',
          type: 'all',
          limit: 100,
        });
        if (cancelled) return;
        const all = data.items ?? [];
        const filtered = (await Promise.all(
          all.map(async (i) => {
            try {
              const c = await instrumentsApi.indexConstituents(i.symbol);
              return (c.total ?? 0) > 0 ? i : null;
            } catch {
              return null;
            }
          }),
        )).filter(Boolean);
        if (!cancelled) setItems(filtered);
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err, 'Failed to load indices'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const goToIndex = (i) =>
    navigate(`/indices/${encodeURIComponent(i.symbol)}`);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Indices"
        description="NSE benchmark and sectoral indices."
        actions={<Badge tone="neutral">{items.length} indices</Badge>}
      />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No indices yet"
          description="Run the SQL seed to populate NSE_INDEX rows."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Segment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => (
                  <tr
                    key={`${i.segment}|${i.symbol}`}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => goToIndex(i)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{i.symbol}</td>
                    <td className="px-4 py-3 text-slate-700">{i.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{i.segment}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 md:hidden">
            {items.map((i) => (
              <li
                key={`${i.segment}|${i.symbol}`}
                className="flex cursor-pointer flex-col gap-1 px-4 py-3 hover:bg-slate-50"
                onClick={() => goToIndex(i)}
              >
                <p className="text-sm font-medium text-slate-900">{i.symbol}</p>
                <p className="truncate text-xs text-slate-500">{i.name ?? '—'}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
