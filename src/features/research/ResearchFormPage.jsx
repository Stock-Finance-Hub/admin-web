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
import { researchApi } from './research.api.js';

const SEGMENT_OPTIONS = [
  { value: 'NSE_EQ', label: 'NSE_EQ' },
  { value: 'NSE_INDEX', label: 'NSE_INDEX' },
];

const todayISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const emptyState = {
  segment: 'NSE_EQ',
  symbol: '',
  title: '',
  summary: '',
  reportDate: todayISO(),
  publish: true,
  basicContent: '',
  basicPdfUrl: null,
  coverImage: null,
  extendedContent: '',
  extendedPdfPublicId: null,
};

const fromReport = (report) => ({
  segment: report.segment,
  symbol: report.symbol,
  title: report.title ?? '',
  summary: report.summary ?? '',
  reportDate: report.reportDate ?? todayISO(),
  publish: Boolean(report.publishedAt),
  basicContent: report.basicContent ?? '',
  basicPdfUrl: report.basicPdfUrl ?? null,
  coverImage: report.coverImage ?? null,
  extendedContent: report.extendedContent ?? '',
  extendedPdfPublicId: report.extendedPdfPublicId ?? null,
});

export function ResearchFormPage({ mode }) {
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
    researchApi
      .getById(id)
      .then((report) => {
        if (cancelled) return;
        const next = fromReport(report);
        setState(next);
        setInitialUrls(
          new Set([next.basicPdfUrl, next.coverImage].filter(Boolean)),
        );
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
  }, [editing, id]);

  const update = (patch) => setState((prev) => ({ ...prev, ...patch }));

  const currentUrls = useMemo(
    () => [state.basicPdfUrl, state.coverImage].filter(Boolean),
    [state.basicPdfUrl, state.coverImage],
  );

  const discardNewlyUploaded = () => {
    const toDelete = currentUrls.filter((url) => !initialUrls.has(url));
    toDelete.forEach((url) => {
      mediaApi.deleteByUrl(url).catch(() => {});
    });
  };

  const onCancel = () => {
    discardNewlyUploaded();
    navigate('/research');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const segment = state.segment;
    const symbol = state.symbol.trim().toUpperCase();
    const title = state.title.trim();
    const summary = state.summary.trim();
    const reportDate = state.reportDate;
    const basicContent = state.basicContent;
    const extendedContent = state.extendedContent;

    if (!segment) {
      setError('Segment is required.');
      return;
    }
    if (!symbol) {
      setError('Symbol is required.');
      return;
    }
    if (title.length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    if (title.length > 200) {
      setError('Title must be at most 200 characters.');
      return;
    }
    if (!basicContent.trim()) {
      setError('Basic content is required.');
      return;
    }
    if (!reportDate) {
      setError('Report date is required.');
      return;
    }

    const publishedAt = state.publish
      ? editing
        ? undefined
        : new Date().toISOString()
      : null;

    const payload = editing
      ? {
          title,
          summary: summary || null,
          reportDate,
          basicContent,
          extendedContent: extendedContent.trim() ? extendedContent : null,
          basicPdfUrl: state.basicPdfUrl ?? null,
          extendedPdfPublicId: state.extendedPdfPublicId ?? null,
          coverImage: state.coverImage ?? null,
          publishedAt: state.publish
            ? undefined
            : null,
        }
      : {
          segment,
          symbol,
          title,
          summary: summary || undefined,
          reportDate,
          basicContent,
          extendedContent: extendedContent.trim() ? extendedContent : undefined,
          basicPdfUrl: state.basicPdfUrl ?? undefined,
          extendedPdfPublicId: state.extendedPdfPublicId ?? undefined,
          coverImage: state.coverImage ?? undefined,
          publishedAt,
        };

    setSaving(true);
    try {
      if (editing) {
        await researchApi.update(id, payload);
      } else {
        await researchApi.create(payload);
      }
      navigate('/research');
    } catch (err) {
      const status = err?.response?.status;
      const rawMessage = err?.response?.data?.message ?? '';
      if (status === 409) {
        setError(
          'A research report already exists for this instrument and date.',
        );
      } else if (status === 400 && /unknown instrument/i.test(rawMessage)) {
        setError(
          `No instrument found for ${segment} · ${symbol}. Check the segment and symbol.`,
        );
      } else {
        setError(extractErrorMessage(err, 'Failed to save report'));
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
        title={editing ? 'Edit report' : 'New report'}
        description={
          editing
            ? 'Update an existing research report.'
            : 'Publish a new research report.'
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="segment"
                  className="text-sm font-medium text-slate-700"
                >
                  Segment
                </label>
                <select
                  id="segment"
                  name="segment"
                  value={state.segment}
                  disabled={editing}
                  onChange={(e) => update({ segment: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                >
                  {SEGMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {editing && (
                  <p className="text-xs text-slate-500">
                    Segment cannot be changed after creation.
                  </p>
                )}
              </div>
              <Input
                name="symbol"
                label="Symbol"
                value={state.symbol}
                onChange={(e) =>
                  update({ symbol: e.target.value.toUpperCase() })
                }
                required
                disabled={editing}
                placeholder="e.g. RELIANCE"
                hint={
                  editing
                    ? 'Symbol cannot be changed after creation.'
                    : 'Must match an existing instrument.'
                }
              />
            </div>

            <Input
              name="title"
              label="Title"
              value={state.title}
              onChange={(e) => update({ title: e.target.value })}
              required
              minLength={3}
              maxLength={200}
              placeholder="Report title"
            />

            <Textarea
              name="summary"
              label="Summary"
              rows={3}
              value={state.summary}
              onChange={(e) => update({ summary: e.target.value })}
              maxLength={500}
              placeholder="One or two lines summarising the report"
              hint="Optional. Shown in listings and at the top of the report."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                name="reportDate"
                label="Report date"
                type="date"
                value={state.reportDate}
                onChange={(e) => update({ reportDate: e.target.value })}
                required
              />
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={state.publish}
                    onChange={(e) => update({ publish: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                  />
                  Publish now
                </label>
              </div>
            </div>

            <MarkdownEditor
              label="Basic content (free tier)"
              value={state.basicContent}
              onChange={(next) => update({ basicContent: next })}
              placeholder="Write the free-tier content in Markdown."
              hint="Visible to all users."
            />

            <PdfUploader
              label="Basic PDF"
              hint="Optional. Public PDF stored on Cloudinary."
              folderKey={UPLOAD_FOLDERS.RESEARCH_BASIC}
              value={state.basicPdfUrl}
              onChange={(url) => update({ basicPdfUrl: url })}
            />

            <ImageUploader
              label="Cover image"
              hint="Optional. Shown as the report's hero image."
              folderKey={UPLOAD_FOLDERS.RESEARCH_BASIC}
              value={state.coverImage}
              onChange={(url) => update({ coverImage: url })}
            />

            <div className="my-2 border-t border-slate-200" />

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-slate-900">
                Premium tier
              </h3>
              <p className="text-sm text-slate-500">
                Extended analysis available only to subscribed users. Extended
                PDFs are stored privately and delivered via signed URLs.
              </p>
            </div>

            <MarkdownEditor
              label="Extended content (premium only)"
              value={state.extendedContent}
              onChange={(next) => update({ extendedContent: next })}
              placeholder="Write the premium-only extended analysis in Markdown."
              hint="Optional. Visible only to subscribed users."
            />

            <PdfUploader
              label="Extended PDF"
              hint="Optional. Stored privately; delivered via signed URLs in the user app."
              folderKey={UPLOAD_FOLDERS.RESEARCH_EXTENDED}
              value={state.extendedPdfPublicId}
              onChange={(publicId) =>
                update({ extendedPdfPublicId: publicId })
              }
            />

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
              {editing ? 'Save changes' : state.publish ? 'Publish' : 'Save draft'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
