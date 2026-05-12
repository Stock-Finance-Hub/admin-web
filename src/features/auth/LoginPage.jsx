import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, CardBody, Input } from '../../components/index.js';
import { extractErrorMessage } from '../../lib/api.js';
import { useAuth } from './AuthContext.jsx';

export function LoginPage() {
  const { requestOtp, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname ?? '/news';

  const [step, setStep] = useState('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpInfo, setOtpInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const onSubmitCredentials = async (event) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const result = await requestOtp({ email: email.trim(), password });
      setOtpInfo(result);
      setStep('otp');
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to sign in'));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitOtp = async (event) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await verifyOtp({ email: email.trim(), code: code.trim() });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, 'Invalid code'));
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const result = await resendOtp({ email: email.trim() });
      setOtpInfo(result);
      setInfo('A new code has been sent to your email.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not resend code'));
    } finally {
      setResending(false);
    }
  };

  const onUseDifferentEmail = () => {
    setStep('credentials');
    setCode('');
    setError(null);
    setInfo(null);
  };

  if (step === 'otp') {
    return (
      <Card>
        <CardBody className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">Enter verification code</h2>
          <p className="mt-1 text-sm text-slate-500">
            We sent a code to <span className="font-medium text-slate-700">{email}</span>.
            {otpInfo?.expiresInMinutes
              ? ` It expires in ${otpInfo.expiresInMinutes} minutes.`
              : null}
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmitOtp} noValidate>
            <Input
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              label="Verification code"
              required
              minLength={4}
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              autoFocus
            />

            {error && <Alert tone="error">{error}</Alert>}
            {info && <Alert tone="success">{info}</Alert>}

            <Button type="submit" loading={submitting} className="mt-2">
              Verify and sign in
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={onUseDifferentEmail}
              className="text-slate-500 underline hover:text-slate-700"
              disabled={submitting || resending}
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={onResend}
              className="text-slate-700 underline hover:text-slate-900 disabled:opacity-50"
              disabled={submitting || resending}
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="p-6">
        <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
        <p className="mt-1 text-sm text-slate-500">
          Use your admin credentials to continue.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmitCredentials} noValidate>
          <Input
            name="email"
            type="email"
            label="Email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
          <Input
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && <Alert tone="error">{error}</Alert>}

          <Button type="submit" loading={submitting} className="mt-2">
            Continue
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
