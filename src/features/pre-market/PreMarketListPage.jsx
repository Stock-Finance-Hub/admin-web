import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Spinner,
} from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { preMarketApi } from './pre-market.api.js';

const formatReportDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value + 'T00:00:00').toLocaleDateString(undefined, {
      dateStyle: 'long',
    });
  } catch {
    return value;
  }
};

export function PreMarketListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletePending, setDeletePending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await preMarketApi.list({ page: 1, limit: 50, includeDrafts: true });
      setItems(data.items ?? []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load pre-market reports'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onConfirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await preMarketApi.remove(deleting.id);
      setItems((prev) => prev.filter((r) => r.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete report'));
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pre-Market"
        description="Daily market-open briefings."
        actions={
          items.length > 0 ? (
            <Button onClick={() => navigate('/pre-market/new')}>New briefing</Button>
          ) : null
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No pre-market reports yet"
          description="Create the first briefing to publish it to users."
          action={
            <Button onClick={() => navigate('/pre-market/new')}>New briefing</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((report) => (
            <Card
              key={report.id}
              className="group flex cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-md"
              onClick={() => navigate(`/pre-market/${report.id}`)}
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
                <div className="flex h-40 w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
                  No cover image
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge tone="info">{formatReportDate(report.reportDate)}</Badge>
                  {!report.publishedAt && <Badge tone="warning">DRAFT</Badge>}
                  {report.pdfUrl && <Badge tone="neutral">PDF</Badge>}
                </div>
                <h3 className="line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-slate-700">
                  {report.title}
                </h3>
                <p className="mt-1 line-clamp-3 text-sm text-slate-500">
                  {report.summary}
                </p>
                <div
                  className="mt-4 flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    as={Link}
                    to={`/pre-market/${report.id}/edit`}
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
          ))}
        </div>
      )}

      <Modal
        open={Boolean(deleting)}
        onClose={() => (deletePending ? null : setDeleting(null))}
        title="Delete this briefing?"
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
          from the pre-market feed. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
