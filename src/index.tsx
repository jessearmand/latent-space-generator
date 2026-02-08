import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ConfigProvider } from './config';
import { OpenRouterAuthProvider } from './contexts/OpenRouterAuthContext';
import { OpenRouterProvider } from './contexts/OpenRouterContext';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <ConfigProvider>
      <OpenRouterAuthProvider>
        <OpenRouterProvider>
          <App />
        </OpenRouterProvider>
      </OpenRouterAuthProvider>
    </ConfigProvider>
  </React.StrictMode>
);
