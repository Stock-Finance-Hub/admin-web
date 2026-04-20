import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  ImageGalleryUploader,
  ImageUploader,
  Input,
  MarkdownEditor,
  PageHeader,
  Spinner,
  Textarea,
} from "../../components/index.js";
import { extractErrorMessage } from "../../lib/api.js";
import { UPLOAD_FOLDERS } from "../../lib/constants.js";
import { mediaApi } from "../media/media.api.js";
import { newsApi } from "./news.api.js";

const emptyState = {
  title: "",
  description: "",
  content: "",
  coverImage: null,
  images: [],
};

const fromNews = (news) => ({
  title: news.title ?? "",
  description: news.description ?? "",
  content: news.content ?? "",
  coverImage: news.coverImage ?? null,
  images: news.images ?? [],
});

export function NewsFormPage({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = mode === "edit";

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
    newsApi
      .getById(id)
      .then((news) => {
        if (cancelled) return;
        const next = fromNews(news);
        setState(next);
        setInitialUrls(
          new Set([next.coverImage, ...(next.images ?? [])].filter(Boolean)),
        );
      })
      .catch((err) => {
        if (!cancelled)
          setError(extractErrorMessage(err, "Failed to load post"));
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
    () => [state.coverImage, ...(state.images ?? [])].filter(Boolean),
    [state.coverImage, state.images],
  );

  const discardNewlyUploaded = () => {
    const toDelete = currentUrls.filter((url) => !initialUrls.has(url));
    toDelete.forEach((url) => {
      mediaApi.deleteByUrl(url).catch(() => {});
    });
  };

  const onCancel = () => {
    discardNewlyUploaded();
    navigate("/news");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const title = state.title.trim();
    const description = state.description.trim();
    const content = state.content;

    if (title.length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }
    if (description.length < 3) {
      setError("Description must be at least 3 characters.");
      return;
    }
    if (!content.trim()) {
      setError("Content is required.");
      return;
    }

    const payload = {
      title,
      description,
      content,
      coverImage: state.coverImage ?? null,
      images: state.images ?? [],
    };

    setSaving(true);
    try {
      if (editing) {
        await newsApi.update(id, payload);
      } else {
        await newsApi.create(payload);
      }
      navigate("/news");
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to save post"));
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
        title={editing ? "Edit post" : "New post"}
        description={
          editing
            ? "Update an existing news entry."
            : "Add a new entry to the feed."
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
              name="title"
              label="Title"
              value={state.title}
              onChange={(e) => update({ title: e.target.value })}
              required
              maxLength={200}
              placeholder="Post title"
            />
            <Textarea
              name="description"
              label="Short description"
              rows={3}
              value={state.description}
              onChange={(e) => update({ description: e.target.value })}
              required
              maxLength={500}
              placeholder="One or two lines summarising the post"
              hint="Shown in the feed preview."
            />
            <MarkdownEditor
              label="Content"
              value={state.content}
              onChange={(next) => update({ content: next })}
              placeholder="Write your post in Markdown. Supports **bold**, headings, lists, links, tables, code blocks."
              hint="Markdown · GitHub-flavored (tables, task lists, strikethrough)."
            />

            <ImageUploader
              label="Cover image"
              hint="Optional. Shown as the post's hero image."
              folderKey={UPLOAD_FOLDERS.NEWS}
              value={state.coverImage}
              onChange={(url) => update({ coverImage: url })}
            />

            <ImageGalleryUploader
              label="Additional images"
              hint="Optional. Up to 20 images."
              folderKey={UPLOAD_FOLDERS.NEWS}
              value={state.images}
              onChange={(urls) => update({ images: urls })}
              max={20}
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
              {editing ? "Save changes" : "Publish"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
