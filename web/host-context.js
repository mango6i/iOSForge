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

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.IOSForgeRepositories = api;
})(globalThis, function () {
  "use strict";
  const upstream = "mango6i/iOSForge";
  const emptyBlob = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
  async function discover({ token, fetch: send = globalThis.fetch, signal } = {}) {
    if (!token) throw new Error("请先填写 GitHub Token。");
    async function request(path, { probe = false, raw = false } = {}) {
      for (let attempt = 0; ; attempt++) {
        let response;
        try {
          response = await send(`https://api.github.com${path}`, {
            method: probe ? "POST" : "GET", cache: "no-store", signal,
            headers: { Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", ...(probe ? { "Content-Type": "application/json" } : {}) },
            // A fixed empty Git object tests Contents write access. No source,
            // branch, file, workflow or repository setting is changed by detection.
            ...(probe ? { body: '{"content":"","encoding":"utf-8"}' } : {}),
          });
        } catch (cause) {
          if (!probe && attempt < 1 && !signal?.aborted) continue;
          const error = new Error("网络暂时无法完成仓库检测，请重试；不会自动改用另一个仓库。"); error.network = true; throw error;
        }
        if (response.status === 401) throw new Error("Token 未通过 GitHub 验证，请检查是否复制完整、失效或已撤销。");
        if ([403, 404].includes(response.status)) return null;
        if (!response.ok) throw new Error(`GitHub 仓库检测失败（${response.status}），请稍后重试。`);
        return response.json();
      }
    }
    const user = await request("/user");
    if (!Number.isSafeInteger(user?.id) || !user.login) throw new Error("无法确认 Token 所属账号，请检查授权。");
    const listed = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await request(`/user/repos?affiliation=owner&visibility=all&per_page=100&sort=updated&page=${page}`);
      if (!Array.isArray(batch)) throw new Error("无法读取 Token 的仓库列表，请手动填写仓库并检查。");
      listed.push(...batch);
      if (batch.length < 100) break;
      if (page === 10) throw new Error("仓库过多，已停止自动选择，请手动填写目标仓库并检查。");
    }
    const owned = [...new Map(listed.filter(repo => Number.isSafeInteger(repo.id) && repo.owner?.id === user.id && repo.owner.type === "User"
      && repo.owner.login?.toLowerCase() === user.login.toLowerCase() && typeof repo.private === "boolean"
      && repo.permissions?.push === true && !repo.archived && !repo.disabled
      && /^[a-z0-9-]+\/[a-z0-9_.-]+$/i.test(repo.full_name || "")).map(repo => [repo.id, repo])).values()];
    const repositories = [], failures = [];
    let next = 0;
    async function worker() {
      while (next < owned.length) {
        const repo = owned[next++], base = `/repos/${repo.full_name.split("/").map(encodeURIComponent).join("/")}`;
        try {
          const marker = await request(`${base}/contents/.github/iosforge-release.json?ref=${encodeURIComponent(repo.default_branch || "main")}`, { raw: true });
          if (marker?.version !== 1 || marker.upstream !== upstream || !marker.files?.[".github/workflows/build.yml"]) continue;
          const current = await request(base);
          if (!current || current.id !== repo.id || current.private !== repo.private || current.full_name?.toLowerCase() !== repo.full_name.toLowerCase()
            || current.owner?.id !== user.id || current.owner.type !== "User" || current.archived || current.disabled || current.permissions?.push !== true) continue;
          const workflow = await request(`${base}/actions/workflows/build.yml`);
          if (!Number.isSafeInteger(workflow?.id) || workflow.state !== "active") continue;
          const probe = await request(`${base}/git/blobs`, { probe: true });
          if (probe?.sha !== emptyBlob) continue;
          repositories.push({ id: repo.id, full_name: repo.full_name, private: repo.private, default_branch: current.default_branch || repo.default_branch || "main" });
        } catch (error) {
          if (signal?.aborted) throw error;
          failures.push({ repository: repo.full_name, message: error.message });
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, owned.length) }, worker));
    repositories.sort((a, b) => Number(b.private) - Number(a.private) || a.full_name.localeCompare(b.full_name));
    return { user: { id: user.id, login: user.login }, repositories, incomplete: failures.length > 0, failures };
  }
  return { discover };
});
