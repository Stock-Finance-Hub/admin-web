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

export function ImageUploader({
  value,
  onChange,
  folderKey,
  label,
  hint,
  className,
  deleteOnReplace = true,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

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
        onProgress: setProgress,
      });
      onChange(result.secure_url);
      if (deleteOnReplace && previous && previous !== result.secure_url) {
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
    mediaApi.deleteByUrl(previous).catch(() => {});
  };

  const onDrop = (event) => {
    event.preventDefault();
    if (uploading) return;
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-lg border border-dashed bg-white',
          'min-h-40 border-slate-300',
          value && 'border-solid',
        )}
      >
        {value ? (
          <>
            <img
              src={value}
              alt=""
              className="max-h-64 w-full object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 text-sm text-white">
                <Spinner /> <span className="ml-2">Replacing… {progress}%</span>
              </div>
            )}
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 p-6 text-sm text-slate-600">
            <Spinner size="lg" />
            <span>Uploading… {progress}%</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-slate-500">
            <span>Drag & drop an image here</span>
            <span className="text-xs text-slate-400">
              JPG, PNG, WEBP, or GIF · up to {MAX_IMAGE_SIZE_MB} MB
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
          {value ? 'Replace image' : 'Choose image'}
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
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
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
