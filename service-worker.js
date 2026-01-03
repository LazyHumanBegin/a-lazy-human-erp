/**
 * A Lazy Human ERP - Service Worker
 * Network-first strategy with offline fallback
 * Auto-syncs updates without manual version changes
 */

const CACHE_NAME = 'ezcubic-erp-v2.3.16';

// Files to cache for offline fallback
const ASSETS_TO_CACHE = [
  './',
  './Ez.Smart.v2.1.html',
  './style.css',
  './manifest.json',
  './js/core.js',
  './js/app.js',
  './js/ui.js',
  './js/data.js',
  './js/dashboard.js',
  './js/transactions.js',
  './js/pos.js',
  './js/inventory-new.js',
  './js/customers.js',
  './js/crm.js',
  './js/bills.js',
  './js/quotations.js',
  './js/invoices.js',
  './js/orders.js',
  './js/reports.js',
  './js/taxes.js',
  './js/balance-sheet.js',
  './js/charts.js',
  './js/pdf-export.js',
  './js/stock.js',
  './js/projects.js',
  './js/chart-of-accounts.js',
  './js/journal-entries.js',
  './js/aging-reports.js',
  './js/multi-tenant.js',
  './js/users.js',
  './js/platform-control.js',
  './js/suppliers.js',
  './js/purchase-orders.js',
  './js/delivery-orders.js',
  './js/e-invoice.js',
  './js/payroll.js',
  './js/hr-modules.js',
  './js/leave-attendance.js',
  './js/kpi.js',
  './js/branches.js',
  './js/audit-log.js',
  './js/chatbot.js',
  './js/ai-assistant.js',
  './js/lhdn-export.js',
  './js/supabase.js',
  './js/cloud-sync.js'
];

// Install - cache assets for offline use
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(asset => 
            cache.add(asset).catch(err => console.warn('[SW] Cache failed:', asset))
          )
        );
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch - NETWORK FIRST, fallback to cache (AUTO-SYNC!)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Got network response - update cache and return
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed - try cache (offline mode)
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // For navigation, return main page
            if (event.request.mode === 'navigate') {
              return caches.match('./Ez.Smart.v2.1.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

console.log('[SW] Service Worker loaded - Network First mode (auto-sync enabled)');
