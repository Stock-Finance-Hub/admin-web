import { useRef, useState } from 'react';

import { Alert, Button, Spinner } from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { instrumentsApi } from './instruments.api.js';

const ACCEPT = 'image/png,image/jpeg,image/svg+xml,image/webp';
const MAX_BYTES = 2 * 1024 * 1024;

export function LogoUploader({ segment, symbol, currentUrl, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) {
      setError('Use a PNG, JPEG, SVG, or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — keep it under 2 MB.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const sig = await instrumentsApi.signLogoUpload(segment, symbol);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', sig.apiKey);
      fd.append('timestamp', sig.timestamp);
      fd.append('signature', sig.signature);
      fd.append('folder', sig.folder);
      if (sig.publicId) fd.append('public_id', sig.publicId);
      if (sig.overwrite) fd.append('overwrite', 'true');
      if (sig.invalidate) fd.append('invalidate', 'true');

      const res = await fetch(sig.uploadUrl, { method: 'POST', body: fd });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Cloudinary rejected the upload: ${txt.slice(0, 200)}`);
      }
      const cloud = await res.json();

      const instrument = await instrumentsApi.confirmLogoUpload(segment, symbol, {
        secureUrl: cloud.secure_url,
        version: cloud.version,
        publicId: `${sig.folder}/${sig.publicId}`,
      });
      onUpdated?.(instrument);
    } catch (err) {
      setError(extractErrorMessage(err, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={handleFile}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePick}
          disabled={busy}
          loading={busy}
        >
          {currentUrl ? 'Replace logo' : 'Upload logo'}
        </Button>
        {busy && <Spinner size="sm" />}
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
