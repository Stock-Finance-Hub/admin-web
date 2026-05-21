import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Spinner,
} from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUSES,
} from '../../lib/constants.js';
import { subscriptionsApi } from './subscriptions.api.js';

const PAGE_SIZE = 20;

const STATUS_TONES = {
  active: 'success',
  expired: 'neutral',
  cancelled: 'warning',
};

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

const toLocalInputValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function SubscriptionsListPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [appliedUserId, setAppliedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantPending, setGrantPending] = useState(false);
  const [grantError, setGrantError] = useState(null);
  const [grantForm, setGrantForm] = useState({
    userId: '',
    plan: SUBSCRIPTION_PLANS[0]?.value ?? '',
    endsAt: '',
    providerRef: '',
  });

  const [extending, setExtending] = useState(null);
  const [extendValue, setExtendValue] = useState('');
  const [extendPending, setExtendPending] = useState(false);
  const [extendError, setExtendError] = useState(null);

  const [cancelling, setCancelling] = useState(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedUserId(userIdFilter.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [userIdFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await subscriptionsApi.list({
        page,
        limit: PAGE_SIZE,
        status: status || undefined,
        userId: appliedUserId ? Number(appliedUserId) : undefined,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load subscriptions'));
    } finally {
      setLoading(false);
    }
  }, [page, status, appliedUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  const openGrant = () => {
    setGrantForm({
      userId: '',
      plan: SUBSCRIPTION_PLANS[0]?.value ?? '',
      endsAt: '',
      providerRef: '',
    });
    setGrantError(null);
    setGrantOpen(true);
  };

  const onGrantSubmit = async (e) => {
    e.preventDefault();
    setGrantError(null);
    const userIdNum = Number(grantForm.userId);
    if (!Number.isInteger(userIdNum) || userIdNum <= 0) {
      setGrantError('User ID must be a positive integer');
      return;
    }
    if (!grantForm.plan) {
      setGrantError('Plan is required');
      return;
    }
    if (!grantForm.endsAt) {
      setGrantError('End date is required');
      return;
    }
    const endsIso = new Date(grantForm.endsAt).toISOString();
    const payload = {
      userId: userIdNum,
      plan: grantForm.plan,
      endsAt: endsIso,
    };
    if (grantForm.providerRef.trim()) {
      payload.providerRef = grantForm.providerRef.trim();
    }
    setGrantPending(true);
    try {
      await subscriptionsApi.create(payload);
      setGrantOpen(false);
      setPage(1);
      await load();
    } catch (err) {
      setGrantError(extractErrorMessage(err, 'Failed to grant subscription'));
    } finally {
      setGrantPending(false);
    }
  };

  const openExtend = (sub) => {
    setExtending(sub);
    setExtendValue(toLocalInputValue(sub.endsAt));
    setExtendError(null);
  };

  const onExtendSubmit = async (e) => {
    e.preventDefault();
    if (!extending) return;
    setExtendError(null);
    if (!extendValue) {
      setExtendError('End date is required');
      return;
    }
    const endsIso = new Date(extendValue).toISOString();
    setExtendPending(true);
    try {
      const updated = await subscriptionsApi.update(extending.id, {
        endsAt: endsIso,
      });
      setItems((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
      setExtending(null);
    } catch (err) {
      setExtendError(extractErrorMessage(err, 'Failed to extend subscription'));
    } finally {
      setExtendPending(false);
    }
  };

  const onConfirmCancel = async () => {
    if (!cancelling) return;
    setCancelError(null);
    setCancelPending(true);
    try {
      const updated = await subscriptionsApi.update(cancelling.id, {
        status: 'cancelled',
      });
      setItems((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
      setCancelling(null);
    } catch (err) {
      setCancelError(extractErrorMessage(err, 'Failed to cancel subscription'));
    } finally {
      setCancelPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Subscriptions"
        description="Premium access grants for the research tier."
        actions={<Button onClick={openGrant}>Grant subscription</Button>}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 sm:w-48"
          >
            <option value="">All</option>
            {SUBSCRIPTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <div className="w-full sm:w-48">
          <Input
            label="User ID"
            name="userIdFilter"
            type="number"
            min="1"
            placeholder="Filter by user id"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
          />
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {cancelError && <Alert tone="error">{cancelError}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No subscriptions found"
          description={
            status || appliedUserId
              ? 'Try changing or clearing the filters.'
              : 'Grant a subscription to give a user premium access.'
          }
          action={<Button onClick={openGrant}>Grant subscription</Button>}
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">User ID</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Starts</th>
                    <th className="px-4 py-3 font-medium">Ends</th>
                    <th className="px-4 py-3 font-medium">Cancelled</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {s.userId}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{s.plan}</td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONES[s.status] ?? 'neutral'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(s.startsAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(s.endsAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(s.cancelledAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openExtend(s)}
                          >
                            Extend
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={s.status === 'cancelled'}
                            onClick={() => setCancelling(s)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {items.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        User {s.userId}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {s.plan}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONES[s.status] ?? 'neutral'}>
                      {s.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-slate-500">
                    <p>Starts: {formatDate(s.startsAt)}</p>
                    <p>Ends: {formatDate(s.endsAt)}</p>
                    <p className="col-span-2">
                      Cancelled: {formatDate(s.cancelledAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openExtend(s)}
                    >
                      Extend
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={s.status === 'cancelled'}
                      onClick={() => setCancelling(s)}
                    >
                      Cancel
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={grantOpen}
        onClose={() => (grantPending ? null : setGrantOpen(false))}
        title="Grant subscription"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setGrantOpen(false)}
              disabled={grantPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="grant-subscription-form"
              loading={grantPending}
            >
              Grant
            </Button>
          </>
        }
      >
        <form
          id="grant-subscription-form"
          onSubmit={onGrantSubmit}
          className="flex flex-col gap-3"
        >
          {grantError && <Alert tone="error">{grantError}</Alert>}
          <Input
            label="User ID"
            name="userId"
            type="number"
            min="1"
            hint="(see Users tab for IDs)"
            value={grantForm.userId}
            onChange={(e) =>
              setGrantForm((f) => ({ ...f, userId: e.target.value }))
            }
            required
          />
          <Field label="Plan">
            <select
              value={grantForm.plan}
              onChange={(e) =>
                setGrantForm((f) => ({ ...f, plan: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              required
            >
              {SUBSCRIPTION_PLANS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Input
            label="Ends at"
            name="endsAt"
            type="datetime-local"
            value={grantForm.endsAt}
            onChange={(e) =>
              setGrantForm((f) => ({ ...f, endsAt: e.target.value }))
            }
            required
          />
          <Input
            label="Provider reference"
            name="providerRef"
            placeholder="External reference id"
            value={grantForm.providerRef}
            onChange={(e) =>
              setGrantForm((f) => ({ ...f, providerRef: e.target.value }))
            }
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(extending)}
        onClose={() => (extendPending ? null : setExtending(null))}
        title="Extend subscription"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setExtending(null)}
              disabled={extendPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="extend-subscription-form"
              loading={extendPending}
            >
              Save
            </Button>
          </>
        }
      >
        <form
          id="extend-subscription-form"
          onSubmit={onExtendSubmit}
          className="flex flex-col gap-3"
        >
          {extendError && <Alert tone="error">{extendError}</Alert>}
          <p className="text-sm text-slate-600">
            Update the end date for subscription{' '}
            <span className="font-medium text-slate-900">
              #{extending?.id}
            </span>{' '}
            (user {extending?.userId}).
          </p>
          <Input
            label="Ends at"
            name="endsAt"
            type="datetime-local"
            value={extendValue}
            onChange={(e) => setExtendValue(e.target.value)}
            required
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(cancelling)}
        onClose={() => (cancelPending ? null : setCancelling(null))}
        title="Cancel subscription?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelling(null)}
              disabled={cancelPending}
            >
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={onConfirmCancel}
              loading={cancelPending}
            >
              Cancel subscription
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This will mark subscription{' '}
          <span className="font-medium text-slate-900">
            #{cancelling?.id}
          </span>{' '}
          for user {cancelling?.userId} as cancelled. The user will lose
          premium access at the end date.
        </p>
      </Modal>
    </div>
  );
}
