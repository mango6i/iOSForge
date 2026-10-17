/* Local-only inspection; GitHub is the only upload destination. */
(() => {
  "use strict";
  const MB = 1024 * 1024;
  const limits = Object.freeze({ archive: 500 * MB, total: 2 * 1024 * MB, file: 100 * MB, count: 10000 });
  const limitMessage = "超过限制：ZIP 500 MB、解压后/文件夹 2 GB、单文件 100 MB、10000 个文件。单文件更大请使用 Git LFS 等专用方式。";
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
    if (file.bytes.length > limits.file) fail(`单个文件超过 100 MB（GitHub 普通仓库文件上限）：${file.path}`);
    const name = file.path.split("/").pop();
    if (/\.(p12|pfx|pem|p8|key|mobileprovision)$/i.test(name) || /^(\.env($|\.)|\.npmrc$|\.netrc$|id_rsa$|id_ed25519$|credentials($|\.))/i.test(name) && !/\.(example|sample|template)$/i.test(name)) fail(`疑似凭据文件，已阻止上传：${file.path}。请移除密钥，使用仓库 Secrets。`);
    file.text = textOf(file.bytes);
    if (file.text && (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(file.text) || /\b(gh[pousr]_[a-zA-Z0-9]{30,}|github_pat_[a-zA-Z0-9_]{50,})\b/.test(file.text))) fail(`文件疑似包含私钥或 GitHub Token：${file.path}`);
    if (file.text?.startsWith("version https://git-lfs.github.com/spec/v1")) fail(`发现 Git LFS 指针而非真实内容：${file.path}。请使用 Git 客户端上传完整工程。`);
    if (file.mode !== "100755") file.mode = file.text?.startsWith("#!") || /\.(sh|command)$/.test(name) ? "100755" : "100644";
    return file;
  }
  const fileSize = file => file.size ?? file.bytes.length;
  function normalize(entries, suggestedName) {
    let files = entries.filter(file => !ignored(validPath(file.path)));
    if (!files.length) fail("没有找到可上传的文件。");
    if (files.length > limits.count || files.some(file => fileSize(file) > limits.file) || files.reduce((n, file) => n + fileSize(file), 0) > limits.total) fail(limitMessage);
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
    });
    files.forEach(file => {
      const parts = file.path.split("/");
      while (parts.pop(), parts.length) if (paths.has(key(parts.join("/")))) fail(`文件与目录重名：${file.path}`);
    });
    return { files: files.sort((a, b) => a.path.localeCompare(b.path)), suggestedName: (suggestedName || "MyProject").replace(/[^\p{L}\p{N}._-]/gu, "-").replace(/^[._-]+/, "").slice(0, 64) || "MyProject" };
  }
  function prepare(entries, suggestedName) {
    const source = normalize(entries, suggestedName);
    source.files.forEach(inspect);
    return source;
  }
  async function inspectSource(entries, suggestedName, progress) {
    const source = normalize(entries, suggestedName);
    for (const [i, file] of source.files.entries()) {
      progress(i + 1, source.files.length, file.path);
      // Keep only immutable File/ZIP references and metadata, never the complete
      // expanded archive. At most one source file is inspected at a time.
      const checked = inspect({ path: file.path, mode: file.mode, bytes: await file.read() });
      if (checked.bytes.length !== file.size) fail(`文件大小发生变化，请重新选择：${file.path}`);
      file.mode = checked.mode;
      file.sha = await blobHash(checked.bytes);
      file.useBlob = checked.text === null || file.size > 2 * MB;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return source;
  }
  // Read project metadata only. Never execute uploaded scripts or guess the first
  // bundle identifier (which may belong to a test target or an extension).
  function openStep(text) {
    let at = 0, count = 0;
    const next = () => {
      for (;;) {
        while (/\s/.test(text[at] || "") && at < text.length) at++;
        if (text.startsWith("/*", at)) { const end = text.indexOf("*/", at + 2); if (end < 0) throw Error(); at = end + 2; }
        else if (text.startsWith("//", at)) { const end = text.indexOf("\n", at); at = end < 0 ? text.length : end + 1; }
        else break;
      }
      if (++count > 250000 || at >= text.length) throw Error();
      const ch = text[at++];
      if ('{}()=;,'.includes(ch)) return { kind: ch };
      if (ch === '"') {
        let value = "", closed = false;
        while (at < text.length) {
          let ch = text[at++];
          if (ch === '"') { closed = true; break; }
          if (ch === "\\") { ch = text[at++]; ch = ({ n: "\n", r: "\r", t: "\t" })[ch] ?? ch; }
          value += ch;
        }
        if (!closed) throw Error();
        return { value };
      }
      let value = ch;
      while (at < text.length && !/[\s{}()=;,"]/.test(text[at]) && !text.startsWith("/*", at) && !text.startsWith("//", at)) value += text[at++];
      return { value };
    };
    let token = next();
    const take = kind => { if (token.kind !== kind) throw Error(); token = next(); };
    const value = (depth = 0) => {
      if (depth > 64) throw Error();
      if (token.kind === "{") {
        const result = Object.create(null); take("{");
        while (token.kind !== "}") { const key = token.value; if (key === undefined) throw Error(); token = next(); take("="); result[key] = value(depth + 1); take(";"); }
        // The root closing brace may be the last token in an ASCII plist.
        if (depth) take("}");
        return result;
      }
      if (token.kind === "(") {
        const result = []; take("(");
        while (token.kind !== ")") { result.push(value(depth + 1)); if (token.kind !== ")") take(","); }
        take(")"); return result;
      }
      if (token.value === undefined) throw Error();
      const result = token.value; token = next(); return result;
    };
    return value();
  }
  async function identifyXcode(files, { project = "", scheme = "" } = {}) {
    const result = { project: "", scheme: "", bundleId: "", projectHint: "未找到 Xcode 工程", schemeHint: "未识别到唯一 Scheme", bundleIdHint: "包名需由 Xcode 解析" };
    const ignored = new Set([".git", ".github", ".theos", ".build", ".swiftpm", "Pods", "Carthage", "node_modules", "vendor", "build", "dist", "packages", "DerivedData", "__pycache__", "examples", "tests"]);
    const containers = new Set();
    for (const file of files) {
      const parts = file.path.split("/");
      for (let i = 0; i < parts.length - 1; i++) {
        if (ignored.has(parts[i]) || parts[i].startsWith(".")) break;
        if (/\.(xcodeproj|xcworkspace)$/.test(parts[i])) { containers.add(parts.slice(0, i + 1).join("/")); break; }
      }
    }
    const parent = path => path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
    const workspaces = [...containers].filter(path => path.endsWith(".xcworkspace"));
    const candidates = [...containers].filter(path => path.endsWith(".xcworkspace") || !workspaces.some(workspace => parent(workspace) === parent(path))).sort();
    if (project && containers.has(project)) result.project = project;
    else if (!project && candidates.length === 1) result.project = candidates[0];
    else { if (candidates.length > 1) result.projectHint = "检测到多个工程，请指定"; return result; }
    result.projectHint = result.project;
    const cache = new Map();
    const read = async path => {
      if (!cache.has(path)) {
        const file = files.find(file => file.path === path);
        let text = "";
        if (file && fileSize(file) <= 8 * MB) { try { text = textOf(file.read ? await file.read() : file.bytes) || ""; } catch { /* Metadata preview cannot block source selection. */ } }
        cache.set(path, text);
      }
      return cache.get(path);
    };
    const xml = text => text.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    const attr = (text, name) => xml(text.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`))?.[2] || "");
    const scopes = [result.project];
    if (result.project.endsWith(".xcworkspace")) scopes.push(...[...containers].filter(path => path.endsWith(".xcodeproj") && parent(path) === parent(result.project)));
    const schemes = [];
    for (const file of files) {
      const container = scopes.find(path => { const prefix = path + "/xcshareddata/xcschemes/"; return file.path.startsWith(prefix) && /^[^/]+\.xcscheme$/.test(file.path.slice(prefix.length)); });
      if (!container) continue;
      const text = await read(file.path), refs = [];
      for (const match of text.matchAll(/<BuildActionEntry\b([^>]*)>([\s\S]*?)<\/BuildActionEntry>/g)) {
        const ref = match[2].match(/<BuildableReference\b([^>]*)\/?\s*>/);
        if (attr(match[1], "buildForArchiving") === "YES" && ref && attr(ref[1], "BuildableName").endsWith(".app")) refs.push({ id: attr(ref[1], "BlueprintIdentifier"), container: attr(ref[1], "ReferencedContainer").replace(/^container:/, "") });
      }
      if (refs.length) schemes.push({ name: file.path.split("/").pop().slice(0, -9), refs, container });
    }
    const names = [...new Set(schemes.map(item => item.name))];
    const selected = schemes.filter(item => item.name === (scheme || (names.length === 1 ? names[0] : "")));
    if (selected.length) result.scheme = selected[0].name;
    if (!scheme && names.length > 1) { result.schemeHint = "检测到多个 Scheme，请指定"; return result; }
    const projects = scopes.filter(path => path.endsWith(".xcodeproj"));
    const apps = [];
    for (const path of projects) {
      let plist; try { plist = openStep(await read(path + "/project.pbxproj")); } catch { continue; }
      const objects = plist?.objects || {}, root = objects[plist.rootObject];
      for (const id of root?.targets || []) {
        const target = objects[id];
        if (target?.isa !== "PBXNativeTarget" || target.productType !== "com.apple.product-type.application") continue;
        if (selected.length && !selected.some(item => item.refs.some(ref => ref.id === id && (!ref.container || parent(path) + ref.container === path)))) continue;
        if (!selected.length && scheme && target.name !== scheme) continue;
        apps.push({ path, target, objects, root });
      }
    }
    if (apps.length !== 1) return result;
    const { path, target, objects, root } = apps[0];
    if (!result.scheme && !names.length && !scheme && (root.targets || []).filter(id => objects[id]?.isa === "PBXNativeTarget").length === 1) result.scheme = target.name || "";
    if (result.scheme) result.schemeHint = result.scheme;
    const settings = object => {
      const list = objects[object?.buildConfigurationList];
      const configurations = (list?.buildConfigurations || []).map(id => objects[id]).filter(Boolean);
      const selected = configurations.find(item => item.name === "Release") || (configurations.length === 1 ? configurations[0] : null);
      return selected?.buildSettings || {};
    };
    const values = { TARGET_NAME: target.name, ...settings(root), ...settings(target) };
    values.PRODUCT_NAME ??= target.name;
    const resolve = value => {
      if (typeof value !== "string") return "";
      for (let i = 0; i < 12 && /\$[({]/.test(value); i++) value = value.replace(/\$\(([^)]+)\)|\$\{([^}]+)\}/g, (full, a, b) => typeof values[a || b] === "string" ? values[a || b] : full);
      return value;
    };
    let bundle = resolve(values.PRODUCT_BUNDLE_IDENTIFIER);
    if (!bundle && values.INFOPLIST_FILE) {
      const info = await read(parent(path) + resolve(values.INFOPLIST_FILE));
      bundle = resolve(xml(info.match(/<key>\s*CFBundleIdentifier\s*<\/key>\s*<string>([^<]*)<\/string>/)?.[1] || ""));
    }
    if (bundle.length <= 255 && /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*$/.test(bundle)) result.bundleId = result.bundleIdHint = bundle;
    return result;
  }
  const crcTable = Uint32Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
  function crc32(bytes) { let crc = -1; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ -1) >>> 0; }
  async function readZip(file, progress = () => {}) {
    if (file.size > limits.archive) fail("ZIP 超过 500 MB，请精简后重试，或使用 Git 客户端。");
    if (file.size < 22) fail("不是完整的 ZIP 文件，请重新压缩源码。");
    const tailStart = Math.max(0, file.size - 65557);
    const tail = new Uint8Array(await file.slice(tailStart).arrayBuffer());
    const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
    let end = -1;
    for (let n = tail.length - 22; n >= 0; n--) if (tailView.getUint32(n, true) === 0x06054b50 && n + 22 + tailView.getUint16(n + 20, true) === tail.length) { end = n; break; }
    if (end < 0) fail("不是完整的 ZIP 文件，请重新压缩源码。");
    const e16 = n => tailView.getUint16(end + n, true), e32 = n => tailView.getUint32(end + n, true);
    if (e16(4) || e16(6) || e16(8) !== e16(10) || e16(10) === 65535 || [e32(12), e32(16)].includes(0xffffffff)) fail("不支持分卷或 ZIP64，请使用普通 ZIP。");
    const centralStart = e32(16), centralSize = e32(12), count = e16(10);
    if (count > 40000 || centralSize > 16 * MB || centralStart + centralSize > tailStart + end) fail("ZIP 文件目录过大或损坏。");
    const bytes = new Uint8Array(await file.slice(centralStart, centralStart + centralSize).arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = n => view.getUint16(n, true), u32 = n => view.getUint32(n, true);
    let cursor = 0, total = 0;
    const centralEnd = bytes.length, records = [];
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
      if (size > limits.file || total > limits.total || records.length >= limits.count) fail(limitMessage);
      // Bound compressed allocation too, including malformed archives.
      if (packed > limits.file + MB || offset + 30 + packed > centralStart) fail("ZIP 文件内容不完整或单文件过大。");
      const header = new Uint8Array(await file.slice(offset, offset + 30).arrayBuffer());
      const h = new DataView(header.buffer, header.byteOffset, header.byteLength);
      if (header.length !== 30 || h.getUint32(0, true) !== 0x04034b50 || h.getUint16(8, true) !== method || h.getUint16(6, true) !== flags) fail("ZIP 数据头损坏。");
      const localNameSize = h.getUint16(26, true), start = offset + 30 + localNameSize + h.getUint16(28, true);
      if (start + packed > centralStart) fail("ZIP 文件内容不完整。");
      const localName = new Uint8Array(await file.slice(offset + 30, offset + 30 + localNameSize).arrayBuffer());
      if (decoder.decode(localName) !== name) fail("ZIP 数据头文件名与目录不一致。");
      const record = { path: name, method, crc, size, packed, start, mode: mode & 0o111 ? "100755" : "100644" };
      record.read = () => readZipEntry(file, record);
      records.push(record);
    }
    if (cursor !== centralEnd) fail("ZIP 目录长度不匹配。");
    return inspectSource(records, file.name.replace(/\.zip$/i, ""), progress);
  }
  async function readZipEntry(file, record) {
      const compressed = new Uint8Array(await file.slice(record.start, record.start + record.packed).arrayBuffer());
      let content;
      try {
        if (record.method === 0) content = compressed;
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
      return content;
  }
  async function readFolder(list, progress = () => {}) {
    const files = [...list].filter(file => !ignored(validPath(file.webkitRelativePath || file.name)));
    return inspectSource(files.map(file => ({ path: file.webkitRelativePath || file.name, size: file.size, read: async () => new Uint8Array(await file.arrayBuffer()) })), "MyProject", progress);
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
  const writeTimes = [];
  const preparedBlobs = new Map();
  async function paceWrites(progress) {
    for (;;) {
      const now = Date.now();
      while (writeTimes.length && writeTimes[0] <= now - 3600000) writeTimes.shift();
      const recent = writeTimes.filter(time => time > now - 60000);
      const delay = Math.max(0, (writeTimes.at(-1) || 0) + 1100 - now,
        recent.length >= 75 ? recent[0] + 60000 - now : 0,
        writeTimes.length >= 450 ? writeTimes[0] + 3600000 - now : 0);
      if (!delay) { writeTimes.push(now); return; }
      if (delay > 3000) progress(null, `GitHub 写入频率保护：约 ${Math.ceil(delay / 1000)} 秒后继续。已准备的文件不会重复提交，请保持网页打开。`);
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, 1000)));
    }
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
    const changes = [], intended = [];
    for (const file of files) {
      const path = `${target}/${validPath(file.path)}`;
      const parts = path.split("/");
      for (let n = 1; n <= parts.length; n++) {
        const part = parts.slice(0, n).join("/"), old = current.get(key(part));
        if (old && (old.path !== part || old.type !== (n === parts.length ? "blob" : "tree") || old.mode === "120000")) fail(`仓库存在大小写、链接或文件/目录冲突：${part}`);
      }
      const old = current.get(key(path));
      const sha = file.sha || await blobHash(file.bytes);
      intended.push({ path, mode: file.mode, sha });
      if (old?.mode === file.mode && old.sha === sha) continue;
      changes.push({ ...file, path });
    }
    async function latestSnapshot(head) {
      const commit = await api(`${base}/git/commits/${head}`);
      const listing = await api(`${base}/git/trees/${commit.tree.sha}?recursive=1`);
      if (listing.truncated) fail("最新仓库文件树过大，无法安全核对源码冲突；尚未更新分支。");
      const latest = new Map(listing.tree.map(item => [key(item.path), item]));
      if (!replace && listing.tree.some(item => key(item.path) === key(target) || key(item.path).startsWith(key(target) + "/"))) fail(`同名项目目录 ${target} 在上传期间已被创建。请选择其他名称，或确认后勾选更新同名文件。`);
      const same = (a, b) => !a && !b || a && b && a.path === b.path && a.type === b.type && a.mode === b.mode && a.sha === b.sha;
      for (const file of intended) {
        const parts = file.path.split("/");
        for (let n = 1; n < parts.length; n++) {
          const path = parts.slice(0, n).join("/"), item = latest.get(key(path));
          if (item && (item.path !== path || item.type !== "tree" || item.mode === "120000")) fail(`上传目标路径发生冲突：${path}。尚未覆盖任何源码，请核对该路径后重试。`);
        }
        const before = current.get(key(file.path)), now = latest.get(key(file.path));
        if (!same(before, now) && !(now?.path === file.path && now.type === "blob" && now.mode === file.mode && now.sha === file.sha)) fail(`上传期间同一个源码文件发生了变化：${file.path}。已保留仓库与本地文件，请核对差异后再上传。`);
      }
      return commit;
    }
    if (!changes.length) {
      const head = (await api(refPath)).object.sha;
      if (head !== original) await latestSnapshot(head);
      progress(100, "源码与仓库一致，将直接启动编译。");
      return { sha: head, directory: target, changed: false };
    }
    const post = async (path, body) => {
      const safeObject = path === "/git/blobs" || path === "/git/trees";
      for (let attempt = 0; ; attempt++) {
        await paceWrites((_, copy) => progress(Math.round(done / totalBytes * 85), copy));
        try {
          return await api(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        } catch (error) {
          const transient = error.network || error.name === "TypeError" || [502, 503, 504].includes(error.status);
          // Content-addressed blobs/trees can safely be prepared again. Neither
          // creates a build nor changes the branch; commits/ref/dispatch cannot
          // use this retry path.
          if (!safeObject || !transient || attempt >= 2) throw error;
          progress(Math.round(done / totalBytes * 85), `文件准备网络中断，正在重试 ${attempt + 1} / 2；尚未更新分支或启动编译。`);
          await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
        }
      }
    };
    let baseTree = commit.tree.sha, batch = [], size = 0, done = 0, index = 0;
    const preparedEntries = [];
    const totalBytes = Math.max(1, changes.reduce((n, file) => n + fileSize(file), 0));
    async function flush() { if (batch.length) { baseTree = (await post("/git/trees", { base_tree: baseTree, tree: batch })).sha; batch = []; size = 0; } }
    for (const file of changes) {
      const entry = { path: file.path, mode: file.mode, type: "blob" };
      progress(Math.round(done / totalBytes * 85), `正在读取并准备文件 ${++index} / ${changes.length}：${file.path}`);
      const content = inspect({ ...file, bytes: file.read ? await file.read() : file.bytes });
      if (file.sha && await blobHash(content.bytes) !== file.sha) fail(`文件内容发生变化，已停止提交，请重新选择：${file.path}`);
      if (content.text === null || content.bytes.length > 2 * MB) {
        const key = `${base}:${file.sha || await blobHash(content.bytes)}`;
        entry.sha = preparedBlobs.get(key);
        if (!entry.sha) {
          entry.sha = (await post("/git/blobs", { content: base64(content.bytes), encoding: "base64" })).sha;
          preparedBlobs.set(key, entry.sha);
        }
      } else entry.content = content.text;
      // Keep only object IDs for rebasing, not another copy of the source bytes.
      preparedEntries.push({ path: entry.path, mode: entry.mode, type: "blob", sha: entry.sha || file.sha || await blobHash(content.bytes) });
      const bytes = encoder.encode(JSON.stringify(entry)).length;
      if (size + bytes > 3 * MB) await flush();
      batch.push(entry); size += bytes;
      done += fileSize(file);
      progress(Math.round(done / totalBytes * 85), `准备文件 ${index} / ${changes.length}；完成后统一提交，不会留下半个工程。`);
    }
    await flush();
    progress(90, "文件已准备，正在安全提交源码…");
    let parent = original, rebases = 0;
    for (;;) {
      const head = (await api(refPath)).object.sha;
      if (head !== parent) {
        if (rebases >= 3) fail("仓库在提交时持续更新，已尝试衔接 3 次。所选文件仍保留，请稍后再点上传；本次尚未更新分支。");
        const latest = await latestSnapshot(head);
        progress(90, `仓库有无关文件更新，正在保留最新改动并继续提交源码（${++rebases} / 3）…`);
        baseTree = latest.tree.sha; batch = []; size = 0;
        for (const entry of preparedEntries) {
          const bytes = encoder.encode(JSON.stringify(entry)).length;
          if (size + bytes > 3 * MB) await flush();
          batch.push(entry); size += bytes;
        }
        await flush();
        parent = head;
      }
      const created = await post("/git/commits", { message: `Upload ${name} from iOSForge [skip ci]`, tree: baseTree, parents: [parent] });
      try {
        await api(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sha: created.sha, force: false }) });
      } catch (error) {
        let latest;
        const uncertain = () => fail(`提交结果暂时无法确认，请先检查 GitHub 提交记录，勿重复上传。提交编号：${created.sha}`);
        try { latest = (await api(refPath)).object.sha; } catch { uncertain(); }
        if (latest !== created.sha) {
          // A definite fast-forward rejection means this update was not applied.
          // Recheck affected files before preparing a new parent; never force.
          if ([409, 422].includes(error.status) && latest !== parent) continue;
          if (latest === parent) throw error;
          let comparison;
          try { comparison = await api(`${base}/compare/${created.sha}...${latest}`); } catch { uncertain(); }
          if (!["ahead", "identical"].includes(comparison.status)) uncertain();
          // The response was lost, but a newer commit already contains ours.
        }
      }
      progress(100, "源码已提交，正在启动编译。");
      return { sha: created.sha, directory: target, changed: true };
    }
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
    let entries;
    try {
      entries = await api(`${base}/contents/sources?ref=${encodeURIComponent(branch)}`);
    } catch (error) {
      if (error?.status !== 404) throw error;
      const head = (await api(`${base}/git/ref/heads/${encodeURIComponent(branch)}`)).object?.sha;
      if (!/^[0-9a-f]{40}$/i.test(head || "")) fail("无法读取分支最新版本，请刷新后重试。");
      return { head, projects: [] };
    }
    if (!Array.isArray(entries)) fail("sources 不是可读取的项目目录，请检查仓库结构。");
    const projects = entries
      .filter(item => item.type === "dir" && item.path === `sources/${item.name}` && /^[0-9a-f]{40}$/i.test(item.sha || "") && !/^download$/i.test(item.name) && /^[\p{L}\p{N}][\p{L}\p{N}._-]{0,63}$/u.test(item.name) && !/[.]$/.test(item.name))
      .map(item => ({ name: item.name, path: item.path, sha: item.sha }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    return { head: null, projects };
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
  globalThis.IOSForgeUpload = Object.freeze({ limits, readZip, readFolder, prepare, identifyXcode, destination, publish, listProjects, removeProject, crc32 });
})();
