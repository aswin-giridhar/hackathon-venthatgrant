import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Providers } from "./providers";

// Register service worker for caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.error('ServiceWorker registration failed: ', error);
      });
  });
}

// Preload critical routes
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  window.requestIdleCallback(() => {
    // Preload main assets during idle time
    const links = [
      '/dashboard',
      '/grant-finder',
      '/proposal-preparation'
    ];

    // Create a link preload element for each important route
    links.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <Providers>
    <App />
  </Providers>
);
