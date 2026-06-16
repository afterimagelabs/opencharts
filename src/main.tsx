import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import TrackingPage from './components/TrackingPage';
import './index.css';

function pickRoute() {
  const path = window.location.pathname;
  const match = path.match(/^\/request\/([A-Za-z0-9_-]+)\/?$/);
  if (match) {
    return <TrackingPage hash={match[1]} />;
  }
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{pickRoute()}</StrictMode>
);
