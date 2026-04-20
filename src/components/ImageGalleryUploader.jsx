import { useRef, useState } from 'react';
import { cn } from '../lib/cn.js';
import { Button } from './Button.jsx';
import { Spinner } from './Spinner.jsx';
import { mediaApi } from '../features/media/media.api.js';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_MB,
} from '../lib/constants.js';
import { extractErrorMessage } from '../lib/api.js';

const validateFile = (file) => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `Unsupported file type (${file.type || 'unknown'})`;
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `File too large (max ${MAX_IMAGE_SIZE_MB} MB)`;
  }
  return null;
};

export function ImageGalleryUploader({
  value = [],
  onChange,
  folderKey,
  label,
  hint,
  max = 20,
  className,
}) {
  const inputRef = useRef(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState(null);

  const pickFiles = () => inputRef.current?.click();

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;

    const slotsLeft = max - value.length;
    if (slotsLeft <= 0) {
      setError(`Maximum ${max} images allowed`);
      return;
    }
    const selected = files.slice(0, slotsLeft);
    if (files.length > slotsLeft) {
      setError(`Only added the first ${slotsLeft} files (max ${max} total)`);
    } else {
      setError(null);
    }

    setUploadingCount((n) => n + selected.length);
    const uploadedUrls = [];

    await Promise.all(
      selected.map(async (file) => {
        const invalid = validateFile(file);
        if (invalid) {
          setError(invalid);
          return;
        }
        try {
          const result = await mediaApi.uploadFile({ file, folderKey });
          uploadedUrls.push(result.secure_url);
        } catch (err) {
          setError(extractErrorMessage(err, 'Upload failed'));
        }
      }),
    );

    if (uploadedUrls.length) {
      onChange([...value, ...uploadedUrls]);
    }
    setUploadingCount((n) => Math.max(0, n - selected.length));
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (idx) => {
    const url = value[idx];
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
    if (url) mediaApi.deleteByUrl(url).catch(() => {});
  };

  const onDrop = (event) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <span className="text-sm font-medium text-slate-700">
          {label}
          <span className="ml-1 text-xs font-normal text-slate-400">
            ({value.length}/{max})
          </span>
        </span>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="rounded-lg border border-dashed border-slate-300 bg-white p-3"
      >
        {value.length === 0 && uploadingCount === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-slate-500">
            <span>Drag & drop images here, or click to choose files</span>
            <span className="text-xs text-slate-400">
              JPG, PNG, WEBP, or GIF · up to {MAX_IMAGE_SIZE_MB} MB each
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {value.map((url, idx) => (
              <div
                key={url + idx}
                className="group relative aspect-square overflow-hidden rounded-md border border-slate-200"
              >
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="absolute right-1 top-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            ))}
            {Array.from({ length: uploadingCount }).map((_, i) => (
              <div
                key={`pending-${i}`}
                className="flex aspect-square items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50"
              >
                <Spinner />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={pickFiles}
          disabled={uploadingCount > 0 || value.length >= max}
        >
          {uploadingCount > 0 ? `Uploading ${uploadingCount}…` : 'Add images'}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
