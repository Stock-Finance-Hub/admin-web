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

export function NewsListPage() {
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
      const data = await newsApi.list({ page: 1, limit: 50 });
      setItems(data.items ?? []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load news'));
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
      await newsApi.remove(deleting.id);
      setItems((prev) => prev.filter((n) => n.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete news'));
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="News / Feeds"
        description="Create, edit, and remove news shown to users."
        actions={
          items.length > 0 ? (
            <Button onClick={() => navigate('/news/new')}>New post</Button>
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
          title="No news posts yet"
          description="Create the first post to publish it to users."
          action={<Button onClick={() => navigate('/news/new')}>New post</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((news) => (
            <Card
              key={news.id}
              className="group flex cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-md"
              onClick={() => navigate(`/news/${news.id}`)}
            >
              {news.coverImage ? (
                <img
                  src={news.coverImage}
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
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="info">{formatDate(news.createdAt)}</Badge>
                  {news.images?.length > 0 && (
                    <Badge tone="neutral">{news.images.length} images</Badge>
                  )}
                </div>
                <h3 className="line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-slate-700">
                  {news.title}
                </h3>
                <p className="mt-1 line-clamp-3 text-sm text-slate-500">
                  {news.description}
                </p>
                <div
                  className="mt-4 flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    as={Link}
                    to={`/news/${news.id}/edit`}
                    variant="secondary"
                    size="sm"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleting(news)}
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
        title="Delete this post?"
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
          This will permanently remove <span className="font-medium text-slate-900">{deleting?.title}</span>{' '}
          from the feed. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
