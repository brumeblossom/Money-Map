import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const precacheList: (PrecacheEntry | string)[] = [
  ...(self.__SW_MANIFEST || []),
  { url: "/offline", revision: "1" },
];

const serwist = new Serwist({
  precacheEntries: precacheList,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // 1. Navigation requests (PRD section 8): Network-first with 3s timeout, then cache, fallback to /offline
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages-html-cache",
        networkTimeoutSeconds: 3,
      }),
    },
    // 2. Next.js App Router RSC payloads
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        sameOrigin &&
        !pathname.startsWith("/api/") &&
        request.headers.get("RSC") === "1",
      handler: new NetworkFirst({
        cacheName: "pages-rsc-cache",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 86400,
          }),
        ],
      }),
    },
    // 3. Next.js static bundles and scripts
    {
      matcher: ({ url: { pathname } }) => pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "next-static-js-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 31536000,
          }),
        ],
      }),
    },
    // 4. Web fonts
    {
      matcher: ({ url: { hostname, pathname } }) =>
        hostname.includes("fonts.gstatic.com") ||
        hostname.includes("fonts.googleapis.com") ||
        /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i.test(pathname),
      handler: new CacheFirst({
        cacheName: "static-font-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 16,
            maxAgeSeconds: 31536000,
          }),
        ],
      }),
    },
    // 5. Static icons and images
    {
      matcher: ({ url: { pathname } }) =>
        /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i.test(pathname),
      handler: new StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 2592000,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.mode === "navigate";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
