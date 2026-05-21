import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  ImageUploader,
  Input,
  MarkdownEditor,
  PageHeader,
  PdfUploader,
  Spinner,
  Textarea,
} from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { UPLOAD_FOLDERS } from '../../lib/constants.js';
import { mediaApi } from '../media/media.api.js';
import { preMarketApi } from './pre-market.api.js';

const emptyState = {
  reportDate: '',
  title: '',
  summary: '',
  content: '',
  coverImage: null,
  pdfUrl: null,
  publishNow: true,
};

const fromReport = (report) => ({
  reportDate: report.reportDate ?? '',
  title: report.title ?? '',
  summary: report.summary ?? '',
  content: report.content ?? '',
  coverImage: report.coverImage ?? null,
  pdfUrl: report.pdfUrl ?? null,
  publishNow: Boolean(report.publishedAt),
});

export function PreMarketFormPage({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = mode === 'edit';

  const [state, setState] = useState(emptyState);
  const [initialUrls, setInitialUrls] = useState(() => new Set());
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!editing || !id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    preMarketApi
      .getById(id)
      .then((report) => {
        if (cancelled) return;
        const next = fromReport(report);
        setState(next);
        setInitialUrls(
          new Set([next.coverImage, next.pdfUrl].filter(Boolean)),
        );
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
  }, [editing, id]);

  const update = (patch) => setState((prev) => ({ ...prev, ...patch }));

  const currentUrls = useMemo(
    () => [state.coverImage, state.pdfUrl].filter(Boolean),
    [state.coverImage, state.pdfUrl],
  );

  const discardNewlyUploaded = () => {
    const toDelete = currentUrls.filter((url) => !initialUrls.has(url));
    toDelete.forEach((url) => {
      mediaApi.deleteByUrl(url).catch(() => {});
    });
  };

  const onCancel = () => {
    discardNewlyUploaded();
    navigate('/pre-market');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const reportDate = state.reportDate.trim();
    const title = state.title.trim();
    const summary = state.summary.trim();
    const content = state.content;

    if (!reportDate) {
      setError('Report date is required.');
      return;
    }
    if (title.length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    if (!content.trim()) {
      setError('Content is required.');
      return;
    }

    const payload = {
      reportDate,
      title,
      summary: summary || null,
      content,
      coverImage: state.coverImage ?? null,
      pdfUrl: state.pdfUrl ?? null,
      publishedAt: state.publishNow ? new Date().toISOString() : null,
    };

    setSaving(true);
    try {
      if (editing) {
        await preMarketApi.update(id, payload);
      } else {
        await preMarketApi.create(payload);
      }
      navigate('/pre-market');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        setError('A pre-market report already exists for this date');
      } else {
        setError(extractErrorMessage(err, 'Failed to save briefing'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={editing ? 'Edit briefing' : 'New briefing'}
        description={
          editing
            ? 'Update an existing pre-market report.'
            : 'Add a new daily market-open briefing.'
        }
        actions={
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        }
      />

      <form onSubmit={onSubmit}>
        <Card>
          <CardBody className="flex flex-col gap-4">
            <Input
              name="reportDate"
              type="date"
              label="Report date"
              value={state.reportDate}
              onChange={(e) => update({ reportDate: e.target.value })}
              required
              hint="One briefing per date."
            />
            <Input
              name="title"
              label="Title"
              value={state.title}
              onChange={(e) => update({ title: e.target.value })}
              required
              maxLength={200}
              placeholder="Briefing title"
            />
            <Textarea
              name="summary"
              label="Summary"
              rows={3}
              value={state.summary}
              onChange={(e) => update({ summary: e.target.value })}
              maxLength={500}
              placeholder="Optional one-line summary shown in previews"
              hint="Optional. Shown in the list preview."
            />
            <MarkdownEditor
              label="Content"
              value={state.content}
              onChange={(next) => update({ content: next })}
              placeholder="Write the briefing in Markdown. Supports **bold**, headings, lists, links, tables, code blocks."
              hint="Markdown · GitHub-flavored (tables, task lists, strikethrough)."
            />

            <ImageUploader
              label="Cover image"
              hint="Optional. Shown as the briefing's hero image."
              folderKey={UPLOAD_FOLDERS.PRE_MARKET}
              value={state.coverImage}
              onChange={(url) => update({ coverImage: url })}
            />

            <PdfUploader
              label="PDF attachment"
              hint="Optional. Attach the briefing as a downloadable PDF."
              folderKey={UPLOAD_FOLDERS.PRE_MARKET}
              value={state.pdfUrl}
              onChange={(url) => update({ pdfUrl: url })}
            />

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={state.publishNow}
                onChange={(e) => update({ publishNow: e.target.checked })}
              />
              <span>Publish now</span>
              <span className="text-xs text-slate-500">
                (uncheck to save as a draft)
              </span>
            </label>

            {error && <Alert tone="error">{error}</Alert>}
          </CardBody>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : state.publishNow ? 'Publish' : 'Save draft'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
