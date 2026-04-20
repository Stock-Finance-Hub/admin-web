import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Stock Finance Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500">Admin console</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
