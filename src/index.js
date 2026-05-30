import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';
import { API_URL } from './config/api';

// If a token is present from a previous login, set it for axios and fetch
const savedToken = localStorage.getItem('token');
if (savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const token = localStorage.getItem('token');
  const requestUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input?.url || '';

  if (!token || !requestUrl.startsWith(API_URL)) {
    return nativeFetch(input, init);
  }

  const headers = new Headers(init.headers || {});

  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return nativeFetch(input, {
    ...init,
    headers,
  });
};

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
