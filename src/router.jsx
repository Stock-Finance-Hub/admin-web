import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell.jsx';
import { AuthLayout } from './layouts/AuthLayout.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { ProtectedRoute } from './features/auth/ProtectedRoute.jsx';
import { NewsListPage } from './features/news/NewsListPage.jsx';
import { NewsFormPage } from './features/news/NewsFormPage.jsx';
import { NewsDetailPage } from './features/news/NewsDetailPage.jsx';
import { UsersListPage } from './features/users/UsersListPage.jsx';
import { CompaniesListPage } from './features/instruments/CompaniesListPage.jsx';
import { CompanyDetailPage } from './features/instruments/CompanyDetailPage.jsx';
import { CompanyEditPage } from './features/instruments/CompanyEditPage.jsx';
import { IndicesListPage } from './features/instruments/IndicesListPage.jsx';
import { IndexDetailPage } from './features/instruments/IndexDetailPage.jsx';
import { SyncPage } from './features/sync/SyncPage.jsx';

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/news" replace /> },
      { path: 'news', element: <NewsListPage /> },
      { path: 'news/new', element: <NewsFormPage mode="create" /> },
      { path: 'news/:id', element: <NewsDetailPage /> },
      { path: 'news/:id/edit', element: <NewsFormPage mode="edit" /> },
      { path: 'users', element: <UsersListPage /> },
      { path: 'companies', element: <CompaniesListPage /> },
      { path: 'companies/:segment/:symbol', element: <CompanyDetailPage /> },
      { path: 'companies/:segment/:symbol/edit', element: <CompanyEditPage /> },
      { path: 'indices', element: <IndicesListPage /> },
      { path: 'indices/:symbol', element: <IndexDetailPage /> },
      { path: 'sync', element: <SyncPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
