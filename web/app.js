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

const state = { token: "", repo: null, branch: "main", runId: null, busy: false, knownRuns: new Set(), phase: "idle", artifacts: [], history: [] };
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

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
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
  form.querySelectorAll("input, button").forEach((input) => { input.disabled = busy; });
  document.querySelectorAll("#history-list button, #refresh-history, #artifacts button").forEach(button => { button.disabled = busy; });
}

function updateLinks() {
  const repo = parseRepo(repoInput.value);
  const base = repo ? `https://github.com${repoBase(repo)}`.replace("/repos/", "/") : "https://github.com/mango6i/iOSForge";
  repoLink.href = base;
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

function renderArtifacts(items) {
  state.artifacts = items;
  artifactList.hidden = false;
  artifacts.replaceChildren();
  if (!items.length) {
    artifacts.append(element("p", "artifact-empty", "当前没有可下载产物：可能已删除、已过期或未生成。可以重新编译生成。"));
    return;
  }
  items.forEach((artifact) => {
    const row = element("div", "artifact-row");
    const info = element("div");
    info.append(element("div", "artifact-name", artifact.name), element("div", "artifact-size", `${formatSize(artifact.size_in_bytes)} · ZIP`));
    const button = element("button", "download-button", "下载 ZIP");
    button.type = "button";
    button.dataset.artifactId = String(artifact.id);
    button.dataset.artifactName = artifact.name;
    const remove = element("button", "delete-button", "删除");
    remove.type = "button";
    remove.dataset.deleteArtifactId = String(artifact.id);
    remove.setAttribute("aria-label", `删除云端产物 ${artifact.name}`);
    const controls = element("div", "artifact-controls");
    controls.append(button, remove);
    row.append(info, controls);
    artifacts.append(row);
  });
}

async function downloadArtifact(id, name) {
  const response = await fetch(`https://api.github.com${repoBase()}/actions/artifacts/${encodeURIComponent(id)}/zip`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${state.token}`, "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!response.ok) throw new Error("下载暂时不可用，请通过下方 GitHub 日志链接下载产物。");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = element("a");
  anchor.href = url;
  anchor.download = `${name}.zip`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function runsQuery() {
  return `${repoBase()}/actions/workflows/build.yml/runs?branch=${encodeURIComponent(state.branch)}&event=workflow_dispatch&per_page=20`;
}

async function waitForRun() {
  for (let attempt = 0; attempt < 480; attempt += 1) {
    let run;
    if (state.runId) {
      run = await github(`${repoBase()}/actions/runs/${state.runId}`);
    } else {
      const data = await github(runsQuery());
      run = (data.workflow_runs || []).find((item) => !state.knownRuns.has(item.id) && item.display_title?.endsWith(` · ${state.requestId}`) && new Date(item.created_at).getTime() >= state.startedAt - 5000);
    }
    if (run) {
      state.runId = run.id;
      renderRun(run);
      if (run.status === "completed") {
        if (run.conclusion === "success") {
          setStatus("running", "整理中", "编译完成，正在获取产物", "正在读取本次构建的可下载文件。", "artifacts");
          try {
            const data = await github(`${repoBase()}/actions/runs/${run.id}/artifacts`);
            const items = (data.artifacts || []).filter((item) => !item.expired);
            renderArtifacts(items);
            setStatus("success", "已完成", items.length ? "构建完成，作品已就绪" : "构建完成，暂无产物", items.length ? "文件已准备好，可以从下方下载。" : "本次任务没有输出文件，请查看 GitHub 日志。", items.length ? "success" : "empty");
          } catch (error) {
            setStatus("success", "已完成", "编译已完成", "产物列表暂时无法读取，请前往 GitHub 下载。", "empty");
          }
        } else if (["cancelled", "skipped", "neutral"].includes(run.conclusion)) {
          setStatus("idle", "已停止", "本次构建已停止", "任务已被取消或跳过，详细原因可在 GitHub 日志中查看。", "stopped");
        } else {
          setStatus("error", "未完成", "这次构建没有完成", "请打开 GitHub 日志，查看编译报错后再试。", "error");
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
  if (!repo) return setStatus("error", "检查输入", "仓库地址格式不正确", "请输入 owner/repository，例如 mango6i/iOSForge。");
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
artifacts.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-artifact-id]");
  if (!button || button.disabled || state.busy || !state.artifacts.some(item => String(item.id) === button.dataset.artifactId)) return;
  setBusy(true, "下载处理中…");
  button.disabled = true;
  button.textContent = "下载中…";
  downloadMessage.hidden = true;
  try {
    await downloadArtifact(button.dataset.artifactId, button.dataset.artifactName);
  } catch (error) {
    downloadMessage.textContent = error.message || "下载失败，请通过 GitHub 日志页面下载产物。";
    downloadMessage.hidden = false;
  } finally {
    setBusy(false);
    button.disabled = false;
    button.textContent = "下载 ZIP";
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
[repoInput, branchInput].forEach(input => input.addEventListener("input", () => { updateDestination(); state.history = []; $("#history-list").replaceChildren(); $("#history-message").textContent = "仓库或分支已修改，请刷新记录。"; }));

$("#refresh-history").addEventListener("click", async () => {
  if (state.busy) return;
  const repo = parseRepo(repoInput.value), token = tokenInput.value.trim();
  if (!repo || !token) { $("#history-message").textContent = "请先填写正确的仓库地址和 GitHub Token。"; return; }
  const changed = !state.repo || repoBase(repo) !== repoBase() || state.branch !== (branchInput.value.trim() || "main");
  state.repo = repo; state.token = token; state.branch = branchInput.value.trim() || "main";
  if (changed) { state.runId = null; state.artifacts = []; artifactList.hidden = true; runMeta.hidden = true; setStatus("idle", "待命", "已切换仓库或分支", "选择一条构建记录查看产物。"); }
  setBusy(true, "正在读取记录…");
  $("#history-message").textContent = "正在读取 GitHub 上的构建记录…";
  state.history = []; $("#history-list").replaceChildren();
  try {
    const data = await github(`${repoBase()}/actions/workflows/build.yml/runs?branch=${encodeURIComponent(state.branch)}&per_page=10`);
    state.history = data.workflow_runs || [];
    state.history.forEach(run => {
      const row = element("div", "history-row");
      const info = element("div");
      const status = run.status === "completed" ? ({ success: "已完成", failure: "失败", cancelled: "已取消", skipped: "已跳过" }[run.conclusion] || "已结束") : run.status === "in_progress" ? "编译中" : "排队中";
      info.append(element("strong", "", `#${run.run_number} · ${run.display_title || run.name}`), element("span", "", `${status} · ${new Date(run.created_at).toLocaleString("zh-CN")}`));
      const button = element("button", "download-button", "查看产物"); button.type = "button"; button.dataset.runId = String(run.id);
      row.append(info, button); $("#history-list").append(row);
    });
    $("#history-message").textContent = state.history.length ? `${state.repo.owner}/${state.repo.name} · ${state.branch} · 最近 ${state.history.length} 次构建` : "这个分支还没有构建记录。上传源码并开始第一次构建吧。";
  } catch (error) { $("#history-message").textContent = error.message; }
  finally { setBusy(false); }
});
$("#history-list").addEventListener("click", async event => {
  const button = event.target.closest("[data-run-id]");
  if (!button || state.busy || !state.history.some(run => String(run.id) === button.dataset.runId)) return;
  state.runId = Number(button.dataset.runId); state.artifacts = []; artifactList.hidden = true; downloadMessage.hidden = true;
  setBusy(true, "正在读取构建…");
  try { await waitForRun(); } catch (error) { setStatus("error", "刷新中断", "无法读取本次构建", error.message); }
  finally { setBusy(false); }
});

