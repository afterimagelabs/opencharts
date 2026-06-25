import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Dashboard from './components/Dashboard';
import TrackingPage from './components/TrackingPage';
import './index.css';

function pickRoute() {
  const path = window.location.pathname;
  const trackMatch = path.match(/^\/request\/([A-Za-z0-9_-]+)\/?$/);
  if (trackMatch) return <TrackingPage hash={trackMatch[1]} />;
  if (path === '/dashboard' || path.startsWith('/dashboard/')) return <Dashboard />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{pickRoute()}</StrictMode>
);
