import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ConfigProvider } from './config';
import { ServerKeysProvider } from './contexts/ServerKeysContext';
import { OpenRouterAuthProvider } from './contexts/OpenRouterAuthContext';
import { OpenRouterProvider } from './contexts/OpenRouterContext';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <ServerKeysProvider>
      <ConfigProvider>
        <OpenRouterAuthProvider>
          <OpenRouterProvider>
            <App />
          </OpenRouterProvider>
        </OpenRouterAuthProvider>
      </ConfigProvider>
    </ServerKeysProvider>
  </React.StrictMode>
);
