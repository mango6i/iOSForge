const form = document.querySelector("#build-form");
const repoInput = document.querySelector("#repo");
const branchInput = document.querySelector("#branch");
const buildTypeInput = document.querySelector("#build-type");
const tokenInput = document.querySelector("#token");
const ipaFields = document.querySelector("#ipa-fields");
const projectInput = document.querySelector("#xcode-project");
const schemeInput = document.querySelector("#xcode-scheme");
const exportOptionsInput = document.querySelector("#export-options");
const submitButton = document.querySelector("#submit-button");
const repoLink = document.querySelector("#repo-link");
const actionsLink = document.querySelector("#actions-link");
const statusBadge = document.querySelector("#status-badge");
const statusCard = document.querySelector("#status-card");
const statusTitle = document.querySelector("#status-title");
const statusCopy = document.querySelector("#status-copy");
const runMeta = document.querySelector("#run-meta");
const artifactList = document.querySelector("#artifact-list");
const artifacts = document.querySelector("#artifacts");

const state = { token: "", repo: null, branch: "main", runId: null, pollTimer: null, startedAt: 0 };

function parseRepo(value) {
  const clean = value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
  const match = clean.match(/^([^/]+)\/([^/]+)$/);
  return match ? { owner: match[1], name: match[2] } : null;
}

function apiUrl(path) {
  return `https://api.github.com${path}`;
}

