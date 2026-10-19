/* Local-only inspection; GitHub is the only upload destination. */
(() => {
  "use strict";
  const MB = 1024 * 1024;
  const limits = Object.freeze({ archive: 1024 * MB, total: 2 * 1024 * MB, file: 500 * MB, count: 100000 });
  const gitFileLimit = 100 * MB, partSize = 50 * MB;
  const partsDirectory = ".iosforge-parts", partsManifest = ".iosforge-large-files.json";
  const binaryPrefix = "iOSForge binary transport v1\n";
  const limitMessage = "超过限制：ZIP 1 GB、解压后/文件夹 2 GB、单文件 500 MB、100000 个文件。单文件更大请使用 Git LFS 等专用方式。";
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
    if (file.bytes.length > limits.file) fail(`单个文件超过 500 MB：${file.path}`);
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
      if ([partsDirectory, partsManifest].includes(key(file.path.split("/")[0]))) fail(`路径是大文件传输保留目录，不能作为源码上传：${file.path}`);
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
      if (file.size > gitFileLimit) {
        inspect({ path: file.path, bytes: new Uint8Array() });
        const digest = new SHA256(); let size = 0, tail = "";
        const scanner = new TextDecoder("utf-8");
        for await (const chunk of chunksOf(file)) {
          if (!size) file.mode = inspect({ path: file.path, mode: file.mode, bytes: chunk.subarray(0, 4096) }).mode;
          // Overlap catches credentials split across stream boundaries without
          // retaining a 500 MB text string or another copy of its bytes.
          const text = tail + scanner.decode(chunk, { stream: true });
          inspect({ path: file.path, mode: file.mode, bytes: encoder.encode(text) });
          tail = text.slice(-1024); digest.update(chunk); size += chunk.length;
          if (size > file.size) fail(`文件大小发生变化：${file.path}`);
          progress(i + 1, source.files.length, `${file.path}（大文件已检查 ${Math.floor(size / MB)} / ${Math.ceil(file.size / MB)} MB）`);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (size !== file.size) fail(`文件大小发生变化：${file.path}`);
        file.sha256 = digest.hex(); file.useBlob = true;
      } else {
        const checked = inspect({ path: file.path, mode: file.mode, bytes: await file.read() });
        if (checked.bytes.length !== file.size) fail(`文件大小发生变化，请重新选择：${file.path}`);
        file.mode = checked.mode;
        file.sha = checked.bytes.length ? await blobHash(checked.bytes) : "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
        file.useBlob = checked.text === null || file.size > 2 * MB;
      }
      // A timer per tiny file adds minutes of browser timer clamping at 100k.
      if (i % 64 === 0) await new Promise(resolve => setTimeout(resolve, 0));
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
  function crcUpdate(crc, bytes) { for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return crc; }
  function crc32(bytes) { return (crcUpdate(-1, bytes) ^ -1) >>> 0; }
  const shaConstants = Uint32Array.from([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  const rotateRight = (v, n) => (v >>> n) | (v << (32 - n));
  class SHA256 {
    constructor() { this.state = Uint32Array.from([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]); this.buffer = new Uint8Array(64); this.words = new Uint32Array(64); this.used = 0; this.length = 0; }
    block(bytes, offset) {
      const w = this.words, r = rotateRight;
      for (let i = 0; i < 16; i++) { const n = offset + i * 4; w[i] = (bytes[n] << 24) | (bytes[n+1] << 16) | (bytes[n+2] << 8) | bytes[n+3]; }
      for (let i = 16; i < 64; i++) { const a = w[i-15], b = w[i-2]; w[i] = (w[i-16] + (r(a,7)^r(a,18)^(a>>>3)) + w[i-7] + (r(b,17)^r(b,19)^(b>>>10))) >>> 0; }
      const s=this.state;let a=s[0],b=s[1],c=s[2],d=s[3],e=s[4],f=s[5],g=s[6],h=s[7];
      for (let i = 0; i < 64; i++) { const x = (h + (r(e,6)^r(e,11)^r(e,25)) + ((e&f)^(~e&g)) + shaConstants[i] + w[i]) >>> 0, y = ((r(a,2)^r(a,13)^r(a,22)) + ((a&b)^(a&c)^(b&c))) >>> 0; h=g;g=f;f=e;e=(d+x)>>>0;d=c;c=b;b=a;a=(x+y)>>>0; }
      s[0]=(s[0]+a)>>>0;s[1]=(s[1]+b)>>>0;s[2]=(s[2]+c)>>>0;s[3]=(s[3]+d)>>>0;s[4]=(s[4]+e)>>>0;s[5]=(s[5]+f)>>>0;s[6]=(s[6]+g)>>>0;s[7]=(s[7]+h)>>>0;
    }
    update(bytes) {
      this.length += bytes.length; let at = 0;
      if (this.used) { const n = Math.min(64-this.used, bytes.length); this.buffer.set(bytes.subarray(0,n),this.used); this.used += n; at += n; if (this.used === 64) { this.block(this.buffer,0); this.used=0; } }
      while (at + 64 <= bytes.length) { this.block(bytes,at); at+=64; }
      if (at < bytes.length) { this.buffer.set(bytes.subarray(at)); this.used = bytes.length-at; }
      return this;
    }
    hex() { const bits = this.length * 8, tail = new Uint8Array(this.used < 56 ? 64 : 128); tail.set(this.buffer.subarray(0,this.used)); tail[this.used]=128; const v=new DataView(tail.buffer); v.setUint32(tail.length-8,Math.floor(bits/4294967296));v.setUint32(tail.length-4,bits>>>0);for(let i=0;i<tail.length;i+=64)this.block(tail,i);return [...this.state].map(n=>n.toString(16).padStart(8,"0")).join(""); }
  }
  async function* chunksOf(file) {
    if (file.chunks) { yield* file.chunks(); return; }
    const bytes = file.bytes || await file.read();
    for (let at = 0; at < bytes.length; at += 4 * MB) yield bytes.subarray(at, at + 4 * MB);
  }
  async function readZip(file, progress = () => {}) {
    if (file.size > limits.archive) fail("ZIP 超过 1 GB，请精简后重试，或使用 Git 客户端。");
    if (file.size < 22) fail("不是完整的 ZIP 文件，请重新压缩源码。");
    const tailStart = Math.max(0, file.size - 65557);
    const tail = new Uint8Array(await file.slice(tailStart).arrayBuffer());
    const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
    let end = -1;
    for (let n = tail.length - 22; n >= 0; n--) if (tailView.getUint32(n, true) === 0x06054b50 && n + 22 + tailView.getUint16(n + 20, true) === tail.length) { end = n; break; }
    if (end < 0) fail("不是完整的 ZIP 文件，请重新压缩源码。");
    const e16 = n => tailView.getUint16(end + n, true), e32 = n => tailView.getUint32(end + n, true);
    if (e16(4) || e16(6) || e16(8) !== e16(10)) fail("不支持分卷 ZIP。");
    let centralStart = e32(16), centralSize = e32(12), count = e16(10), centralBoundary = tailStart + end;
    const u64 = (view, offset) => { const value = view.getUint32(offset, true) + view.getUint32(offset + 4, true) * 4294967296; if (!Number.isSafeInteger(value)) fail("ZIP64 数值超出安全范围。"); return value; };
    if (count === 65535 || [centralSize, centralStart].includes(0xffffffff)) {
      const locatorAt = tailStart + end - 20;
      if (locatorAt < 0) fail("ZIP64 定位记录不完整。");
      const locator = new DataView(await file.slice(locatorAt, locatorAt + 20).arrayBuffer());
      if (locator.byteLength !== 20 || locator.getUint32(0,true) !== 0x07064b50 || locator.getUint32(4,true) || locator.getUint32(16,true) !== 1) fail("ZIP64 分卷或定位记录无效。");
      const at = u64(locator,8);
      if (at + 56 > locatorAt) fail("ZIP64 记录越界。");
      const record = new DataView(await file.slice(at, at + 56).arrayBuffer());
      if (record.byteLength !== 56 || record.getUint32(0,true) !== 0x06064b50 || u64(record,4) < 44 || at + 12 + u64(record,4) !== locatorAt || record.getUint32(16,true) || record.getUint32(20,true) || u64(record,24) !== u64(record,32)) fail("ZIP64 记录损坏或不支持分卷。");
      const actual = [u64(record,32), u64(record,40), u64(record,48)];
      if ([count,centralSize,centralStart].some((n,i) => n !== (i ? 0xffffffff : 65535) && n !== actual[i])) fail("ZIP64 目录声明不一致。");
      [count,centralSize,centralStart] = actual; centralBoundary = at;
    }
    if (count > limits.count * 2 + 1024 || centralSize > 64 * MB || centralStart + centralSize > centralBoundary) fail("ZIP 文件目录过大或损坏。");
    const bytes = new Uint8Array(await file.slice(centralStart, centralStart + centralSize).arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = n => view.getUint16(n, true), u32 = n => view.getUint32(n, true);
    let cursor = 0, total = 0;
    const centralEnd = bytes.length, records = [];
    for (let i = 0; i < count; i++) {
      if (cursor + 46 > centralEnd || u32(cursor) !== 0x02014b50) fail("ZIP 文件目录损坏。");
      const flags = u16(cursor + 8), method = u16(cursor + 10), crc = u32(cursor + 16);
      let size = u32(cursor + 24), packed = u32(cursor + 20), offset = u32(cursor + 42), disk = u16(cursor + 34);
      const nameSize = u16(cursor + 28), extra = u16(cursor + 30), comment = u16(cursor + 32), mode = u32(cursor + 38) >>> 16;
      const next = cursor + 46 + nameSize + extra + comment;
      if (next > centralEnd || flags & 1 || ![0, 8].includes(method)) fail("ZIP 已加密、损坏或格式不受支持。");
      if ([size,packed,offset].includes(0xffffffff) || disk === 65535) {
        let found = false;
        for (let at = cursor + 46 + nameSize; at + 4 <= cursor + 46 + nameSize + extra;) {
          const tag=u16(at), length=u16(at+2), finish=at+4+length; if (finish>cursor+46+nameSize+extra) fail("ZIP64 附加字段越界。");
          if (tag === 1) { let p=at+4; const next64=()=>{ if(p+8>finish)fail("ZIP64 附加字段不完整。");const n=u64(view,p);p+=8;return n; }; if(size===0xffffffff)size=next64();if(packed===0xffffffff)packed=next64();if(offset===0xffffffff)offset=next64();if(disk===65535){if(p+4>finish)fail("ZIP64 分卷字段不完整。");disk=u32(p);} found=true;break; } at=finish;
        }
        if (!found) fail("ZIP64 缺少附加字段。");
      }
      if (disk) fail("不支持分卷 ZIP。");
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
      record.chunks = () => zipChunks(file, record);
      records.push(record);
    }
    if (cursor !== centralEnd) fail("ZIP 目录长度不匹配。");
    return inspectSource(records, file.name.replace(/\.zip$/i, ""), progress);
  }
  async function readZipEntry(file, record) {
      if (record.size > gitFileLimit) fail("大文件必须使用流式分块读取。");
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
  async function* zipChunks(file, record) {
    let size = 0, crc = -1;
    const accept = chunk => { size += chunk.length; if (size > record.size) fail(`ZIP 实际大小超出声明：${record.path}`); crc=crcUpdate(crc,chunk);return chunk; };
    if (record.method === 0) {
      for (let at=0;at<record.packed;at+=4*MB) yield accept(new Uint8Array(await file.slice(record.start+at,record.start+Math.min(at+4*MB,record.packed)).arrayBuffer()));
    } else {
      const queue=[], stream = new globalThis.fflate.Inflate(chunk => { if(chunk.length) queue.push(accept(chunk)); });
      for(let at=0;at<record.packed;at+=128*1024){
        const compressed=new Uint8Array(await file.slice(record.start+at,record.start+Math.min(at+128*1024,record.packed)).arrayBuffer());
        for(let n=0;n<compressed.length;n+=1024){stream.push(compressed.subarray(n,n+1024),at+n+1024>=record.packed);while(queue.length)yield queue.shift();}
      }
    }
    if(size!==record.size || ((crc^-1)>>>0)!==record.crc)fail(`ZIP 内容校验失败：${record.path}`);
  }
  async function readFolder(list, progress = () => {}) {
    const files = [...list].filter(file => !ignored(validPath(file.webkitRelativePath || file.name)));
    return inspectSource(files.map(file => ({ path: file.webkitRelativePath || file.name, size: file.size, read: async () => new Uint8Array(await file.arrayBuffer()), chunks: async function* () { for(let at=0;at<file.size;at+=4*MB)yield new Uint8Array(await file.slice(at,Math.min(at+4*MB,file.size)).arrayBuffer()); } })), "MyProject", progress);
  }
  function destination(name) {
    if (!/^[\p{L}\p{N}][\p{L}\p{N}._-]{0,63}$/u.test(name) || /[.]$/.test(name)) fail("项目名称请用字母、汉字或数字开头，后接字母、数字、点、短横线或下划线，最多 64 字。");
    if (/^download$/i.test(name)) fail("Download 是构建成品专用目录，请换一个项目名称。");
    return `sources/${name}`;
  }
  function base64(bytes) { let raw = ""; for (let i = 0; i < bytes.length; i += 8192) raw += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(raw); }
  async function blobHash(bytes) {
    if (!bytes.length) return "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
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
  async function uploadTree(api, base, treeSha, target) {
    const all = await api(`${base}/git/trees/${treeSha}?recursive=1`);
    if (!all.truncated) return all;
    // GitHub truncates recursive responses at 100k entries / 7 MB. Read only
    // the selected project, splitting truncated subtrees instead of trusting a
    // partial response or spending one request per source file.
    const result = [], seen = new Set();
    const add = item => { if(result.length >= limits.count * 3 + 4096)fail("项目文件树过大，无法安全核对。"); const k=key(item.path);if(seen.has(k))fail(`仓库存在大小写冲突：${item.path}`);seen.add(k);result.push(item); };
    const read = async sha => { const value=await api(`${base}/git/trees/${sha}`);if(value.truncated || !Array.isArray(value.tree))fail("GitHub 未返回完整的目录，无法安全上传。");return value.tree; };
    let sha = treeSha, prefix = "";
    for (const part of target.split("/")) {
      const children = await read(sha), matches=children.filter(item=>key(item.path)===key(part));
      if(matches.length>1)fail(`仓库存在大小写冲突：${prefix}${part}`);
      if(!matches.length)return {tree:result,truncated:false};
      const item=matches[0];add({...item,path:prefix+item.path});
      if(item.path!==part || item.type!=="tree")return {tree:result,truncated:false};
      sha=item.sha;prefix+=part+"/";
    }
    const queue=[{sha,prefix}];
    for(let at=0;at<queue.length;at++){
      const folder=queue[at], subtree=await api(`${base}/git/trees/${folder.sha}?recursive=1`);
      if(!subtree.truncated){for(const item of subtree.tree)add({...item,path:folder.prefix+item.path});}
      else for(const item of await read(folder.sha)){add({...item,path:folder.prefix+item.path});if(item.type==="tree")queue.push({sha:item.sha,prefix:folder.prefix+item.path+"/"});}
    }
    return {tree:result,truncated:false};
  }
  function largeManifest(value) {
    if(value?.version!==1 || !Array.isArray(value.files) || value.files.length>limits.count)fail("大文件清单无效，已停止更新。");
    const names=new Set(), records=new Map();let total=0;
    for(const file of value.files){
      if(typeof file.path!=="string")fail("大文件路径无效。");validPath(file.path);
      if([partsDirectory,partsManifest,".git"].includes(key(file.path.split("/")[0])) || names.has(key(file.path)) || !["100644","100755"].includes(file.mode) || !Number.isSafeInteger(file.size) || file.size<=gitFileLimit || file.size>limits.file || !/^[0-9a-f]{64}$/.test(file.sha256) || !Array.isArray(file.parts) || file.parts.length!==Math.ceil(file.size/partSize))fail("大文件清单内容无效。");
      names.add(key(file.path));total+=file.size;let bytes=0;
      for(const [index,part] of file.parts.entries()){
        if(part.path!==`${partsDirectory}/${file.sha256}/part-${String(index).padStart(4,"0")}.bin` || !/^[0-9a-f]{40}$/.test(part.sha) || !/^[0-9a-f]{64}$/.test(part.sha256) || !Number.isSafeInteger(part.size) || part.size<=0 || part.size>partSize || index<file.parts.length-1 && part.size!==partSize)fail("大文件分块清单无效。");bytes+=part.size;
      }
      if(bytes!==file.size || total>limits.total)fail("大文件清单大小不一致。");records.set(file.path,file);
    }
    const binary=new Map();
    if(value.binary_files!==undefined && !Array.isArray(value.binary_files))fail("二进制传输清单无效。");
    if(records.size+(value.binary_files?.length||0)>limits.count)fail(limitMessage);
    for(const file of value.binary_files||[]){
      if(typeof file.path!=="string")fail("二进制传输路径无效。");validPath(file.path);
      if([partsDirectory,partsManifest,".git"].includes(key(file.path.split("/")[0])) || names.has(key(file.path)) || !["100644","100755"].includes(file.mode) || !Number.isSafeInteger(file.size) || file.size<0 || file.size>partSize || !/^[0-9a-f]{40}$/.test(file.sha) || !/^[0-9a-f]{40}$/.test(file.stored_sha) || !/^[0-9a-f]{64}$/.test(file.sha256))fail("二进制传输清单内容无效。");
      names.add(key(file.path));total+=file.size;if(total>limits.total)fail(limitMessage);binary.set(file.path,file);
    }
    for(const name of names){const parts=name.split("/");while(parts.pop(),parts.length)if(names.has(parts.join("/")))fail("大文件清单包含文件/目录冲突。");}
    return {large:records,binary};
  }
  async function publish({ api, base, branch, name, files, replace = false, progress = () => {} }) {
    const target = destination(name);
    if (!files.length) fail("请先选择源码。");
    const refPath = `${base}/git/ref/heads/${encodeURIComponent(branch)}`;
    const original = (await api(refPath)).object.sha;
    const commit = await api(`${base}/git/commits/${original}`);
    const listing = await uploadTree(api, base, commit.tree.sha, target);
    const current = new Map(listing.tree.map(item => [key(item.path), item]));
    const existing = listing.tree.some(item => key(item.path) === key(target) || key(item.path).startsWith(key(target) + "/"));
    if (existing && !replace) fail(`目录 ${target} 已存在。请换一个项目名称，或明确勾选允许更新同名文件。`);
    const manifestPath = `${target}/${partsManifest}`, oldManifest = current.get(key(manifestPath));
    let previousLarge = new Map(), previousBinary = new Map();
    if(oldManifest){
      if(oldManifest.path!==manifestPath || oldManifest.type!=="blob" || oldManifest.mode!=="100644")fail("大文件清单路径存在冲突。");
      const blob=await api(`${base}/git/blobs/${oldManifest.sha}`);
      if(blob.encoding!=="base64" || Number(blob.size)>64*MB)fail("大文件清单格式或大小无效。");
      try { const raw=Uint8Array.from(atob(blob.content.replace(/\s/g,"")),c=>c.charCodeAt(0));const parsed=largeManifest(JSON.parse(decoder.decode(raw)));previousLarge=parsed.large;previousBinary=parsed.binary; } catch(error){fail(`无法读取大文件清单：${error.message}`);}
    }
    const nextLarge = new Map(previousLarge), nextBinary = new Map(previousBinary), changes = [], intended = [];
    const packBinary = files.length >= 2000;
    let manifestChanged = false;
    if(oldManifest)intended.push({path:manifestPath,mode:"100644",sha:oldManifest.sha});
    for (const file of files) {
      const path = `${target}/${validPath(file.path)}`;
      const parts = path.split("/");
      for (let n = 1; n <= parts.length; n++) {
        const part = parts.slice(0, n).join("/"), old = current.get(key(part));
        if (old && (old.path !== part || old.type !== (n === parts.length ? "blob" : "tree") || old.mode === "120000")) fail(`仓库存在大小写、链接或文件/目录冲突：${part}`);
      }
      const old = current.get(key(path));
      const relative = file.path, large = fileSize(file)>gitFileLimit;
      for(const previous of previousLarge.values())if(key(previous.path)!==key(relative) && (key(previous.path).startsWith(key(relative)+"/") || key(relative).startsWith(key(previous.path)+"/")) || key(previous.path)===key(relative) && previous.path!==relative)fail(`大文件与上传路径冲突：${relative}`);
      const previous = previousLarge.get(relative);
      const oldBinary = previousBinary.get(relative);
      if(large && !/^[0-9a-f]{64}$/.test(file.sha256 || ""))fail(`大文件尚未完成流式检查，请重新选择：${relative}`);
      const sha = large ? null : file.sha || await blobHash(file.bytes);
      intended.push({ path, mode: file.mode, sha });
      if(!large && oldBinary?.sha===sha && oldBinary.mode===file.mode && oldBinary.size===fileSize(file) && old?.path===path && old.mode===file.mode && old.sha===oldBinary.stored_sha)continue;
      if(large && previous?.sha256===file.sha256 && previous.mode===file.mode && previous.size===fileSize(file)){
        for(const part of previous.parts){const item=current.get(key(`${target}/${part.path}`));if(item?.path!==`${target}/${part.path}` || item.type!=="blob" || item.mode!=="100644" || item.sha!==part.sha)fail(`仓库分块已被改动或缺失：${part.path}`);intended.push({path:item.path,mode:item.mode,sha:item.sha});}continue;
      }
      if(!large && !previous && !oldBinary && old?.mode === file.mode && old.sha === sha) continue;
      if(previous){nextLarge.delete(relative);manifestChanged=true;}
      if(oldBinary){nextBinary.delete(relative);manifestChanged=true;}
      changes.push({ ...file, sha: large ? file.sha : sha, path, relative, large });
    }
    async function latestSnapshot(head) {
      const commit = await api(`${base}/git/commits/${head}`);
      const listing = await uploadTree(api, base, commit.tree.sha, target);
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
    const preparedEntries = [], stagedPaths = new Map();
    const totalBytes = Math.max(1, changes.reduce((n, file) => n + fileSize(file), 0));
    async function flush() { if (batch.length) { baseTree = (await post("/git/trees", { base_tree: baseTree, tree: batch })).sha; batch = []; size = 0; } }
    async function stage(entry, digest) {
      const prepared={...entry,content:undefined,sha:entry.sha === null ? null : entry.sha || digest};
      const previous=stagedPaths.get(entry.path);
      if(previous){if(previous.sha!==prepared.sha || previous.mode!==prepared.mode)fail(`提交包含重复且不一致的路径：${entry.path}`);return;}
      const parts=entry.path.split("/");
      for(let n=1;n<=parts.length;n++){const path=parts.slice(0,n).join("/"),old=current.get(key(path));if(old && (old.path!==path || old.type!==(n===parts.length?"blob":"tree") || old.mode==="120000"))fail(`上传分块路径存在冲突：${path}`);}
      if(entry.path.startsWith(`${target}/${partsDirectory}/`) && entry.sha!==null){const old=current.get(key(entry.path));if(old && old.sha!==entry.sha)fail(`同名分块的内容不一致，已停止覆盖：${entry.path}`);}
      stagedPaths.set(entry.path,prepared);preparedEntries.push(prepared);
      const bytes=encoder.encode(JSON.stringify(entry)).length+1;if(size+bytes>3*MB-1024)await flush();batch.push(entry);size+=bytes;
    }
    for (const file of changes) {
      const entry = { path: file.path, mode: file.mode, type: "blob" };
      progress(Math.round(done / totalBytes * 85), `正在读取并准备文件 ${++index} / ${changes.length}：${file.path}`);
      if(file.large){
        const record={path:file.relative,mode:file.mode,size:fileSize(file),sha256:file.sha256,parts:[]}, full=new SHA256();let buffer=new Uint8Array(partSize),used=0,read=0;
        async function uploadPart(){
          if(!used)return;const bytes=buffer.subarray(0,used), sha256=new SHA256().update(bytes).hex(), digest=await blobHash(bytes), cacheKey=`${base}:${digest}`;
          let sha=preparedBlobs.get(cacheKey);if(!sha){sha=(await post("/git/blobs",{content:base64(bytes),encoding:"base64"})).sha;preparedBlobs.set(cacheKey,sha);}
          if(sha!==digest)fail("GitHub 返回的大文件分块摘要不一致。");
          const path=`${partsDirectory}/${file.sha256}/part-${String(record.parts.length).padStart(4,"0")}.bin`;
          record.parts.push({path,sha,sha256,size:used});intended.push({path:`${target}/${path}`,mode:"100644",sha});await stage({path:`${target}/${path}`,mode:"100644",type:"blob",sha});
          done+=used;progress(Math.round(done/totalBytes*85),`正在上传大文件 ${file.relative}：${Math.ceil(read/MB)} / ${Math.ceil(fileSize(file)/MB)} MB；分块将在构建时自动还原。`);used=0;
        }
        for await(const chunk of chunksOf(file)){
          read+=chunk.length;if(read>fileSize(file))fail(`大文件大小发生变化：${file.relative}`);full.update(chunk);
          for(let at=0;at<chunk.length;){const n=Math.min(buffer.length-used,chunk.length-at);buffer.set(chunk.subarray(at,at+n),used);used+=n;at+=n;if(used===buffer.length)await uploadPart();}
          await new Promise(resolve=>setTimeout(resolve,0));
        }
        await uploadPart();buffer=null;
        if(read!==fileSize(file) || full.hex()!==file.sha256)fail(`大文件内容发生变化，尚未更新分支：${file.relative}`);
        nextLarge.set(file.relative,record);manifestChanged=true;
        if(current.has(key(file.path)))await stage({path:file.path,mode:"100644",type:"blob",sha:null});
        continue;
      }
      const content = inspect({ ...file, bytes: file.read ? await file.read() : file.bytes });
      if (file.sha && await blobHash(content.bytes) !== file.sha) fail(`文件内容发生变化，已停止提交，请重新选择：${file.path}`);
      let entryDigest=file.sha || await blobHash(content.bytes);
      if(packBinary && content.text===null && content.bytes.length<=2*MB){
        entry.content=binaryPrefix+base64(content.bytes);entryDigest=await blobHash(encoder.encode(entry.content));
        nextBinary.set(file.relative,{path:file.relative,size:content.bytes.length,mode:file.mode,sha:file.sha||await blobHash(content.bytes),sha256:new SHA256().update(content.bytes).hex(),stored_sha:entryDigest});manifestChanged=true;
      } else if (content.text === null || content.bytes.length > 2 * MB) {
        const key = `${base}:${file.sha || await blobHash(content.bytes)}`;
        entry.sha = preparedBlobs.get(key);
        if (!entry.sha) {
          entry.sha = (await post("/git/blobs", { content: base64(content.bytes), encoding: "base64" })).sha;
          preparedBlobs.set(key, entry.sha);
        }
      } else entry.content = content.text;
      // Keep only object IDs for rebasing, not another copy of the source bytes.
      await stage(entry, entryDigest);
      done += fileSize(file);
      progress(Math.round(done / totalBytes * 85), `准备文件 ${index} / ${changes.length}；完成后统一提交，不会留下半个工程。`);
      if(index%64===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(manifestChanged){
      const kept=new Set([...nextLarge.values()].flatMap(file=>file.parts.map(part=>part.path)));
      for(const previous of previousLarge.values())for(const part of previous.parts)if(!kept.has(part.path)){
        const path=`${target}/${part.path}`,old=current.get(key(path));
        if(old){if(old.path!==path || old.type!=="blob" || old.mode!=="100644" || old.sha!==part.sha)fail(`旧分块已被改动，不能自动替换：${path}`);intended.push({path,mode:"100644",sha:null});await stage({path,mode:"100644",type:"blob",sha:null});}
      }
      if(nextLarge.size || nextBinary.size){
        const value={version:1,files:[...nextLarge.values()].sort((a,b)=>a.path.localeCompare(b.path))};if(nextBinary.size)value.binary_files=[...nextBinary.values()].sort((a,b)=>a.path.localeCompare(b.path));largeManifest(value);
        const content=JSON.stringify(value)+"\n",bytes=encoder.encode(content),sha=await blobHash(bytes);if(bytes.length>64*MB)fail("源码传输清单超过 64 MB，请缩短路径或拆分项目。");intended.push({path:manifestPath,mode:"100644",sha});
        if(bytes.length>2*MB){const blob=await post("/git/blobs",{encoding:"utf-8",content});if(blob.sha!==sha)fail("传输清单摘要不一致。");await stage({path:manifestPath,mode:"100644",type:"blob",sha});}
        else await stage({path:manifestPath,mode:"100644",type:"blob",content},sha);
      }
      else {intended.push({path:manifestPath,mode:"100644",sha:null});await stage({path:manifestPath,mode:"100644",type:"blob",sha:null});}
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
          const bytes = encoder.encode(JSON.stringify(entry)).length + 1;
          if (size + bytes > 3 * MB - 1024) await flush();
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
  globalThis.IOSForgeUpload = Object.freeze({ limits, readZip, readFolder, prepare, identifyXcode, destination, publish, listProjects, removeProject, crc32, SHA256 });
})();
