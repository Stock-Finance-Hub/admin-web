import { useRef, useState } from 'react';
import { cn } from '../lib/cn.js';
import { Button } from './Button.jsx';
import { Spinner } from './Spinner.jsx';
import { mediaApi } from '../features/media/media.api.js';
import {
  ACCEPTED_PDF_TYPES,
  AUTHENTICATED_UPLOAD_FOLDERS,
  MAX_PDF_SIZE_MB,
} from '../lib/constants.js';
import { extractErrorMessage } from '../lib/api.js';

const validateFile = (file) => {
  if (!ACCEPTED_PDF_TYPES.includes(file.type)) {
    return `Unsupported file type (${file.type || 'unknown'})`;
  }
  if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
    return `File too large (max ${MAX_PDF_SIZE_MB} MB)`;
  }
  return null;
};

export function PdfUploader({
  value,
  onChange,
  folderKey,
  storeMode,
  label,
  hint,
  className,
  deleteOnReplace = true,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const isAuthenticated = AUTHENTICATED_UPLOAD_FOLDERS.has(folderKey);
  const mode = storeMode ?? (isAuthenticated ? 'publicId' : 'url');

  const pickFile = () => inputRef.current?.click();

  const handleFiles = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    const invalid = validateFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    const previous = value;
    try {
      const result = await mediaApi.uploadFile({
        file,
        folderKey,
        resourceType: 'raw',
        onProgress: setProgress,
      });
      const next = mode === 'publicId' ? result.public_id : result.secure_url;
      onChange(next);
      if (deleteOnReplace && previous && previous !== next && mode === 'url') {
        mediaApi.deleteByUrl(previous).catch(() => {});
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    if (!value) return;
    const previous = value;
    onChange(null);
    if (mode === 'url') {
      mediaApi.deleteByUrl(previous).catch(() => {});
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    if (uploading) return;
    handleFiles(event.dataTransfer.files);
  };

  const displayLabel = value
    ? mode === 'publicId'
      ? value
      : value.split('/').pop()
    : null;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-lg border border-dashed bg-white',
          'min-h-32 border-slate-300',
          value && 'border-solid',
        )}
      >
        {value ? (
          <div className="flex w-full items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {displayLabel}
              </p>
              <p className="text-xs text-slate-500">
                {isAuthenticated ? 'Stored privately (signed delivery)' : 'Public PDF'}
              </p>
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Spinner /> <span>{progress}%</span>
              </div>
            )}
          </div>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 p-6 text-sm text-slate-600">
            <Spinner size="lg" />
            <span>Uploading… {progress}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-slate-500">
            <span>Drag & drop a PDF here</span>
            <span className="text-xs text-slate-400">
              PDF only · up to {MAX_PDF_SIZE_MB} MB
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={pickFile}
          disabled={uploading}
        >
          {value ? 'Replace PDF' : 'Choose PDF'}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
          >
            Remove
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_PDF_TYPES.join(',')}
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
