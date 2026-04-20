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
import { newsApi } from './news.api.js';

const formatDate = (value) => {
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

export function NewsDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    newsApi
      .getById(id)
      .then((data) => {
        if (!cancelled) setNews(data);
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, 'Failed to load post'));
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
      await newsApi.remove(id);
      navigate('/news');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete post'));
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

  if (error && !news) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="error">{error}</Alert>
        <div>
          <Button variant="secondary" onClick={() => navigate('/news')}>
            Back to news
          </Button>
        </div>
      </div>
    );
  }

  if (!news) return null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={news.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="info">Created {formatDate(news.createdAt)}</Badge>
            {news.updatedAt && news.updatedAt !== news.createdAt && (
              <Badge tone="neutral">Updated {formatDate(news.updatedAt)}</Badge>
            )}
            {news.images?.length > 0 && (
              <Badge tone="neutral">
                {news.images.length} {news.images.length === 1 ? 'image' : 'images'}
              </Badge>
            )}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/news')}>
              Back
            </Button>
            <Button
              as={Link}
              to={`/news/${news.id}/edit`}
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

      {news.coverImage && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <img
            src={news.coverImage}
            alt=""
            className="max-h-96 w-full object-cover"
          />
        </div>
      )}

      <Card>
        <CardBody>
          <h2 className="text-base font-semibold text-slate-900">Summary</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {news.description}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-base font-semibold text-slate-900">Content</h2>
          <div className="mt-3">
            <MarkdownPreview source={news.content} />
          </div>
        </CardBody>
      </Card>

      {news.images?.length > 0 && (
        <Card>
          <CardBody>
            <h2 className="text-base font-semibold text-slate-900">
              Gallery
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {news.images.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group overflow-hidden rounded-lg border border-slate-200"
                >
                  <img
                    src={url}
                    alt=""
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Modal
        open={deleting}
        onClose={() => (deletePending ? null : setDeleting(false))}
        title="Delete this post?"
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
          <span className="font-medium text-slate-900">{news.title}</span> from
          the feed. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