async function github(path, options = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${state.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    ...(options.headers || {}),
  };
  const response = await fetch(apiUrl(path), { ...options, headers });
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try { message = (await response.json()).message || message; } catch (_) {}
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

function setStatus(kind, badge, title, copy) {
  statusBadge.className = `status-badge ${kind}`;
  statusBadge.textContent = badge;
  statusCard.className = `status-card ${kind}-card`;
  statusTitle.textContent = title;
  statusCopy.textContent = copy;
}

function setBusy(busy) {
  submitButton.disabled = busy;
  submitButton.querySelector("span:last-child").textContent = busy ? "正在提交…" : "开始构建";
}

function updateLinks() {
  const repo = parseRepo(repoInput.value);
  const branch = encodeURIComponent(branchInput.value.trim() || "main");
  const fallback = "https://github.com/mango6i/iOSForge";
  if (!repo) {
    repoLink.href = fallback;
    actionsLink.href = `${fallback}/actions`;
    return;
  }
  const base = `https://github.com/${repo.owner}/${repo.name}`;
  repoLink.href = base;
  actionsLink.href = `${base}/actions?query=branch%3A${branch}`;
}

function updateIpaFields() {
  ipaFields.hidden = buildTypeInput.value !== "ipa";
}

function renderRun(run) {
  runMeta.hidden = false;
  runMeta.innerHTML = `
    <div class="meta-item"><span>Workflow</span><strong>${run.name || "GitHub Actions"}</strong></div>
    <div class="meta-item"><span>Branch</span><strong>${run.head_branch || state.branch}</strong></div>
    <div class="meta-item"><span>Run</span><a href="${run.html_url}" target="_blank" rel="noreferrer">#${run.run_number} ↗</a></div>
    <div class="meta-item"><span>Commit</span><strong>${(run.head_sha || "").slice(0, 8)}</strong></div>`;
}

function formatSize(bytes) {
  if (!bytes) return "大小未知";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function renderArtifacts(items) {
  artifactList.hidden = false;
  artifacts.innerHTML = items.length ? items.map((artifact) => `
    <div class="artifact-row">
      <div><div class="artifact-name">${artifact.name}</div><div class="artifact-size">${formatSize(artifact.size_in_bytes)}</div></div>
      <button class="download-button" data-artifact-id="${artifact.id}" data-artifact-name="${artifact.name}">下载 ZIP</button>
    </div>`).join("") : `<p class="status-copy">没有找到可下载产物，请打开 GitHub 查看日志。</p>`;
}

async function downloadArtifact(id, name) {
  const response = await fetch(apiUrl(`/repos/${state.repo.owner}/${state.repo.name}/actions/artifacts/${id}/zip`), {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${state.token}`, "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!response.ok) throw new Error("下载产物失败");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name}.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function loadArtifacts(runId) {
  const data = await github(`/repos/${state.repo.owner}/${state.repo.name}/actions/runs/${runId}/artifacts`);
  renderArtifacts((data.artifacts || []).filter((artifact) => !artifact.expired));
}

async function waitForRun() {
  const query = `/repos/${state.repo.owner}/${state.repo.name}/actions/workflows/build.yml/runs?branch=${encodeURIComponent(state.branch)}&event=workflow_dispatch&per_page=20`;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const data = await github(query);
    const candidate = (data.workflow_runs || []).find((run) => new Date(run.created_at).getTime() >= state.startedAt - 90_000);
    if (candidate) {
      state.runId = candidate.id;
      renderRun(candidate);
      if (candidate.status === "completed") {
        if (candidate.conclusion === "success") {
          setStatus("success", "完成", "构建完成", "产物已经准备好，可以从下方下载。" );
          await loadArtifacts(candidate.id);
        } else {
          setStatus("error", "失败", "构建失败", `GitHub Actions 返回：${candidate.conclusion || "unknown"}。`);
        }
        return;
      }
      setStatus("running", "运行中", "正在 macOS Runner 上构建", "Theos 或 Xcode 正在处理你的项目。" );
    }
    await new Promise((resolve) => { state.pollTimer = setTimeout(resolve, 4500); });
  }
  setStatus("running", "已提交", "构建仍在排队", "网页暂时停止轮询，你可以打开 GitHub 查看实时日志。" );
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearTimeout(state.pollTimer);
  const repo = parseRepo(repoInput.value);
  const branch = branchInput.value.trim() || "main";
  const token = tokenInput.value.trim();
  if (!repo) return setStatus("error", "检查输入", "仓库格式不正确", "请填写 owner/repository，例如 mango6i/iOSForge。" );
  if (!token) return setStatus("error", "需要 Token", "请填写 GitHub Token", "Token 只在本页面内存中使用，不会被保存。" );

  state.token = token;
  state.repo = repo;
  state.branch = branch;
  state.startedAt = Date.now();
  state.runId = null;
  artifacts.innerHTML = "";
  artifactList.hidden = true;
  runMeta.hidden = true;
  setBusy(true);
  setStatus("running", "提交中", "正在请求 GitHub Actions", "准备启动你的构建任务。" );
  updateLinks();

  const inputs = { build_type: buildTypeInput.value };
  if (buildTypeInput.value === "ipa") {
    inputs.xcode_project = projectInput.value.trim();
    inputs.xcode_scheme = schemeInput.value.trim();
    inputs.export_options = exportOptionsInput.value.trim() || "ExportOptions.plist";
  }

  try {
    await github(`/repos/${repo.owner}/${repo.name}/actions/workflows/build.yml/dispatches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: branch, inputs }),
    });
    setStatus("running", "已提交", "构建任务已提交", "正在等待 GitHub 返回运行编号。" );
    await waitForRun();
  } catch (error) {
    setStatus("error", "失败", "无法启动构建", error.message || "请检查 Token、仓库权限和工作流文件。" );
  } finally {
    setBusy(false);
  }
});

buildTypeInput.addEventListener("change", updateIpaFields);
repoInput.addEventListener("input", updateLinks);
branchInput.addEventListener("input", updateLinks);
artifacts.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-artifact-id]");
  if (!button) return;
  button.disabled = true;
  button.textContent = "下载中…";
  try { await downloadArtifact(button.dataset.artifactId, button.dataset.artifactName); }
  catch (error) { setStatus("error", "下载失败", "产物下载失败", error.message || "请打开 GitHub Actions 手动下载。" ); }
  finally { button.disabled = false; button.textContent = "下载 ZIP"; }
});

updateIpaFields();
updateLinks();

