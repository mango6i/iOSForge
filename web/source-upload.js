/* Local-only inspection; GitHub is the only upload destination. */
(() => {
  "use strict";
  const MB = 1024 * 1024;
  const limits = Object.freeze({ archive: 25 * MB, total: 50 * MB, file: 10 * MB, count: 1000 });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  const fail = (message) => { throw new Error(message); };
  const key = (path) => path.normalize("NFC").toLowerCase();
  function validPath(path) {
    if (!path || /[\\\x00-\x1f\x7f:]/.test(path) || path.startsWith("/") || path.split("/").some(p => !p || p === "." || p === ".." || /[. ]$/.test(p))) fail(`不安全或不兼容的文件路径：${path}`);
    return path;
  }
  function ignored(path) { return path.split("/").some(p => [".git", "__MACOSX", ".DS_Store"].includes(p) || p.startsWith("._")); }
  function textOf(bytes) { try { return bytes.includes(0) ? null : decoder.decode(bytes); } catch { return null; } }
  function inspect(file) {
    if (file.bytes.length > limits.file) fail(`单个文件超过 10 MB：${file.path}`);
    const name = file.path.split("/").pop();
    if (/\.(p12|pfx|pem|p8|key|mobileprovision)$/i.test(name) || /^(\.env($|\.)|\.npmrc$|\.netrc$|id_rsa$|id_ed25519$|credentials($|\.))/i.test(name) && !/\.(example|sample|template)$/i.test(name)) fail(`疑似凭据文件，已阻止上传：${file.path}。请移除密钥，使用仓库 Secrets。`);
    file.text = textOf(file.bytes);
    if (file.text && (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(file.text) || /\b(gh[pousr]_[a-zA-Z0-9]{30,}|github_pat_[a-zA-Z0-9_]{50,})\b/.test(file.text))) fail(`文件疑似包含私钥或 GitHub Token：${file.path}`);
    if (file.text?.startsWith("version https://git-lfs.github.com/spec/v1")) fail(`发现 Git LFS 指针而非真实内容：${file.path}。请使用 Git 客户端上传完整工程。`);
    if (file.mode !== "100755") file.mode = file.text?.startsWith("#!") || /\.(sh|command)$/.test(name) ? "100755" : "100644";
    return file;
  }
  function prepare(entries, suggestedName) {
    let files = entries.filter(file => !ignored(validPath(file.path)));
    if (!files.length) fail("没有找到可上传的文件。");
    if (files.length > limits.count || files.reduce((n, file) => n + file.bytes.length, 0) > limits.total) fail("源码超过 1000 个文件或解压后 50 MB，请精简依赖/缓存，或使用 Git 客户端上传。");
    const wrapper = files[0].path.split("/")[0];
    if (!/\.(xcodeproj|xcworkspace)$/.test(wrapper) && files.every(file => file.path.startsWith(wrapper + "/"))) {
      files = files.map(file => ({ ...file, path: file.path.slice(wrapper.length + 1) }));
      suggestedName = wrapper;
    }
    const paths = new Set();
    files.forEach(file => {
      const normalized = key(file.path);
      if (paths.has(normalized)) fail(`存在重复或大小写冲突的文件：${file.path}`);
      paths.add(normalized);
      inspect(file);
    });
    files.forEach(file => {
      const parts = file.path.split("/");
      while (parts.pop(), parts.length) if (paths.has(key(parts.join("/")))) fail(`文件与目录重名：${file.path}`);
    });
    return { files: files.sort((a, b) => a.path.localeCompare(b.path)), suggestedName: (suggestedName || "MyProject").replace(/[^\p{L}\p{N}._-]/gu, "-").replace(/^[._-]+/, "").slice(0, 64) || "MyProject" };
  }
  const crcTable = Uint32Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
  function crc32(bytes) { let crc = -1; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ -1) >>> 0; }
  async function readZip(file) {
    if (file.size > limits.archive) fail("ZIP 超过 25 MB，请精简后重试，或使用 Git 客户端。");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = n => view.getUint16(n, true), u32 = n => view.getUint32(n, true);
    let end = -1;
    for (let n = bytes.length - 22; n >= Math.max(0, bytes.length - 65557); n--) if (u32(n) === 0x06054b50 && n + 22 + u16(n + 20) === bytes.length) { end = n; break; }
    if (end < 0) fail("不是完整的 ZIP 文件，请重新压缩源码。");
    if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10) || u16(end + 10) === 65535) fail("不支持分卷或 ZIP64，请使用普通 ZIP。");
    let cursor = u32(end + 16), total = 0;
    const centralEnd = cursor + u32(end + 12), count = u16(end + 10), records = [];
    if (count > 4000 || centralEnd > end) fail("ZIP 文件目录过大或损坏。");
    for (let i = 0; i < count; i++) {
      if (cursor + 46 > centralEnd || u32(cursor) !== 0x02014b50) fail("ZIP 文件目录损坏。");
      const flags = u16(cursor + 8), method = u16(cursor + 10), crc = u32(cursor + 16), size = u32(cursor + 24), packed = u32(cursor + 20), offset = u32(cursor + 42);
      const nameSize = u16(cursor + 28), extra = u16(cursor + 30), comment = u16(cursor + 32), mode = u32(cursor + 38) >>> 16;
      const next = cursor + 46 + nameSize + extra + comment;
      if (next > centralEnd || flags & 1 || ![0, 8].includes(method) || [size, packed, offset].includes(0xffffffff)) fail("ZIP 已加密、损坏或格式不受支持。");
      let name;
      try { name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameSize)); } catch { fail("ZIP 文件名不是 UTF-8，请改用文件夹上传或重新压缩。"); }
      cursor = next;
      validPath(name.endsWith("/") ? name.slice(0, -1) : name);
      if ((mode & 0xf000) === 0xa000) fail(`ZIP 包含符号链接：${name}。请使用 Git 客户端上传，保留链接语义。`);
      if (name.endsWith("/") || ignored(name)) continue;
      total += size;
      if (size > limits.file || total > limits.total || records.length >= limits.count) fail("超过限制：单文件 10 MB、解压后 50 MB、1000 个文件。");
      if (offset + 30 > u32(end + 16) || u32(offset) !== 0x04034b50 || u16(offset + 8) !== method || u16(offset + 6) !== flags) fail("ZIP 数据头损坏。");
      const start = offset + 30 + u16(offset + 26) + u16(offset + 28);
      if (start + packed > u32(end + 16)) fail("ZIP 文件内容不完整。");
      records.push({ path: name, method, crc, size, packed, start, mode: mode & 0o111 ? "100755" : "100644" });
    }
    if (cursor !== centralEnd) fail("ZIP 目录长度不匹配。");
    const files = [];
    for (const record of records) {
      const compressed = bytes.subarray(record.start, record.start + record.packed);
      let content;
      try {
        if (record.method === 0) content = compressed.slice();
        else {
          content = new Uint8Array(record.size);
          let written = 0;
          // Small input chunks bound transient allocations, even if a ZIP lies about its size.
          const stream = new globalThis.fflate.Inflate(chunk => {
            if (written + chunk.length > record.size) fail("实际解压大小超过 ZIP 声明。");
            content.set(chunk, written); written += chunk.length;
          });
          for (let n = 0; n < compressed.length; n += 1024) {
            stream.push(compressed.subarray(n, n + 1024), n + 1024 >= compressed.length);
            if (n && n % (128 * 1024) === 0) await new Promise(resolve => setTimeout(resolve, 0));
          }
          if (written !== record.size || !compressed.length) fail("实际解压大小与 ZIP 声明不符。");
        }
      } catch { fail(`ZIP 解压失败或实际大小不符：${record.path}`); }
      if (content.length !== record.size || crc32(content) !== record.crc) fail(`ZIP 内容校验失败：${record.path}`);
      files.push({ path: record.path, bytes: content, mode: record.mode });
      if (files.length % 30 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    return prepare(files, file.name.replace(/\.zip$/i, ""));
  }
  async function readFolder(list) {
    const files = [...list].filter(file => !ignored(validPath(file.webkitRelativePath || file.name)));
    if (files.length > limits.count || files.some(file => file.size > limits.file) || files.reduce((n, file) => n + file.size, 0) > limits.total) fail("超过限制：单文件 10 MB、总计 50 MB、1000 个文件。");
    const entries = [];
    for (const file of files) entries.push({ path: file.webkitRelativePath || file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    return prepare(entries, "MyProject");
  }
  function destination(name) {
    if (!/^[\p{L}\p{N}][\p{L}\p{N}._-]{0,63}$/u.test(name) || /[.]$/.test(name)) fail("项目名称请用字母、汉字或数字开头，后接字母、数字、点、短横线或下划线，最多 64 字。");
    if (/^download$/i.test(name)) fail("Download 是构建成品专用目录，请换一个项目名称。");
    return `sources/${name}`;
  }
  function base64(bytes) { let raw = ""; for (let i = 0; i < bytes.length; i += 8192) raw += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(raw); }
  async function blobHash(bytes) {
    const header = encoder.encode(`blob ${bytes.length}\0`), data = new Uint8Array(header.length + bytes.length);
    data.set(header); data.set(bytes, header.length);
    return [...new Uint8Array(await crypto.subtle.digest("SHA-1", data))].map(n => n.toString(16).padStart(2, "0")).join("");
  }
  async function publish({ api, base, branch, name, files, replace = false, progress = () => {} }) {
    const target = destination(name);
    if (!files.length) fail("请先选择源码。");
    const refPath = `${base}/git/ref/heads/${encodeURIComponent(branch)}`;
    const original = (await api(refPath)).object.sha;
    const commit = await api(`${base}/git/commits/${original}`);
    const listing = await api(`${base}/git/trees/${commit.tree.sha}?recursive=1`);
    if (listing.truncated) fail("仓库文件树过大，无法安全检查覆盖，请使用 Git 客户端。");
    const current = new Map(listing.tree.map(item => [key(item.path), item]));
    const existing = listing.tree.some(item => key(item.path) === key(target) || key(item.path).startsWith(key(target) + "/"));
    if (existing && !replace) fail(`目录 ${target} 已存在。请换一个项目名称，或明确勾选允许更新同名文件。`);
    const changes = [];
    for (const file of files) {
      const path = `${target}/${validPath(file.path)}`;
      const parts = path.split("/");
      for (let n = 1; n <= parts.length; n++) {
        const part = parts.slice(0, n).join("/"), old = current.get(key(part));
        if (old && (old.path !== part || old.type !== (n === parts.length ? "blob" : "tree") || old.mode === "120000")) fail(`仓库存在大小写、链接或文件/目录冲突：${part}`);
      }
      const old = current.get(key(path));
      if (old?.mode === file.mode && old.sha === await blobHash(file.bytes)) continue;
      changes.push({ ...file, path });
    }
    if (!changes.length) { progress(100, "源码与仓库一致，将直接启动编译。"); return { sha: original, directory: target, changed: false }; }
    const binaries = changes.filter(file => file.text === null || file.bytes.length > 2 * MB);
    if (binaries.length > 150) fail("本次需要上传的二进制/大文件超过 150 个，可能触发 GitHub 限流。请使用 Git 客户端上传。");
    const post = (path, body) => api(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let baseTree = commit.tree.sha, batch = [], size = 0, done = 0;
    const pace = () => new Promise(resolve => setTimeout(resolve, 1100));
    async function flush() { if (batch.length) { baseTree = (await post("/git/trees", { base_tree: baseTree, tree: batch })).sha; batch = []; size = 0; await pace(); } }
    for (const file of changes) {
      const entry = { path: file.path, mode: file.mode, type: "blob" };
      if (file.text === null || file.bytes.length > 2 * MB) {
        entry.sha = (await post("/git/blobs", { content: base64(file.bytes), encoding: "base64" })).sha;
        await pace();
      } else entry.content = file.text;
      const bytes = encoder.encode(JSON.stringify(entry)).length;
      if (size + bytes > 3 * MB) await flush();
      batch.push(entry); size += bytes;
      progress(Math.round(++done / changes.length * 85), `准备文件 ${done} / ${changes.length}；完成后统一提交，不会留下半个工程。`);
    }
    await flush();
    progress(90, "文件已准备，正在安全提交源码…");
    const created = await post("/git/commits", { message: `Upload ${name} from iOSForge [skip ci]`, tree: baseTree, parents: [original] });
    if ((await api(refPath)).object.sha !== original) fail("上传期间分支有新提交，已停止更新以保护他人的修改。请重新上传；本次尚未改动分支。");
    try {
      await api(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sha: created.sha, force: false }) });
    } catch (error) {
      let head;
      try { head = (await api(refPath)).object.sha; } catch { fail(`提交结果暂时无法确认，请先检查 GitHub 提交记录，勿重复上传。提交编号：${created.sha}`); }
      if (head !== created.sha) throw error;
    }
    progress(100, "源码已提交，正在启动编译。");
    return { sha: created.sha, directory: target, changed: true };
  }
  async function repositorySnapshot({ api, base, branch }) {
    const refPath = `${base}/git/ref/heads/${encodeURIComponent(branch)}`;
    const head = (await api(refPath)).object?.sha;
    if (!/^[0-9a-f]{40}$/i.test(head || "")) fail("无法读取分支最新版本，请刷新后重试。");
    const commit = await api(`${base}/git/commits/${head}`);
    if (!/^[0-9a-f]{40}$/i.test(commit.tree?.sha || "")) fail("无法读取仓库文件树，请刷新后重试。");
    const root = await api(`${base}/git/trees/${commit.tree.sha}`);
    return { refPath, head, commit, root };
  }
  async function listProjects({ api, base, branch }) {
    const snapshot = await repositorySnapshot({ api, base, branch });
    const sources = snapshot.root.tree?.find(item => item.path === "sources" && item.type === "tree" && item.mode === "040000");
    if (!sources) return { head: snapshot.head, projects: [] };
    const tree = await api(`${base}/git/trees/${sources.sha}`);
    const projects = (tree.tree || [])
      .filter(item => item.type === "tree" && item.mode === "040000" && !/^download$/i.test(item.path) && /^[\p{L}\p{N}][\p{L}\p{N}._-]{0,63}$/u.test(item.path) && !/[.]$/.test(item.path))
      .map(item => ({ name: item.path, path: `sources/${item.path}`, sha: item.sha }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    return { head: snapshot.head, projects };
  }
  async function removeProject({ api, base, branch, project, expectedSha }) {
    const target = destination(project);
    const snapshot = await repositorySnapshot({ api, base, branch });
    const sources = snapshot.root.tree?.find(item => item.path === "sources" && item.type === "tree" && item.mode === "040000");
    if (!sources) fail(`项目 ${target} 已不存在，请刷新项目列表。`);
    const tree = await api(`${base}/git/trees/${sources.sha}`);
    const current = tree.tree?.find(item => item.path === project && item.type === "tree" && item.mode === "040000");
    if (!current) fail(`项目 ${target} 已不存在，请刷新项目列表。`);
    if (!/^[0-9a-f]{40}$/i.test(expectedSha || "") || current.sha !== expectedSha) fail(`项目 ${target} 在读取后发生了变化。为避免误删，请刷新项目列表后重新确认。`);
    const deletions = [{ path: target, mode: "040000", type: "tree", sha: null }];
    const downloadOutputs = tree.tree?.find(item => item.path === "Download" && item.type === "tree" && item.mode === "040000");
    if (downloadOutputs) deletions.push({ path: "sources/Download", mode: "040000", type: "tree", sha: null });
    const createdTree = await api(`${base}/git/trees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_tree: snapshot.commit.tree.sha, tree: deletions }),
    });
    const created = await api(`${base}/git/commits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Delete ${target} from iOSForge`, tree: createdTree.sha, parents: [snapshot.head] }),
    });
    if ((await api(snapshot.refPath)).object?.sha !== snapshot.head) fail("删除期间分支出现了新提交，已停止更新以保护最新修改。请刷新后重试。");
    try {
      await api(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha: created.sha, force: false }),
      });
    } catch (error) {
      let head;
      try { head = (await api(snapshot.refPath)).object?.sha; } catch { fail(`删除结果暂时无法确认，请先检查 GitHub 提交记录，不要重复操作。提交编号：${created.sha}`); }
      if (head !== created.sha) throw error;
    }
    return { sha: created.sha, path: target, outputPath: deletions.length > 1 ? "sources/Download" : "", outputsRemoved: deletions.length > 1 };
  }
  globalThis.IOSForgeUpload = Object.freeze({ limits, readZip, readFolder, prepare, destination, publish, listProjects, removeProject, crc32 });
})();
