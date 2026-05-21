import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Spinner,
} from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { researchApi } from './research.api.js';

const PAGE_SIZE = 20;

const SEGMENT_OPTIONS = [
  { value: '', label: 'All segments' },
  { value: 'NSE_EQ', label: 'NSE_EQ' },
  { value: 'NSE_INDEX', label: 'NSE_INDEX' },
];

const formatReportDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      dateStyle: 'medium',
    });
  } catch {
    return value;
  }
};

export function ResearchListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [segment, setSegment] = useState('');
  const [symbolInput, setSymbolInput] = useState('');
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSymbol(symbolInput.trim().toUpperCase());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [symbolInput]);

  useEffect(() => {
    setPage(1);
  }, [segment]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await researchApi.list({
        page,
        limit: PAGE_SIZE,
        segment: segment || undefined,
        symbol: symbol || undefined,
        includeDrafts: true,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load research reports'));
    } finally {
      setLoading(false);
    }
  }, [page, segment, symbol]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  const onConfirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await researchApi.remove(deleting.id);
      setItems((prev) => prev.filter((r) => r.id !== deleting.id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleting(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete report'));
    } finally {
      setDeletePending(false);
    }
  };

  const hasFilters = Boolean(segment || symbol);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Research"
        description="Long-form company research with free / premium tiers."
        actions={
          <Button onClick={() => navigate('/research/new')}>New report</Button>
        }
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_1fr]">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="segment-filter"
              className="text-sm font-medium text-slate-700"
            >
              Segment
            </label>
            <select
              id="segment-filter"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              {SEGMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            name="symbol-filter"
            label="Symbol"
            placeholder="e.g. RELIANCE"
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
          />
        </div>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No reports match your filters' : 'No research reports yet'}
          description={
            hasFilters
              ? 'Try a different segment or symbol.'
              : 'Create the first research report to publish it.'
          }
          action={
            hasFilters ? null : (
              <Button onClick={() => navigate('/research/new')}>
                New report
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((report) => {
              const isPro = Boolean(
                report.extendedContent || report.extendedPdfPublicId,
              );
              const isDraft = !report.publishedAt;
              return (
                <Card
                  key={report.id}
                  className="group flex cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/research/${report.id}`)}
                >
                  {report.coverImage ? (
                    <img
                      src={report.coverImage}
                      alt=""
                      className="h-40 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-40 w-full flex-col items-center justify-center bg-slate-100 text-xs text-slate-500">
                      <span className="text-sm font-semibold text-slate-700">
                        {report.symbol}
                      </span>
                      <span className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                        {report.segment}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone="info">{formatReportDate(report.reportDate)}</Badge>
                      <Badge tone="neutral">
                        {report.segment} · {report.symbol}
                      </Badge>
                      {isDraft && <Badge tone="warning">DRAFT</Badge>}
                      {isPro && (
                        <Badge tone="warning" className="bg-amber-200 text-amber-800">
                          PRO
                        </Badge>
                      )}
                    </div>
                    <h3 className="line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-slate-700">
                      {report.title}
                    </h3>
                    {report.summary && (
                      <p className="mt-1 line-clamp-3 text-sm text-slate-500">
                        {report.summary}
                      </p>
                    )}
                    <div
                      className="mt-4 flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        as={Link}
                        to={`/research/${report.id}/edit`}
                        variant="secondary"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleting(report)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages} · {total} total
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

      <Modal
        open={Boolean(deleting)}
        onClose={() => (deletePending ? null : setDeleting(null))}
        title="Delete this report?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleting(null)}
              disabled={deletePending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={onConfirmDelete}
              loading={deletePending}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This will permanently remove{' '}
          <span className="font-medium text-slate-900">{deleting?.title}</span>{' '}
          from research. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
