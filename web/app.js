const $ = (selector) => document.querySelector(selector);
const form = $("#build-form");
const repoInput = $("#repo");
const branchInput = $("#branch");
const buildTypeInput = $("#build-type");
const tokenInput = $("#token");
const ipaFields = $("#ipa-fields");
const projectInput = $("#xcode-project");
const schemeInput = $("#xcode-scheme");
const exportOptionsInput = $("#export-options");
const ipaSigningInput = $("#ipa-signing");
const submitButton = $("#submit-button");
const repoLink = $("#repo-link");
const actionsLink = $("#actions-link");
const statusBadge = $("#status-badge");
const statusCard = $("#status-card");
const statusTitle = $("#status-title");
const statusCopy = $("#status-copy");
const runMeta = $("#run-meta");
const artifactList = $("#artifact-list");
const artifacts = $("#artifacts");
const downloadMessage = $("#download-message");
const buildLogs = globalThis.IOSForgeLogs?.create();

const state = { token: "", repo: null, branch: "main", runId: null, busy: false, knownRuns: new Set(), phase: "idle", artifacts: [], history: [], projects: [] };
const selectedRuns = new Set();
let historyPage = 0, historyHasMore = false;
let selectedSource = null;
const uploadMode = () => !!$('input[name="source_mode"][value="upload"]').checked;
const hints = {
  dylib: "使用 Theos 编译，输出独立动态库文件。",
  deb: "使用 Theos 编译，并打包为可安装的 Debian 插件包。",
  ipa: "使用 Xcode 编译应用，默认输出无需 Apple 证书的未签名 IPA。",
};

function parseRepo(value) {
  const clean = value.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "").replace(/\.git$/, "");
  const match = clean.match(/^([a-z0-9](?:[a-z0-9-]{0,38}))\/([a-z0-9_.-]+)$/i);
  return match && ![".", ".."].includes(match[2]) ? { owner: match[1], name: match[2] } : null;
}

function repoBase(repo = state.repo) {
  return `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
}

function encodePath(path) {
  return String(path).split("/").map(segment => encodeURIComponent(segment)).join("/");
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${state.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const messages = {
      401: "访问令牌无效或已过期，请检查 GitHub Token。",
      403: "GitHub 拒绝了请求。请检查令牌的 Actions 读写权限、上传所需的 Contents 读写权限，以及 API 额度。",
      404: "找不到仓库或编译流程，请检查仓库名称、build.yml 和令牌的仓库授权。",
      422: "GitHub 未接受请求，请检查分支、文件冲突、分支保护和工作流参数。",
      429: "请求过于频繁，请稍后再试。",
    };
    const error = new Error(messages[response.status] || `GitHub 请求失败（${response.status}），请稍后重试。`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

function invalidateWorkspace() {
  state.workspace = null;
  $("#workspace-status").textContent = "尚未核对账号和仓库。填写自己的仓库与 Token 后，点击“检查我的仓库”。";
  $("#workspace-status").dataset.visibility = "unknown";
  $("#allow-public-upload").checked = false;
  $("#public-upload-warning").hidden = true;
  resetProjects("仓库信息变化后，请重新读取项目。");
}

async function verifyWorkspace({ upload = false } = {}) {
  const base = repoBase(), previous = state.workspace;
  const user = await github("/user");
  if (state.closed) throw new Error("页面会话已关闭。");
  const repository = await github(base);
  if (state.closed || !historyMatchesInputs()) throw new Error("账号或仓库输入已变化，请重新检查。");
  if (!Number.isSafeInteger(user.id) || !user.login || repository.owner?.id !== user.id || repository.owner?.type !== "User" || repository.owner.login.toLowerCase() !== user.login.toLowerCase()) {
    invalidateWorkspace();
    throw new Error("只能使用当前 Token 所属用户自己名下的个人仓库，不能使用网站作者、其他用户或组织的仓库。请填写你自己的用户名/仓库名。");
  }
  if (!Number.isSafeInteger(repository.id) || repository.full_name?.toLowerCase() !== `${state.repo.owner}/${state.repo.name}`.toLowerCase() || typeof repository.private !== "boolean") {
    invalidateWorkspace(); throw new Error("无法确认目标仓库或可见性，已停止操作。");
  }
  if (repository.archived || repository.disabled || repository.permissions?.push === false) throw new Error("这个仓库已归档、停用或不可写，请选择可用的个人仓库。");
  const workflow = await github(`${base}/actions/workflows/build.yml`);
  if (!Number.isSafeInteger(workflow.id) || workflow.state !== "active") throw new Error("编译工作流尚未安装或未启用。请按指南导入纯净初始化包，并在自己的仓库 Actions 中启用工作流。");
  if (state.closed || !historyMatchesInputs()) throw new Error("页面会话已变化，已停止操作。");
  if (!previous || previous.id !== repository.id || previous.private !== repository.private) $("#allow-public-upload").checked = false;
  state.workspace = { id: repository.id, private: repository.private, login: user.login };
  $("#workspace-status").dataset.visibility = repository.private ? "private" : "public";
  $("#workspace-status").textContent = `已核对账号 ${user.login} · ${repository.full_name} · ${repository.private ? "Private 私有仓库" : "Public 公开仓库，源码所有人可见"}。编译工作流已启用；写入权限仍以实际操作结果为准。`;
  $("#public-upload-warning").hidden = repository.private;
  updateLinks();
  if (upload && !repository.private && !$("#allow-public-upload").checked) throw new Error("当前是公开仓库，尚未授权公开源码。请改用自己的私有仓库，或阅读上传区的公开风险并单独勾选确认。");
  return repository;
}

function updatePipeline(phase) {
  const stages = {
    idle: ["等待", "等待", "等待"],
    dispatch: ["提交中", "等待", "等待"],
    queued: ["已提交", "排队中", "等待"],
    build: ["已提交", "编译中", "等待"],
    artifacts: ["已提交", "已完成", "读取中"],
    success: ["已提交", "已完成", "已就绪"],
    empty: ["已提交", "已完成", "无产物"],
    stopped: ["已提交", "已停止", "—"],
  };
  let values = stages[phase];
  if (!values) {
    values = state.runId ? ["已提交", "未完成", "—"] : ["未完成", "等待", "等待"];
  }
  document.querySelectorAll(".pipeline li").forEach((step, index) => {
    const value = values[index];
    step.querySelector(".pipeline-state").textContent = value;
    step.className = ["已提交", "已完成", "已就绪"].includes(value) ? "done"
      : ["提交中", "排队中", "编译中", "读取中"].includes(value) ? "active"
      : value === "未完成" ? "failed" : "";
  });
}

function setStatus(kind, badge, title, copy, phase = kind) {
  buildLogs?.event(title, copy, kind);
  state.phase = phase;
  statusBadge.className = `status-badge ${kind}`;
  statusBadge.textContent = badge;
  statusCard.className = `status-card ${kind}-card`;
  statusTitle.textContent = title;
  statusCopy.textContent = copy;
  $("#status-panel").dataset.phase = phase;
  const symbol = kind === "success" ? "check" : kind === "error" ? "info" : phase === "queued" ? "clock" : "layers";
  $("#status-symbol").setAttribute("href", `#i-${symbol}`);
  updatePipeline(phase);
}

