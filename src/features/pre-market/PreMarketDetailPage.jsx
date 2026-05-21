import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  MarkdownPreview,
  Modal,
  PageHeader,
  Spinner,
} from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { preMarketApi } from './pre-market.api.js';

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

export function PreMarketDetailPage() {
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
    preMarketApi
      .getById(id)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(extractErrorMessage(err, 'Failed to load briefing'));
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
      await preMarketApi.remove(id);
      navigate('/pre-market');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete briefing'));
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
          <Button variant="secondary" onClick={() => navigate('/pre-market')}>
            Back to pre-market
          </Button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={report.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{formatReportDate(report.reportDate)}</Badge>
            {report.publishedAt ? (
              <Badge tone="success">Published {formatDateTime(report.publishedAt)}</Badge>
            ) : (
              <Badge tone="warning">DRAFT</Badge>
            )}
            {report.updatedAt && report.updatedAt !== report.createdAt && (
              <Badge tone="neutral">Updated {formatDateTime(report.updatedAt)}</Badge>
            )}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/pre-market')}>
              Back
            </Button>
            <Button
              as={Link}
              to={`/pre-market/${report.id}/edit`}
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

      {report.pdfUrl && (
        <Card>
          <CardBody>
            <h2 className="text-base font-semibold text-slate-900">PDF attachment</h2>
            <div className="mt-3">
              <Button
                as="a"
                href={report.pdfUrl}
                target="_blank"
                rel="noreferrer noopener"
                variant="secondary"
              >
                Download PDF
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h2 className="text-base font-semibold text-slate-900">Content</h2>
          <div className="mt-3">
            <MarkdownPreview source={report.content} />
          </div>
        </CardBody>
      </Card>

      <Modal
        open={deleting}
        onClose={() => (deletePending ? null : setDeleting(false))}
        title="Delete this briefing?"
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
          from the pre-market feed. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
