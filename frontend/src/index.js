// Polyfill process for webpack 5 (required by simple-peer / readable-stream)
import process from 'process';
window.process = process;

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Start downloading face models immediately at app boot (singleton — never loads twice).
import { loadFaceModels } from './faceModelLoader';
loadFaceModels();

// Apply stored theme before React renders to prevent flash
(function () {
  const t = localStorage.getItem('uc-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
