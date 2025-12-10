import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  // StrictMode is temporarily disabled for Cesium dev to prevent double-initialization context issues in dev mode
  // In production, proper cleanup handling allows StrictMode.
  <React.Fragment>
    <App />
  </React.Fragment>
);