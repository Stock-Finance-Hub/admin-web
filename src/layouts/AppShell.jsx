import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { Button } from '../components/index.js';
import { cn } from '../lib/cn.js';

const navItems = [{ to: '/news', label: 'News / Feeds' }];

export function AppShell() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white sm:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Stock Finance Hub
          </span>
        </div>
        <nav className="flex-1 px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 px-2 py-1">
            <p className="truncate text-xs text-slate-500">Signed in as</p>
            <p className="truncate text-sm font-medium text-slate-900">
              {admin?.email ?? '—'}
            </p>
          </div>
          <Button variant="secondary" size="sm" className="w-full" onClick={onLogout}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <span className="text-sm font-semibold text-slate-900 sm:hidden">
            Admin
          </span>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">Admin console</span>
            <Button
              variant="ghost"
              size="sm"
              className="sm:hidden"
              onClick={onLogout}
            >
              Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
