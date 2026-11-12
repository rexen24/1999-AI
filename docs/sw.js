/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "a9c3e858b37e4502aef2b9953c087de4"
  }, {
    "url": "pwa-512x512.png",
    "revision": "6f2bd8d11d05da1215659968577700b2"
  }, {
    "url": "pwa-192x192.png",
    "revision": "b0768b4d94498d42698e1676b12d2136"
  }, {
    "url": "index.html",
    "revision": "e89893fbe64da580961afdda379963b6"
  }, {
    "url": "icon.svg",
    "revision": "706effd8ad3a05c04b1b395dac698c39"
  }, {
    "url": "gh-pages.js",
    "revision": "0b89b1062fa9db9021de3bd14085f063"
  }, {
    "url": "gh-pages.css",
    "revision": "e2eaffe30787494cfe5b3135fca355f7"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "00e7b49ac09378ec153e488af9295b8a"
  }, {
    "url": "assets/index-CMtNdYZf.js",
    "revision": null
  }, {
    "url": "assets/index-BcD7R9oV.css",
    "revision": null
  }, {
    "url": "assets/icon-DetCVSYA.svg",
    "revision": null
  }, {
    "url": "assets/apple-touch-icon-D8QPHrMH.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_e1229b8c.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_a97c12b1.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_873607ae.png",
    "revision": null
  }, {
    "url": "assets/aistudio/_C187E2A6-3B0A-41E9-9B80-5E470870478F__ffc2ef37.png",
    "revision": null
  }, {
    "url": "assets/aistudio/_33F69628-6EC9-4CCA-B815-F66A21D95C97__633576f6.png",
    "revision": null
  }, {
    "url": "assets/aistudio/_1F3D6B1E-253A-4D1D-A522-ACABE8671DA1__b0a75fb9.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "00e7b49ac09378ec153e488af9295b8a"
  }, {
    "url": "icon.svg",
    "revision": "706effd8ad3a05c04b1b395dac698c39"
  }, {
    "url": "pwa-192x192.png",
    "revision": "b0768b4d94498d42698e1676b12d2136"
  }, {
    "url": "pwa-512x512.png",
    "revision": "6f2bd8d11d05da1215659968577700b2"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "a9c3e858b37e4502aef2b9953c087de4"
  }, {
    "url": "manifest.webmanifest",
    "revision": "c8280306461ed9a1bbedd82c25c2d44f"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