function confirmDelete(artifact) {
  const target = `${artifact.name} · ${state.repo.owner}/${state.repo.name} · 运行 ID ${state.runId}`;
  const dialog = $("#delete-dialog");
  if (typeof dialog.showModal !== "function") return Promise.resolve(window.confirm(`永久删除云端产物：${target}？\n不会删除源码、构建记录或本地下载。删除无法恢复，需要重新编译。`));
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
    if (!await confirmDelete(artifact)) return;
    downloadMessage.hidden = false; downloadMessage.textContent = `正在删除 ${artifact.name}…`;
    await github(`${repoBase()}/actions/artifacts/${artifact.id}`, { method: "DELETE" });
    renderArtifacts(state.artifacts.filter(item => item.id !== artifact.id));
    downloadMessage.textContent = `已永久删除云端产物 ${artifact.name}。源码、构建记录和已下载文件未受影响。`;
    if (!state.artifacts.length && state.phase === "success") setStatus("success", "已完成", "本次云端产物已清空", "构建记录保留。需要文件时，可重新编译生成。", "empty");
  } catch (error) {
    downloadMessage.hidden = false;
    downloadMessage.textContent = `未能确认删除结果：${error.message || "网络中断"}。请刷新记录并重新查看本次产物；不要重复点击删除。`;
  } finally { setBusy(false); }
});

updateIpaFields();
updateLinks();
updateSourceMode();
