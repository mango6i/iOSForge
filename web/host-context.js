/* Hosting identity is public configuration, never a token or upload permission. */
(() => {
  const validRepo = value => typeof value === "string" && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
  function defaults(href = globalThis.location?.href) {
    try {
      const url = new URL(href);
      const requested = url.searchParams.get("repo");
      if (validRepo(requested)) return { repository: requested, branch: url.searchParams.get("branch") || "main", explicit: true };
      if (/^[A-Za-z0-9-]+\.github\.io$/i.test(url.hostname)) {
        const owner = url.hostname.split(".")[0], path = url.pathname.split("/").filter(Boolean);
        const repository = `${owner}/${path[0] && !/^(index|guide)\.html$/i.test(path[0]) ? decodeURIComponent(path[0]) : `${owner}.github.io`}`;
        if (validRepo(repository)) return { repository, branch: "main", explicit: false };
      }
    } catch { /* localhost and incomplete deployment metadata remain editable */ }
    return null;
  }
  async function read(href = globalThis.location?.href) {
    const inferred = defaults(href);
    if (inferred?.explicit || !href) return inferred;
    try {
      const url = new URL("repository.json", href);
      const response = await fetch(url.href, { cache: "no-store", credentials: "omit", redirect: "error" });
      if (!response.ok) return inferred;
      const value = await response.json();
      if (value.version !== 1 || !validRepo(value.repository) || typeof value.branch !== "string" || !value.branch || value.branch.length > 255) return inferred;
      if (inferred && value.repository.toLowerCase() !== inferred.repository.toLowerCase()) return inferred;
      return { repository: value.repository, branch: value.branch, explicit: false };
    } catch { return inferred; }
  }
  globalThis.IOSForgeHosting = Object.freeze({ defaults, read });
})();
