import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  PageHeader,
  Spinner,
} from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { instrumentsApi } from './instruments.api.js';
import { LogoUploader } from './LogoUploader.jsx';

const FIELDS = [
  { name: 'name',           label: 'Name',            type: 'text',    placeholder: 'Reliance Industries Ltd.' },
  { name: 'isin',           label: 'ISIN',            type: 'text',    placeholder: 'INE002A01018' },
  { name: 'instrumentType', label: 'Type',            type: 'text',    placeholder: 'EQ' },
  { name: 'instrumentKey',  label: 'Upstox key',      type: 'text',    placeholder: 'NSE_EQ|INE002A01018' },
  { name: 'lotSize',        label: 'Lot size',        type: 'number',  placeholder: '1' },
  { name: 'tickSize',       label: 'Tick size',       type: 'text',    placeholder: '0.05' },
];

const toPatch = (form, original) => {
  const patch = {};
  for (const { name, type } of FIELDS) {
    const a = form[name];
    const b = original[name];
    if (a === b) continue;
    if (a === '' && (b === null || b === undefined)) continue;
    if (a === '') {
      patch[name] = null;
    } else if (type === 'number') {
      patch[name] = Number(a);
    } else {
      patch[name] = a;
    }
  }
  if (form.isActive !== original.isActive) patch.isActive = form.isActive;
  return patch;
};

export function CompanyEditPage() {
  const { segment, symbol } = useParams();
  const navigate = useNavigate();

  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    instrumentsApi.getOne(segment, symbol)
      .then((inst) => {
        if (cancelled) return;
        setOriginal(inst);
        setForm({
          name: inst.name ?? '',
          isin: inst.isin ?? '',
          instrumentType: inst.instrumentType ?? '',
          instrumentKey: inst.instrumentKey ?? '',
          lotSize: inst.lotSize ?? '',
          tickSize: inst.tickSize ?? '',
          isActive: inst.isActive ?? true,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, 'Failed to load company'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [segment, symbol]);

  const onChange = (key) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: v }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const patch = toPatch(form, original);
    if (Object.keys(patch).length === 0) {
      setInfo('Nothing to save.');
      return;
    }
    setSaving(true);
    try {
      const updated = await instrumentsApi.update(segment, symbol, patch);
      setOriginal(updated);
      setInfo('Saved.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const onLogoUpdated = (instrument) => {
    setOriginal(instrument);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }
  if (!original) {
    return <Alert tone="error">{error ?? 'Company not found'}</Alert>;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Edit · ${original.name || symbol}`}
        description={`${original.symbol} · ${original.segment}`}
        actions={
          <Link
            to={`/companies/${encodeURIComponent(segment)}/${encodeURIComponent(symbol)}`}
            className="text-sm text-slate-500 underline hover:text-slate-700"
          >
            ← Back to company
          </Link>
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-center gap-5 px-6 py-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
            {original.logoUrl ? (
              <img src={original.logoUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-lg font-semibold text-slate-500">
                {(original.symbol || '?').slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900">Logo</p>
            <p className="text-xs text-slate-500">PNG, JPEG, SVG, or WebP. Up to 2 MB.</p>
          </div>
          <LogoUploader
            segment={original.segment}
            symbol={original.symbol}
            currentUrl={original.logoUrl}
            onUpdated={onLogoUpdated}
          />
        </CardBody>
      </Card>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Card>
          <CardBody className="flex flex-col gap-4 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Ticker</label>
                <p className="mt-1 text-sm font-medium text-slate-900">{original.symbol}</p>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Segment</label>
                <p className="mt-1 text-sm font-medium text-slate-900">{original.segment}</p>
              </div>
            </div>

            {FIELDS.map((f) => (
              <Input
                key={f.name}
                name={f.name}
                type={f.type}
                label={f.label}
                placeholder={f.placeholder}
                value={form[f.name] ?? ''}
                onChange={onChange(f.name)}
              />
            ))}

            <label className="flex items-center gap-2 pt-1 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.isActive)}
                onChange={onChange('isActive')}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span>Active</span>
              {!form.isActive && <Badge tone="warning">Inactive</Badge>}
            </label>
          </CardBody>
        </Card>

        {error && <Alert tone="error">{error}</Alert>}
        {info && <Alert tone="success">{info}</Alert>}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              navigate(`/companies/${encodeURIComponent(segment)}/${encodeURIComponent(symbol)}`)
            }
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" loading={saving}>Save</Button>
        </div>
      </form>
    </div>
  );
}
