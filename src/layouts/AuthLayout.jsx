import { Outlet } from 'react-router-dom';
import sfhFullLogo from '../assets/logo/sfh_full_logo.jpg';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <img
            src={sfhFullLogo}
            alt="Stock Finance Hub"
            className="h-20 w-auto rounded-xl object-contain"
          />
          <p className="mt-3 text-sm text-slate-500">Admin console</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
