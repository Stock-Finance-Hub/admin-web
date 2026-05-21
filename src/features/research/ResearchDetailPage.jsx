import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  MarkdownPreview,
  Modal,
  PageHeader,
  Spinner,
} from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { researchApi } from './research.api.js';

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

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
};

export function ResearchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    researchApi
      .getById(id)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(extractErrorMessage(err, 'Failed to load report'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onConfirmDelete = async () => {
    setDeletePending(true);
    try {
      await researchApi.remove(id);
      navigate('/research');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete report'));
      setDeletePending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="error">{error}</Alert>
        <div>
          <Button variant="secondary" onClick={() => navigate('/research')}>
            Back to research
          </Button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const isPro = Boolean(report.extendedContent || report.extendedPdfPublicId);
  const isDraft = !report.publishedAt;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={report.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">
              {report.segment} · {report.symbol}
            </Badge>
            <Badge tone="info">
              Report date {formatReportDate(report.reportDate)}
            </Badge>
            {isDraft ? (
              <Badge tone="warning">DRAFT</Badge>
            ) : (
              <Badge tone="success">PUBLISHED</Badge>
            )}
            {isPro && (
              <Badge tone="warning" className="bg-amber-200 text-amber-800">
                PRO
              </Badge>
            )}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/research')}>
              Back
            </Button>
            <Button
              as={Link}
              to={`/research/${report.id}/edit`}
              variant="secondary"
            >
              Edit
            </Button>
            <Button variant="danger" onClick={() => setDeleting(true)}>
              Delete
            </Button>
          </div>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      {report.coverImage && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <img
            src={report.coverImage}
            alt=""
            className="max-h-96 w-full object-cover"
          />
        </div>
      )}

      {report.summary && (
        <Card>
          <CardBody>
            <h2 className="text-base font-semibold text-slate-900">Summary</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {report.summary}
            </p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Basic content
            </h2>
            <Badge tone="neutral">Free tier</Badge>
          </div>
          <div className="mt-3">
            <MarkdownPreview source={report.basicContent} />
          </div>
          {report.basicPdfUrl && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <Button
                as="a"
                href={report.basicPdfUrl}
                target="_blank"
                rel="noreferrer noopener"
                variant="secondary"
                size="sm"
              >
                Open basic PDF
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {isPro && (
        <Card className="border-amber-300">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-white">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-amber-900">
                Premium tier — Extended analysis
              </h2>
              <Badge tone="warning" className="bg-amber-200 text-amber-800">
                PRO
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            {report.extendedContent ? (
              <MarkdownPreview source={report.extendedContent} />
            ) : (
              <p className="text-sm text-slate-500">
                No extended content. Premium subscribers will only see the
                attached PDF below.
              </p>
            )}

            {report.extendedPdfPublicId && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    Authenticated PDF stored as{' '}
                    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs text-amber-900">
                      {report.extendedPdfPublicId}
                    </code>
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Use the user app to fetch a signed URL. Edit this report to
                    replace the file.
                  </p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h2 className="text-base font-semibold text-slate-900">Metadata</h2>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Created
              </dt>
              <dd className="text-slate-700">
                {formatDateTime(report.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Updated
              </dt>
              <dd className="text-slate-700">
                {formatDateTime(report.updatedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Published
              </dt>
              <dd className="text-slate-700">
                {report.publishedAt
                  ? formatDateTime(report.publishedAt)
                  : 'Draft'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Created by
              </dt>
              <dd className="text-slate-700">{report.createdBy ?? '—'}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Modal
        open={deleting}
        onClose={() => (deletePending ? null : setDeleting(false))}
        title="Delete this report?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleting(false)}
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
          <span className="font-medium text-slate-900">{report.title}</span>{' '}
          from research. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
