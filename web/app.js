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

const state = { token: "", repo: null, branch: "main", runId: null, busy: false, knownRuns: new Set(), phase: "idle" };
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
      403: "GitHub 拒绝了请求。请检查令牌的 Actions 写入权限和 API 使用额度。",
      404: "找不到仓库或编译流程，请检查仓库名称、build.yml 和令牌的仓库授权。",
      422: "无法启动此构建，请检查分支、输入参数和工作流是否支持手动运行。",
      429: "请求过于频繁，请稍后再试。",
    };
    throw new Error(messages[response.status] || `GitHub 请求失败（${response.status}），请稍后重试。`);
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

function setBusy(busy) {
  state.busy = busy;
  submitButton.disabled = busy;
  $("#submit-label").textContent = busy ? "构建处理中…" : "开始构建";
  form.setAttribute("aria-busy", String(busy));
  form.querySelectorAll("input").forEach((input) => { input.disabled = busy; });
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
  projectInput.required = ipa;
  schemeInput.required = ipa;
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
  artifactList.hidden = false;
  artifacts.replaceChildren();
  if (!items.length) {
    artifacts.append(element("p", "artifact-empty", "没有找到可下载文件，请在 GitHub 查看构建日志。"));
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
    row.append(info, button);
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
  for (let attempt = 0; attempt < 240; attempt += 1) {
    let run;
    if (state.runId) {
      run = await github(`${repoBase()}/actions/runs/${state.runId}`);
    } else {
      const data = await github(runsQuery());
      run = (data.workflow_runs || []).find((item) => !state.knownRuns.has(item.id) && new Date(item.created_at).getTime() >= state.startedAt - 5000);
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
  setStatus("idle", "查看日志", "自动刷新已暂停", "网页已等待约 30 分钟，任务可能仍在运行，请在 GitHub 查看最新状态。", "stopped");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.busy) return;
  const repo = parseRepo(repoInput.value);
  const branch = branchInput.value.trim() || "main";
  const token = tokenInput.value.trim();
  if (!repo) return setStatus("error", "检查输入", "仓库地址格式不正确", "请输入 owner/repository，例如 mango6i/iOSForge。");
  if (!token) return setStatus("error", "需要令牌", "请填写 GitHub Token", "令牌需要拥有目标仓库的 Actions 写入权限。");
  if (buildTypeInput.value === "ipa" && (!projectInput.value.trim() || !schemeInput.value.trim())) {
    return setStatus("error", "检查输入", "请补充 IPA 配置", "需要填写 Xcode 工程路径和 Scheme。");
  }
  if (buildTypeInput.value === "ipa" && ipaSigningInput.value === "signed" && !exportOptionsInput.value.trim()) {
    return setStatus("error", "检查输入", "请填写导出配置", "证书导出模式需要 ExportOptions.plist 的真实路径；无证书模式不需要。");
  }

  state.token = token;
  state.repo = repo;
  state.branch = branch;
  state.runId = null;
  artifacts.replaceChildren();
  artifactList.hidden = true;
  runMeta.hidden = true;
  downloadMessage.hidden = true;
  updateLinks();

  const inputs = { build_type: buildTypeInput.value };
  if (buildTypeInput.value === "ipa") {
    inputs.xcode_project = projectInput.value.trim();
    inputs.xcode_scheme = schemeInput.value.trim();
    inputs.ipa_signing = ipaSigningInput.value;
    if (inputs.ipa_signing === "signed") inputs.export_options = exportOptionsInput.value.trim();
  }
  setBusy(true);
  setStatus("running", "提交中", "正在连接 GitHub", "准备启动本次构建。", "dispatch");
  let dispatched = false;
  try {
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
    setStatus("error", dispatched ? "刷新中断" : "提交失败", dispatched ? "构建状态暂时无法刷新" : "暂时无法提交构建", dispatched ? "构建可能仍在进行，请在 GitHub 查看状态后再决定是否重新提交。" : error.message || "请检查网络连接后重试。", "error");
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
  if (!button || button.disabled) return;
  button.disabled = true;
  button.textContent = "下载中…";
  downloadMessage.hidden = true;
  try {
    await downloadArtifact(button.dataset.artifactId, button.dataset.artifactName);
  } catch (error) {
    downloadMessage.textContent = error.message || "下载失败，请通过 GitHub 日志页面下载产物。";
    downloadMessage.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "下载 ZIP";
  }
});

updateIpaFields();
updateLinks();
