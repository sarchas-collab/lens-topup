// Service Worker — ทำให้แอปเปิดเร็วและเปิดได้แม้ไม่มีเน็ต
// เมื่อแก้ไข index.html แล้ว ให้เปลี่ยนเลขเวอร์ชันด้านล่าง (v1 → v2) เพื่อให้มือถืออัปเดต
const CACHE = 'lens-topup-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ข้อมูลจาก Google Apps Script: ไม่ยุ่ง (แอปเก็บข้อมูลไว้ใน localStorage เองแล้ว)
  if (url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  // หน้าเว็บหลัก: ลองเน็ตก่อน (ได้เวอร์ชันใหม่) ถ้าไม่มีเน็ตใช้ของในเครื่อง
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // ไฟล์อื่นๆ (CSS, JS, ไอคอน): ใช้ของในเครื่องก่อน = เร็วที่สุด
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
