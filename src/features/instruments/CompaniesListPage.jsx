import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
} from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { instrumentsApi } from './instruments.api.js';
import { NIFTY_50 } from './nifty50.js';

const PAGE_SIZE = 20;

function LogoCell({ symbol, name, url, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        className={`${sizeClass} rounded-md bg-slate-100 object-contain`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  const initials = (symbol || name || '?').slice(0, 2).toUpperCase();
  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-md bg-slate-200 text-xs font-semibold text-slate-600`}
    >
      {initials}
    </div>
  );
}

function Nifty50Row() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    instrumentsApi.bySymbols(NIFTY_50)
      .then((data) => { if (!cancelled) setItems(data.items ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
          <Spinner size="sm" /> Loading NIFTY 50…
        </div>
      </Card>
    );
  }
  if (items.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">NIFTY 50</h3>
          <p className="text-xs text-slate-500">India&apos;s 50 most-traded stocks</p>
        </div>
        <Badge tone="neutral">{items.length}</Badge>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-4 pt-3 [scrollbar-width:thin]">
        {items.map((c) => (
          <Link
            key={`${c.segment}|${c.symbol}`}
            to={`/companies/${encodeURIComponent(c.segment)}/${encodeURIComponent(c.symbol)}`}
            className="group flex w-32 shrink-0 snap-start flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            <LogoCell symbol={c.symbol} name={c.name} url={c.logoUrl} size="lg" />
            <p className="w-full truncate text-xs font-semibold text-slate-900">
              {c.symbol}
            </p>
            <p className="line-clamp-2 w-full text-[10px] leading-tight text-slate-500">
              {c.name}
            </p>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function CompaniesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [logoFilter, setLogoFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [logoFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await instrumentsApi.list({
        page,
        limit: PAGE_SIZE,
        search,
        hasLogo:
          logoFilter === 'with' ? true : logoFilter === 'without' ? false : undefined,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load companies'));
    } finally {
      setLoading(false);
    }
  }, [page, search, logoFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  const goToCompany = (c) =>
    navigate(`/companies/${encodeURIComponent(c.segment)}/${encodeURIComponent(c.symbol)}`);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Companies"
        description="NSE-listed equities synced from the data scraper."
        actions={
          <Badge tone="neutral">
            {total.toLocaleString()} {total === 1 ? 'company' : 'companies'}
          </Badge>
        }
      />

      <Nifty50Row />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="max-w-sm flex-1">
          <Input
            name="search"
            type="search"
            placeholder="Search by symbol, name, or ISIN"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs">
          {[
            { value: 'all', label: 'All' },
            { value: 'with', label: 'With logo' },
            { value: 'without', label: 'No logo' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLogoFilter(opt.value)}
              className={
                'rounded-md px-3 py-1.5 font-medium transition-colors ' +
                (logoFilter === opt.value
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50')
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={search ? 'No companies match your search' : 'No companies yet'}
          description={
            search
              ? 'Try a different symbol, company name, or ISIN.'
              : 'Run the data scraper to sync NSE instruments.'
          }
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-12 px-4 py-3" />
                    <th className="px-4 py-3 font-medium">Symbol</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">ISIN</th>
                    <th className="px-4 py-3 font-medium">Segment</th>
                    <th className="px-4 py-3 font-medium">Lot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((c) => (
                    <tr
                      key={`${c.segment}|${c.symbol}`}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => goToCompany(c)}
                    >
                      <td className="px-4 py-2">
                        <LogoCell symbol={c.symbol} name={c.name} url={c.logoUrl} />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {c.symbol}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.name ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {c.isin ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="neutral">{c.segment}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.lotSize ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {items.map((c) => (
                <li
                  key={`${c.segment}|${c.symbol}`}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
                  onClick={() => goToCompany(c)}
                >
                  <LogoCell symbol={c.symbol} name={c.name} url={c.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {c.symbol}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {c.name ?? '—'}
                    </p>
                  </div>
                  <Badge tone="neutral">{c.segment}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages.toLocaleString()} · {total.toLocaleString()} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
