(() => {
  const host = window.location.hostname.toLowerCase();
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
  if (isLocalHost) return;

  const loader = document.currentScript;
  const src = loader?.dataset.visitorSrc || "https://on-demand-demos.bozhi.dev/visitor.js";
  const project = loader?.dataset.project || "distributed-campaign-platform";
  const visitor = document.createElement("script");
  visitor.defer = true;
  visitor.src = src;
  visitor.dataset.project = project;
  document.head.appendChild(visitor);
})();