function setBusy(busy, label = "构建处理中…") {
  state.busy = busy;
  submitButton.disabled = busy;
  $("#submit-label").textContent = busy ? label : uploadMode() ? "上传并编译" : "开始构建";
  form.setAttribute("aria-busy", String(busy));
  form.querySelectorAll("input, button, select").forEach((input) => { input.disabled = busy; });
  document.querySelectorAll("#history-list button, #refresh-history, #artifacts button").forEach(button => { button.disabled = busy; });
  updateHistoryControls();
  updateProjectControls();
}

function updateLinks() {
  const repo = parseRepo(repoInput.value);
  const base = repo ? `https://github.com${repoBase(repo)}`.replace("/repos/", "/") : "https://github.com";
  actionsLink.hidden = !repo;
  if (!state.busy) actionsLink.href = `${base}/actions?query=branch%3A${encodeURIComponent(branchInput.value.trim() || "main")}`;
}

function updateIpaFields() {
  const ipa = buildTypeInput.value === "ipa";
  ipaFields.hidden = !ipa;
  projectInput.required = false;
  schemeInput.required = false;
  const signed = ipa && ipaSigningInput.value === "signed";
  $("#export-options-field").hidden = !signed;
  exportOptionsInput.required = signed;
  $("#signing-hint").textContent = signed
    ? "需要自行配置 Apple 证书与描述文件导入，并提供对应的导出配置。"
    : "输出未签名 IPA，无需 Apple 证书。普通设备需后续自签；巨魔需设备与系统兼容。";
  $("#build-hint").textContent = hints[buildTypeInput.value];
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function runUrl(runId) {
  return `https://github.com/${encodeURIComponent(state.repo.owner)}/${encodeURIComponent(state.repo.name)}/actions/runs/${encodeURIComponent(runId)}`;
}

function renderRun(run) {
  runMeta.hidden = false;
  runMeta.replaceChildren();
  const fields = [["工作流", run.name || "GitHub Actions"], ["分支", run.head_branch || state.branch], ["运行编号", `#${run.run_number}`], ["提交", (run.head_sha || "").slice(0, 8)]];
  fields.forEach(([label, value], index) => {
    const item = element("div", "meta-item");
    item.append(element("span", "", label));
    const content = element(index === 2 ? "a" : "strong", "", value);
    if (index === 2) {
      content.href = runUrl(run.id);
      content.target = "_blank";
      content.rel = "noreferrer";
    }
    item.append(content);
    runMeta.append(item);
  });
  actionsLink.href = runUrl(run.id);
}

function formatSize(bytes) {
  if (!bytes) return "大小未知";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function loadCurrentOutputs() {
  const ref = await github(`${repoBase()}/git/ref/heads/${encodeURIComponent(state.branch)}`);
  const head = ref.object?.sha;
  if (!/^[0-9a-f]{40}$/i.test(head || "")) throw new Error("无法读取分支最新版本，请稍后重试。");
  const commit = await github(`${repoBase()}/git/commits/${head}`);
  const rootTree = commit.tree?.sha;
  if (!/^[0-9a-f]{40}$/i.test(rootTree || "")) throw new Error("无法读取仓库文件树，请稍后重试。");
  const root = await github(`${repoBase()}/git/trees/${rootTree}`);
  const sourcesRoot = root.tree?.find(item => item.path === "sources" && item.type === "tree" && item.mode === "040000");
  if (!sourcesRoot) return [];
  if (!/^[0-9a-f]{40}$/i.test(sourcesRoot.sha || "")) throw new Error("sources 目录信息不完整，请稍后重试。");
  const sources = await github(`${repoBase()}/git/trees/${sourcesRoot.sha}`);
  const downloadRoot = sources.tree?.find(item => item.path === "Download" && item.type === "tree" && item.mode === "040000");
  if (!downloadRoot) return [];
  if (!/^[0-9a-f]{40}$/i.test(downloadRoot.sha || "")) throw new Error("sources/Download 目录信息不完整，请稍后重试。");
  const tree = await github(`${repoBase()}/git/trees/${downloadRoot.sha}`);
  return (tree.tree || [])
    .filter(item => {
      const name = String(item.path || "");
      return item.type === "blob" && /^[0-9a-f]{40}$/i.test(item.sha || "") && !name.includes("/") && /\.(?:ipa|deb|dylib)$/i.test(name);
    })
    .map(item => {
      const name = item.path;
      return { id: `sources/Download/${name}`, name, path: `sources/Download/${name}`, sha: item.sha, size_in_bytes: item.size, kind: name.split(".").at(-1).toUpperCase() };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

function renderArtifacts(items) {
  state.artifacts = items;
  artifactList.hidden = false;
  artifacts.replaceChildren();
  if (!items.length) {
    artifacts.append(element("p", "artifact-empty", "当前没有可下载产物：可能已删除或未生成。可以重新编译生成。"));
    return;
  }
  items.forEach((artifact) => {
    const row = element("div", "artifact-row");
    const info = element("div");
    info.append(element("div", "artifact-name", artifact.name), element("div", "artifact-size", `${formatSize(artifact.size_in_bytes)} · ${artifact.kind}`));
    const button = element("button", "download-button", `下载 ${artifact.kind}`);
    button.type = "button";
    button.dataset.artifactId = String(artifact.id);
    button.dataset.artifactName = artifact.name;
    const remove = element("button", "delete-button", "删除");
    remove.type = "button";
    remove.dataset.deleteArtifactId = String(artifact.id);
    remove.setAttribute("aria-label", `删除仓库构建产物 ${artifact.name}`);
    const controls = element("div", "artifact-controls");
    controls.append(button, remove);
    row.append(info, controls);
    artifacts.append(row);
  });
}

function downloadArtifact(id) {
  const artifact = state.artifacts.find(item => String(item.id) === String(id));
  if (!state.runId || !state.repo || !artifact?.path) throw new Error("产物信息已变化，请重新打开本次构建。");
  const anchor = element("a");
  anchor.href = `https://github.com/${encodeURIComponent(state.repo.owner)}/${encodeURIComponent(state.repo.name)}/raw/refs/heads/${encodePath(state.branch)}/${encodePath(artifact.path)}`;
  anchor.download = artifact.name;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function runsQuery() {
  return `${repoBase()}/actions/workflows/build.yml/runs?branch=${encodeURIComponent(state.branch)}&event=workflow_dispatch&per_page=20`;
}

async function waitForRun() {
  for (let attempt = 0; attempt < 480; attempt += 1) {
    if (state.closed) return;
    let run;
    if (state.runId) {
      run = await github(`${repoBase()}/actions/runs/${state.runId}`);
    } else {
      const data = await github(runsQuery());
      run = (data.workflow_runs || []).find((item) => !state.knownRuns.has(item.id) && item.display_title?.endsWith(` · ${state.requestId}`) && new Date(item.created_at).getTime() >= state.startedAt - 5000);
    }
    if (state.closed) return;
    if (run) {
      state.runId = run.id;
      renderRun(run);
      buildLogs?.update(run);
      if (run.status === "completed") {
        if (run.conclusion === "success") {
          setStatus("running", "整理中", "编译完成，正在获取产物", "正在读取本次构建的可下载文件。", "artifacts");
          try {
            const items = await loadCurrentOutputs();
            renderArtifacts(items);
            setStatus("success", "已完成", items.length ? "构建完成，作品已就绪" : "构建完成，暂无产物", items.length ? "sources/Download 中的当前成品已列在下方，可直接下载。" : "sources/Download 中没有成品，请查看 GitHub 日志。", items.length ? "success" : "empty");
          } catch (error) {
            setStatus("success", "已完成", "编译已完成", "sources/Download 中的产物列表暂时无法读取，请稍后刷新。", "empty");
          }
        } else if (["cancelled", "skipped", "neutral"].includes(run.conclusion)) {
          setStatus("idle", "已停止", "本次构建已停止", "任务已被取消或跳过，详细原因可在 GitHub 日志中查看。", "stopped");
        } else {
          setStatus("error", "未完成", "这次构建没有完成", "请查看下方运行日志，可复制报错和上下文交给 AI 排查；原文尚未开放时可稍后刷新。", "error");
        }
        return;
      }
      if (run.status === "in_progress") {
        setStatus("running", "编译中", "正在云端编译", "macOS 构建环境正在处理你的源码。", "build");
      } else {
        setStatus("running", "排队中", "等待构建环境", "任务已经提交，GitHub 正在安排运行。", "queued");
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 7500));
  }
  setStatus("idle", "查看日志", "自动刷新已暂停", "网页已等待约 60 分钟，任务可能仍在运行，请在 GitHub 查看最新状态。", "stopped");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.busy) return;
  const repo = parseRepo(repoInput.value);
  const branch = branchInput.value.trim() || "main";
  const token = tokenInput.value.trim();
  if (!repo) return setStatus("error", "检查输入", "请填写你自己的仓库", "格式是你的用户名/仓库名。私密源码请先建立自己的 Private 私有仓库，参见使用指南。");
  if (!token) return setStatus("error", "需要令牌", "请填写 GitHub Token", "令牌需要拥有目标仓库的 Actions 写入权限。");
  let sourceDirectory = $("#source-directory").value.trim();
  if (uploadMode()) {
    if (!selectedSource) return setStatus("error", "选择源码", "请先选择 ZIP 或文件夹", "选择完整工程，检查文件清单后再上传。");
    if (!$("#upload-consent").checked) return setStatus("error", "需要确认", "请确认源码提交位置", "公开仓库中的源码所有人可见。请先阅读并勾选上传确认。");
    try { sourceDirectory = IOSForgeUpload.destination($("#upload-project").value.trim()); } catch (error) { return setStatus("error", "检查名称", "项目名称不正确", error.message); }
  }
  if (buildTypeInput.value === "ipa" && ipaSigningInput.value === "signed" && !exportOptionsInput.value.trim()) {
    return setStatus("error", "检查输入", "请填写导出配置", "证书导出模式需要 ExportOptions.plist 的真实路径；无证书模式不需要。");
  }

  state.token = token;
  state.closed = false;
  state.repo = repo;
  state.branch = branch;
  state.runId = null;
  state.artifacts = [];
  artifacts.replaceChildren();
  artifactList.hidden = true;
  runMeta.hidden = true;
  downloadMessage.hidden = true;
  updateLinks();

  state.requestId = Array.from(crypto.getRandomValues(new Uint8Array(12)), n => n.toString(16).padStart(2, "0")).join("");
  const inputs = { build_type: buildTypeInput.value, request_id: state.requestId };
  buildLogs?.start({ base: repoBase(), repoName: `${repo.owner}/${repo.name}`, branch, token, source: sourceDirectory, buildType: buildTypeInput.value, signing: buildTypeInput.value === "ipa" ? ipaSigningInput.value : "不适用" });
  if (sourceDirectory) inputs.source_directory = sourceDirectory;
  if (buildTypeInput.value === "ipa") {
    inputs.xcode_project = projectInput.value.trim();
    inputs.xcode_scheme = schemeInput.value.trim();
    inputs.ipa_signing = ipaSigningInput.value;
    if (inputs.ipa_signing === "signed") inputs.export_options = exportOptionsInput.value.trim();
  }
  setBusy(true);
  setStatus("running", "提交中", "正在连接 GitHub", "准备启动本次构建。", "dispatch");
  let dispatched = false;
  let uploaded = false;
  try {
    await verifyWorkspace({ upload: uploadMode() });
    if (uploadMode()) {
      setStatus("running", "上传中", "正在保存源码到 GitHub", "文件会作为一次提交保存；上传完成后自动编译。请保持网页打开。", "dispatch");
      $("#upload-progress-wrap").hidden = false;
      $("#upload-result").hidden = true;
      const result = await IOSForgeUpload.publish({ api: github, base: repoBase(), branch, name: $("#upload-project").value.trim(), files: selectedSource.files, replace: $("#upload-replace").checked, progress: (value, copy) => { $("#upload-progress").value = value; $("#upload-progress-text").textContent = copy; } });
      uploaded = true;
      $("#source-directory").value = result.directory;
      const saved = $("#upload-result");
      saved.replaceChildren(element("strong", "", "源码已保存 · "));
      const link = element("a", "", `${result.directory} ↗`);
      link.href = `https://github.com/${repo.owner}/${repo.name}/commit/${result.sha}`;
      link.target = "_blank"; link.rel = "noreferrer";
      saved.append(link); saved.hidden = false;
      $('input[name="source_mode"][value="repository"]').checked = true;
      $('input[name="source_mode"][value="upload"]').checked = false;
      selectedSource = null;
      $("#upload-preview").hidden = true;
      $("#upload-selection-status").textContent = "上次源码已保存。上传新版本时，请重新选择文件。";
      updateSourceMode();
    }
    const existing = await github(runsQuery());
    state.knownRuns = new Set((existing.workflow_runs || []).map((run) => run.id));
    state.startedAt = Date.now();
    const dispatchedRun = await github(`${repoBase()}/actions/workflows/build.yml/dispatches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: branch, inputs }),
    });
    dispatched = true;
    if (Number.isSafeInteger(dispatchedRun?.workflow_run_id) && dispatchedRun.workflow_run_id > 0) {
      state.runId = dispatchedRun.workflow_run_id;
    }
    setStatus("running", "已提交", "构建请求已发送", "正在等待 GitHub 返回本次任务。", "queued");
    await waitForRun();
  } catch (error) {
    setStatus("error", dispatched ? "刷新中断" : "提交失败", dispatched ? "构建状态暂时无法刷新" : uploaded ? "源码已保存，编译未能启动" : "暂时无法提交构建", dispatched ? "构建可能仍在进行，请刷新最近构建确认状态，不要重复提交。" : `${uploaded ? "无需重新上传。先刷新最近构建，确认没有新任务后可再次点击开始构建。" : ""}${error.message || "请检查网络连接后重试。"}`, "error");
  } finally {
    setBusy(false);
  }
});

form.querySelectorAll('input[name="build_type"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    buildTypeInput.value = input.value;
    updateIpaFields();
  });
});
form.querySelectorAll('input[name="ipa_signing"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    ipaSigningInput.value = input.value;
    updateIpaFields();
  });
});
$("#token-toggle").addEventListener("click", () => {
  const show = tokenInput.type === "password";
  tokenInput.type = show ? "text" : "password";
  $("#token-toggle").setAttribute("aria-pressed", String(show));
  $("#token-toggle").setAttribute("aria-label", show ? "隐藏访问令牌" : "显示访问令牌");
});
repoInput.addEventListener("input", updateLinks);
branchInput.addEventListener("input", updateLinks);
artifacts.addEventListener("click", (event) => {
  const button = event.target.closest("[data-artifact-id]");
  if (!button || button.disabled || state.busy || !state.artifacts.some(item => String(item.id) === button.dataset.artifactId)) return;
  try {
    downloadArtifact(button.dataset.artifactId);
    downloadMessage.textContent = "已交给 GitHub 下载真实文件。若新标签页提示登录，请登录拥有该仓库权限的 GitHub 账号后再点一次。";
    downloadMessage.dataset.kind = "success";
    downloadMessage.hidden = false;
  } catch (error) {
    downloadMessage.textContent = error.message || "下载失败，请通过 GitHub 日志页面下载产物。";
    downloadMessage.dataset.kind = "error";
    downloadMessage.hidden = false;
  }
});

function updateSourceMode() {
  const upload = uploadMode();
  $("#upload-panel").hidden = !upload;
  $("#source-directory-field").hidden = upload;
  $("#form-footnote").textContent = upload ? "上传至所选 GitHub 仓库后自动编译；不会上传到第三方服务器。" : "使用仓库已有源码，可填写目录选择之前上传的项目。";
  if (!state.busy) $("#submit-label").textContent = upload ? "上传并编译" : "开始构建";
  updateDestination();
}
function updateDestination() {
  $("#upload-destination").textContent = `提交位置：${repoInput.value.trim()} · ${branchInput.value.trim() || "main"} → sources/${$("#upload-project").value.trim() || "项目名称"}`;
  $("#upload-consent").checked = false;
  $("#allow-public-upload").checked = false;
}
async function selectSource(files, folder) {
  if (state.busy || !files.length) return;
  selectedSource = null;
  $("#upload-preview").hidden = true;
  $("#upload-consent").checked = false;
  setBusy(true, "正在检查源码…");
  $("#upload-selection-status").textContent = "正在本地检查文件结构和常见敏感内容，尚未上传…";
  try {
    if (!folder && (files.length !== 1 || !/\.zip$/i.test(files[0].name))) throw new Error("请一次选择一个 ZIP；文件夹请点击“选择文件夹”。");
    selectedSource = await (folder ? IOSForgeUpload.readFolder(files) : IOSForgeUpload.readZip(files[0]));
    $("#upload-project").value = selectedSource.suggestedName;
    $("#upload-file-count").textContent = `${selectedSource.files.length} 个文件 · ${formatSize(selectedSource.files.reduce((n, file) => n + file.bytes.length, 0))}`;
    const list = $("#upload-file-list"); list.replaceChildren();
    selectedSource.files.slice(0, 100).forEach(file => list.append(element("li", "", file.path)));
    if (selectedSource.files.length > 100) list.append(element("li", "", `另有 ${selectedSource.files.length - 100} 个文件；清单仅预览前 100 个。`));
    $("#upload-preview").hidden = false;
    $("#upload-selection-status").textContent = "本地检查通过。安全检查不能识别所有秘密，请确认源码不含私密信息。";
    updateDestination();
  } catch (error) { $("#upload-selection-status").textContent = error.message || "无法读取源码，请重新选择。"; }
  finally { $("#zip-input").value = ""; $("#folder-input").value = ""; setBusy(false); }
}
form.querySelectorAll('input[name="source_mode"]').forEach(input => input.addEventListener("change", updateSourceMode));
$("#upload-project").addEventListener("input", updateDestination);
$("#pick-zip").addEventListener("click", () => $("#zip-input").click());
$("#pick-folder").addEventListener("click", () => $("#folder-input").click());
$("#zip-input").addEventListener("change", event => selectSource(event.target.files, false));
$("#folder-input").addEventListener("change", event => selectSource(event.target.files, true));
$("#clear-upload").addEventListener("click", () => { selectedSource = null; $("#upload-preview").hidden = true; $("#upload-consent").checked = false; $("#upload-selection-status").textContent = "选择已清除，未删除仓库中的任何文件。"; });
const dropzone = $("#upload-dropzone");
dropzone.addEventListener("dragover", event => { event.preventDefault(); if (!state.busy) dropzone.classList.add("is-dragging"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
dropzone.addEventListener("drop", event => { event.preventDefault(); dropzone.classList.remove("is-dragging"); selectSource(event.dataTransfer.files, false); });
[repoInput, branchInput].forEach(input => input.addEventListener("input", () => { buildLogs?.close(); invalidateWorkspace(); updateDestination(); state.history = []; selectedRuns.clear(); historyPage = 0; historyHasMore = false; renderHistory(); $("#history-message").textContent = "仓库或分支已修改，请刷新记录。"; }));
tokenInput.addEventListener("input", () => { invalidateWorkspace(); buildLogs?.close(); selectedRuns.clear(); updateHistoryControls(); });
$("#check-workspace").addEventListener("click", async () => {
  if (state.busy) return;
  const repo = parseRepo(repoInput.value), token = tokenInput.value.trim();
  if (!repo || !token) { $("#workspace-status").textContent = "请先填写你自己的用户名/仓库名，并粘贴仅授权该仓库的 Token。"; return; }
  state.repo = repo; state.token = token; state.branch = branchInput.value.trim() || "main"; state.closed = false;
  setBusy(true, "正在核对仓库…");
  try { await verifyWorkspace(); }
  catch (error) { $("#workspace-status").textContent = `未通过检查：${error.message}`; }
  finally { setBusy(false); }
});

function updateProjectControls() {
  const select = $("#project-list"), remove = $("#delete-project");
  if (!select || !remove) return;
  const project = state.projects.find(item => item.name === select.value);
  const locked = state.busy || !historyMatchesInputs();
  select.disabled = locked || !state.projects.length;
  remove.disabled = locked || !project;
}
function renderProjects(message) {
  const select = $("#project-list");
  const previous = select.value;
  select.replaceChildren();
  if (!state.projects.length) {
    const option = element("option", "", "没有找到可管理的项目");
    option.value = ""; select.append(option);
  } else {
    state.projects.forEach(project => {
      const option = element("option", "", project.path);
      option.value = project.name; select.append(option);
    });
    if (state.projects.some(project => project.name === previous)) select.value = previous;
  }
  if (message !== undefined) $("#project-message").textContent = message;
  updateProjectControls();
}
function resetProjects(message = "点击“读取项目”查看 sources/ 下已上传的工程。") {
  state.projects = [];
  if ($("#project-list")) renderProjects(message);
}
function confirmProjectDeletion(project) {
  const target = `${project.path} · ${state.repo.owner}/${state.repo.name} · ${state.branch}`;
  const dialog = $("#delete-project-dialog");
  if (typeof dialog.showModal !== "function") return Promise.resolve(window.confirm(`删除整个项目：${target}？\n这会同时删除该项目的全部上传源码，以及共享目录 sources/Download 中的全部构建产物；构建记录与日志保留。文件仍可能存在于 Git 历史中。`));
  $("#delete-project-target").textContent = target;
  return new Promise(resolve => {
    let confirmed = false;
    const close = () => { cleanup(); resolve(confirmed); };
    const approve = () => { confirmed = true; dialog.close(); };
    const cancel = () => dialog.close();
    const cleanup = () => { dialog.removeEventListener("close", close); $("#confirm-delete-project").removeEventListener("click", approve); $("#cancel-delete-project").removeEventListener("click", cancel); };
    dialog.addEventListener("close", close); $("#confirm-delete-project").addEventListener("click", approve); $("#cancel-delete-project").addEventListener("click", cancel);
    dialog.showModal(); $("#cancel-delete-project").focus();
  });
}
$("#project-list").addEventListener("change", updateProjectControls);
$("#refresh-projects").addEventListener("click", async () => {
  if (state.busy) return;
  const repo = parseRepo(repoInput.value), token = tokenInput.value.trim();
  if (!repo || !token) { resetProjects("请先填写正确的仓库和 GitHub Token。"); return; }
  state.repo = repo; state.token = token; state.branch = branchInput.value.trim() || "main"; state.closed = false;
  setBusy(true, "正在读取项目…");
  $("#project-message").textContent = "正在读取 sources/ 下的项目…";
  try {
    await verifyWorkspace();
    const data = await IOSForgeUpload.listProjects({ api: github, base: repoBase(), branch: state.branch });
    if (state.closed || !historyMatchesInputs()) throw new Error("页面会话已变化，请重新读取项目。");
    state.projects = data.projects;
    renderProjects(state.projects.length ? `已找到 ${state.projects.length} 个项目。删除项目会清理该项目源码，并清空共享的 sources/Download 成品目录。` : "sources/ 下暂无源码项目；Download 成品目录不会列在这里。");
  } catch (error) { resetProjects(error.message || "读取项目失败，请稍后重试。"); }
  finally { setBusy(false); }
});
$("#delete-project").addEventListener("click", async () => {
  if (state.busy || !historyMatchesInputs()) return;
  const selected = state.projects.find(project => project.name === $("#project-list").value);
  if (!selected) return;
  setBusy(true, "正在确认删除…");
  try {
    await verifyWorkspace();
    if (!await confirmProjectDeletion(selected)) return;
    $("#project-message").textContent = `正在删除 ${selected.path} 和 sources/Download 中的全部构建产物…`;
    const result = await IOSForgeUpload.removeProject({ api: github, base: repoBase(), branch: state.branch, project: selected.name, expectedSha: selected.sha });
    state.projects = state.projects.filter(project => project.name !== selected.name);
    if ($("#source-directory").value.trim() === selected.path) $("#source-directory").value = "";
    renderProjects();
    const message = $("#project-message");
    message.replaceChildren(document.createTextNode(result.outputsRemoved
      ? `已删除 ${result.path} 的全部源码，并清空 ${result.outputPath} 的全部构建产物。构建记录与日志保留。`
      : `已删除 ${result.path} 的全部源码；sources/Download 原本不存在。构建记录与日志保留。`));
    const link = element("a", "", "查看删除提交 ↗");
    link.href = `https://github.com/${state.repo.owner}/${state.repo.name}/commit/${result.sha}`; link.target = "_blank"; link.rel = "noreferrer";
    message.append(" ", link);
  } catch (error) { $("#project-message").textContent = `项目删除未完成：${error.message || "请刷新项目列表后重试。"}`; }
  finally { setBusy(false); }
});

function historyMatchesInputs() {
  const repo = parseRepo(repoInput.value);
  return !!repo && !!state.repo && repoBase(repo) === repoBase() && (branchInput.value.trim() || "main") === state.branch && !!state.token && tokenInput.value.trim() === state.token;
}
function selectableRun(run) { return Number.isSafeInteger(run.id) && run.id > 0 && run.status === "completed"; }
function updateHistoryControls() {
  const eligible = state.history.filter(selectableRun);
  const eligibleIds = new Set(eligible.map(run => run.id));
  for (const id of selectedRuns) if (!eligibleIds.has(id)) selectedRuns.delete(id);
  const locked = state.busy || !historyMatchesInputs();
  $("#history-toolbar").hidden = !state.history.length;
  $("#select-all-runs").disabled = locked || !eligible.length;
  $("#select-all-runs").checked = !!eligible.length && eligible.every(run => selectedRuns.has(run.id));
  $("#select-all-runs").indeterminate = !!selectedRuns.size && selectedRuns.size < eligible.length;
  $("#select-failed-runs").disabled = locked || !eligible.length;
  $("#delete-selected-runs").disabled = locked || !selectedRuns.size;
  $("#delete-selected-runs").textContent = `删除所选（${selectedRuns.size}）`;
  $("#load-more-runs").hidden = !historyHasMore;
  $("#load-more-runs").disabled = locked;
  document.querySelectorAll("[data-select-run-id]").forEach(input => {
    const id = Number(input.dataset.selectRunId);
    input.disabled = locked || !eligibleIds.has(id);
    input.checked = selectedRuns.has(id);
  });
}
function renderHistory() {
  $("#history-list").replaceChildren();
  state.history.forEach(run => {
    const row = element("div", "history-row");
    const checkbox = element("input", "history-run-check"); checkbox.type = "checkbox"; checkbox.dataset.selectRunId = String(run.id);
    checkbox.setAttribute("aria-label", `选择构建 #${run.run_number}，${run.status === "completed" ? "已结束" : "进行中，不能删除"}`);
    const info = element("div");
    const status = run.status === "completed" ? ({ success: "已完成", failure: "失败", cancelled: "已取消", skipped: "已跳过", timed_out: "超时" }[run.conclusion] || "已结束") : run.status === "in_progress" ? "编译中" : "排队中";
    info.append(element("strong", "", `#${run.run_number} · ${run.display_title || run.name}`), element("span", "", `${status} · ${new Date(run.created_at).toLocaleString("zh-CN")}`));
    const button = element("button", "download-button", "查看产物"); button.type = "button"; button.dataset.runId = String(run.id); button.disabled = state.busy;
    row.append(checkbox, info, button); $("#history-list").append(row);
  });
  updateHistoryControls();
}

async function loadHistoryPage(page) {
  const data = await github(`${repoBase()}/actions/workflows/build.yml/runs?branch=${encodeURIComponent(state.branch)}&per_page=30&page=${page}`);
  if (state.closed) return;
  const records = Array.isArray(data.workflow_runs) ? data.workflow_runs : [];
  const unique = new Map(state.history.map(run => [run.id, run]));
  records.filter(run => Number.isSafeInteger(run.id) && run.id > 0 && (!run.head_branch || run.head_branch === state.branch)).forEach(run => unique.set(run.id, run));
  state.history = [...unique.values()]; historyPage = page; historyHasMore = records.length === 30;
  renderHistory();
  $("#history-message").textContent = state.history.length ? `${state.repo.owner}/${state.repo.name} · ${state.branch} · 已加载 ${state.history.length} 条构建记录${historyHasMore ? "，可继续加载更早记录" : ""}` : "这个分支暂无构建记录。源码和配置仍然保留，可按需开始构建。";
}

$("#refresh-history").addEventListener("click", async () => {
  if (state.busy) return;
  const repo = parseRepo(repoInput.value), token = tokenInput.value.trim();
  if (!repo || !token) { $("#history-message").textContent = "请先填写正确的仓库地址和 GitHub Token。"; return; }
  const changed = !state.repo || repoBase(repo) !== repoBase() || state.branch !== (branchInput.value.trim() || "main");
  state.repo = repo; state.token = token; state.branch = branchInput.value.trim() || "main"; state.closed = false;
  if (changed) { state.runId = null; state.artifacts = []; artifactList.hidden = true; runMeta.hidden = true; setStatus("idle", "待命", "已切换仓库或分支", "选择一条构建记录查看产物。"); }
  if (changed) buildLogs?.close();
  setBusy(true, "正在读取记录…");
  $("#history-message").textContent = "正在读取 GitHub 上的构建记录…";
  state.history = []; selectedRuns.clear(); historyPage = 0; historyHasMore = false; renderHistory();
  try {
    await verifyWorkspace();
    await loadHistoryPage(1);
  } catch (error) { $("#history-message").textContent = error.message; }
  finally { setBusy(false); }
});
$("#load-more-runs").addEventListener("click", async () => {
  if (state.busy || !historyHasMore || !historyMatchesInputs()) return;
  setBusy(true, "正在读取记录…");
  try { await loadHistoryPage(historyPage + 1); }
  catch (error) { $("#history-message").textContent = `未能加载更早记录：${error.message}。当前列表仍可使用。`; }
  finally { setBusy(false); }
});
$("#history-list").addEventListener("change", event => {
  const input = event.target.closest("[data-select-run-id]");
  if (!input || state.busy || !historyMatchesInputs()) return;
  const run = state.history.find(run => String(run.id) === input.dataset.selectRunId);
  if (!run || !selectableRun(run)) return;
  if (input.checked) selectedRuns.add(run.id); else selectedRuns.delete(run.id);
  updateHistoryControls();
});
$("#select-all-runs").addEventListener("change", event => {
  if (state.busy || !historyMatchesInputs()) return;
  selectedRuns.clear();
  if (event.target.checked) state.history.filter(selectableRun).forEach(run => selectedRuns.add(run.id));
  updateHistoryControls();
});
$("#select-failed-runs").addEventListener("click", () => {
  if (state.busy || !historyMatchesInputs()) return;
  selectedRuns.clear();
  state.history.filter(run => selectableRun(run) && ["failure", "cancelled", "timed_out", "action_required", "startup_failure"].includes(run.conclusion)).forEach(run => selectedRuns.add(run.id));
  updateHistoryControls();
});

function confirmRunDeletion(runs) {
  const successful = runs.filter(run => run.conclusion === "success").length;
  const scope = `${state.repo.owner}/${state.repo.name} · ${state.branch} · ${runs.length} 条记录（其中 ${successful} 条成功记录）`;
  const targets = runs.map(run => `#${run.run_number} · ${run.display_title || run.name} · ID ${run.id}`);
  const dialog = $("#delete-runs-dialog");
  if (typeof dialog.showModal !== "function") return Promise.resolve(window.confirm(`永久删除 ${scope}？\n${targets.join("\n")}\n这会删除 Actions 记录与日志；sources/Download 中的真实产物和项目源码保留。`));
  $("#delete-runs-scope").textContent = scope;
  $("#delete-runs-targets").replaceChildren(...targets.map(target => element("li", "", target)));
  return new Promise(resolve => {
    let confirmed = false;
    const close = () => { dialog.removeEventListener("close", close); $("#confirm-delete-runs").removeEventListener("click", approve); $("#cancel-delete-runs").removeEventListener("click", cancel); resolve(confirmed); };
    const approve = () => { confirmed = true; dialog.close(); };
    const cancel = () => dialog.close();
    dialog.addEventListener("close", close); $("#confirm-delete-runs").addEventListener("click", approve); $("#cancel-delete-runs").addEventListener("click", cancel);
    dialog.showModal(); $("#cancel-delete-runs").focus();
  });
}
$("#delete-selected-runs").addEventListener("click", async () => {
  if (state.busy || !historyMatchesInputs()) return;
  const targets = state.history.filter(run => selectedRuns.has(run.id) && selectableRun(run)).map(run => ({ ...run }));
  if (!targets.length) return;
  const base = repoBase(), branch = state.branch;
  let removed = 0, skipped = 0, confirmed = false;
  setBusy(true, "正在确认删除…");
  try {
    await verifyWorkspace();
    if (!await confirmRunDeletion(targets)) return;
    confirmed = true;
    const workflow = await github(`${base}/actions/workflows/build.yml`);
    if (!Number.isSafeInteger(workflow.id)) throw new Error("无法核对编译工作流，已停止删除。");
    for (const target of targets) {
      if (state.closed || !historyMatchesInputs() || repoBase() !== base || state.branch !== branch) throw new Error("会话发生变化，已停止后续删除。");
      $("#history-message").textContent = `正在核对并删除 ${removed + skipped + 1} / ${targets.length}：#${target.run_number}。请保持页面打开。`;
      const current = await github(`${base}/actions/runs/${target.id}`);
      if (state.closed) break;
      if (current.id !== target.id || current.workflow_id !== workflow.id || current.head_branch !== branch || current.head_sha !== target.head_sha || current.status !== "completed" || current.conclusion !== target.conclusion || (current.run_attempt || 1) !== (target.run_attempt || 1)) { skipped += 1; continue; }
      if (state.runId === target.id) buildLogs?.close();
      await github(`${base}/actions/runs/${target.id}`, { method: "DELETE" });
      removed += 1; selectedRuns.delete(target.id); state.history = state.history.filter(run => run.id !== target.id);
      if (state.runId === target.id) {
        state.runId = null; state.artifacts = []; artifacts.replaceChildren(); artifactList.hidden = true; runMeta.hidden = true; downloadMessage.hidden = true;
        setStatus("idle", "已清理", "所选构建记录已删除", "对应 Actions 日志已删除；sources/Download 产物和源码保留。");
        buildLogs?.close(); updateLinks();
      }
      renderHistory();
    }
    $("#history-message").textContent = `已永久删除 ${removed} 条构建记录及对应 Actions 日志。${skipped ? `另有 ${skipped} 条状态已变化，未删除。` : ""}sources/Download 产物和源码保留。请刷新记录查看最新列表。`;
  } catch (error) {
    $("#history-message").textContent = `批量操作已停止，已确认删除 ${removed} 条。${error.message || "网络中断，最后一条结果可能未确认"} 请先刷新记录核对，不要直接重复删除。`;
  } finally {
    if (confirmed) { selectedRuns.clear(); historyHasMore = false; }
    renderHistory(); setBusy(false);
  }
});
$("#history-list").addEventListener("click", async event => {
  const button = event.target.closest("[data-run-id]");
  if (!button || state.busy || !state.history.some(run => String(run.id) === button.dataset.runId)) return;
  state.runId = Number(button.dataset.runId); state.artifacts = []; artifactList.hidden = true; downloadMessage.hidden = true;
  state.closed = false;
  buildLogs?.start({ base: repoBase(), repoName: `${state.repo.owner}/${state.repo.name}`, branch: state.branch, token: state.token });
  setBusy(true, "正在读取构建…");
  try { await waitForRun(); } catch (error) { setStatus("error", "刷新中断", "无法读取本次构建", error.message); }
  finally { setBusy(false); }
});

function confirmDelete(artifact) {
  const target = `${artifact.name} · ${state.repo.owner}/${state.repo.name} · 运行 ID ${state.runId}`;
  const dialog = $("#delete-dialog");
  if (typeof dialog.showModal !== "function") return Promise.resolve(window.confirm(`从仓库 sources/Download 永久删除：${target}？\n不会删除源码、构建记录或已经下载到本地的文件。删除后需重新编译才能生成。`));
  $("#delete-target").textContent = target;
  return new Promise(resolve => {
    let confirmed = false;
    const close = () => { cleanup(); resolve(confirmed); };
    const approve = () => { confirmed = true; dialog.close(); };
    const cancel = () => dialog.close();
    const cleanup = () => { dialog.removeEventListener("close", close); $("#confirm-delete").removeEventListener("click", approve); $("#cancel-delete").removeEventListener("click", cancel); };
    dialog.addEventListener("close", close); $("#confirm-delete").addEventListener("click", approve); $("#cancel-delete").addEventListener("click", cancel);
    dialog.showModal(); $("#cancel-delete").focus();
  });
}
artifacts.addEventListener("click", async event => {
  const button = event.target.closest("[data-delete-artifact-id]");
  if (!button || state.busy) return;
  const artifact = state.artifacts.find(item => String(item.id) === button.dataset.deleteArtifactId);
  if (!artifact) return;
  setBusy(true, "正在管理产物…");
  try {
    await verifyWorkspace();
    if (!await confirmDelete(artifact)) return;
    downloadMessage.hidden = false; downloadMessage.dataset.kind = "pending"; downloadMessage.textContent = `正在删除 ${artifact.name}…`;
    await github(`${repoBase()}/contents/${encodePath(artifact.path)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Delete ${artifact.path} from iOSForge`, sha: artifact.sha, branch: state.branch }),
    });
    renderArtifacts(state.artifacts.filter(item => item.id !== artifact.id));
    downloadMessage.dataset.kind = "success";
    downloadMessage.textContent = `已从 sources/Download 永久删除 ${artifact.name}。最后一个文件删掉后 Download 文件夹会自动消失；源码、构建记录和已下载文件未受影响。`;
    if (!state.artifacts.length && state.phase === "success") setStatus("success", "已完成", "成品目录已清空", "sources/Download 已无构建文件；空文件夹会自动消失。", "empty");
  } catch (error) {
    downloadMessage.hidden = false;
    downloadMessage.dataset.kind = "error";
    downloadMessage.textContent = `未能确认删除结果：${error.message || "网络中断"}。请刷新记录并重新查看本次产物；不要重复点击删除。`;
  } finally { setBusy(false); }
});

updateIpaFields();
updateLinks();
updateSourceMode();
globalThis.window?.addEventListener?.("pagehide", () => { state.closed = true; state.token = ""; tokenInput.value = ""; selectedSource = null; selectedRuns.clear(); invalidateWorkspace(); });
