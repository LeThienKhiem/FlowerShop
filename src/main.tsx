import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { CartProvider } from './context/CartContext'

console.log('App initialized (start)');

// Global error handlers for unhandled promise rejections and errors
// This catches errors from third-party scripts, browser extensions, etc.
window.addEventListener('error', (event) => {
  // Filter out errors from third-party scripts we don't control
  if (event.filename && event.filename.includes('inapp.js')) {
    console.warn('Suppressed error from third-party script:', event.filename);
    event.preventDefault(); // Prevent the error from being logged to console
    return false;
  }
  // Log other errors for debugging
  console.error('Unhandled error:', event.error || event.message);
  return true;
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Filter out rejections from third-party scripts
  const errorSource = event.reason?.stack || event.reason?.toString() || '';
  if (errorSource.includes('inapp.js')) {
    console.warn('Suppressed unhandled promise rejection from third-party script');
    event.preventDefault(); // Prevent the rejection from being logged to console
    return;
  }
  // Log other rejections for debugging
  console.error('Unhandled promise rejection:', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </React.StrictMode>,
)

console.log('App initialized (end)');


