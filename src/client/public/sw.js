// Push notification Service Worker for omp-web
// Minimal: handles push events and notification clicks only, no caching.

self.addEventListener("push", (event) => {
  const data = event.data?.json();
  if (!data?.title) return;

  const { title, body, url } = data;

  event.waitUntil(
    (async () => {
      // Check if the user already has a focused tab on this session
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const focused = clients.some((c) => c.url.includes(url) && c.focused);
      if (focused) return; // suppress — user is already watching

      await self.registration.showNotification(title, {
        body: body ?? "",
        icon: "/favicon-192x192.png",
        tag: url,  // collapsible: replaces previous from same session
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window" });
      const match = clients.find((c) => c.url.includes(url));
      if (match) {
        await match.focus();
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
