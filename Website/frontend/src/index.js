import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';
import { initializeTheme } from './utils/theme';
import { initializeI18n } from './i18n';

initializeTheme();

const root = ReactDOM.createRoot(document.getElementById('root'));
initializeI18n().then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
