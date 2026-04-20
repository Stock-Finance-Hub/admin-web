import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell.jsx';
import { AuthLayout } from './layouts/AuthLayout.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { ProtectedRoute } from './features/auth/ProtectedRoute.jsx';
import { NewsListPage } from './features/news/NewsListPage.jsx';
import { NewsFormPage } from './features/news/NewsFormPage.jsx';

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
      { path: 'news/:id/edit', element: <NewsFormPage mode="edit" /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
