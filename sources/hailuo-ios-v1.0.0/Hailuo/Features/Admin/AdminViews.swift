import SwiftUI
import WebKit

/// The admin UI is the standalone backend itself, including its responsive CSS
/// and frosted dialogs. There is no second native layout to drift from it.
struct AdminHomeView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @State private var verified = false
    @State private var hasConsoleSession = false
    @State private var loading = true
    @State private var errorText: String?
    @State private var pageID = UUID()

    var body: some View {
        Group {
            // Do not instantiate WKWebView, load its document or mount admin
            // content for a cached, ordinary, banned or deleted account.
            if session.canAccessAdmin {
                VStack(spacing: 0) {
                    HStack {
                        Button { presentation.wrappedValue.dismiss() } label: {
                            Label("返回海螺", systemImage: "chevron.left").font(.system(size: 14, weight: .medium))
                        }
                        Spacer()
                        Button {
                            verified = false; pageID = UUID()
                            Task { await verify() }
                        } label: { Image(systemName: "arrow.clockwise").font(.system(size: 15)) }
                            .accessibilityLabel("重新验证并刷新后台")
                    }
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .foregroundColor(HailuoTheme.primaryDeep)
                    if let errorText {
                        Spacer()
                        VStack(spacing: 12) {
                            Text("后台暂时无法加载").font(.system(size: 17, weight: .semibold))
                            Text(errorText).font(.system(size: 13)).foregroundColor(.secondary).multilineTextAlignment(.center)
                            Button("重试") { Task { await verify() } }.buttonStyle(PrimaryButtonStyle())
                        }.padding(24)
                        Spacer()
                    } else if verified {
                        AdminWebPanel(hasConsoleSession: hasConsoleSession, loading: $loading, errorText: $errorText)
                            .id(pageID).overlay(LoadingOverlay(visible: loading))
                    } else {
                        Spacer(); ProgressView("正在验证管理员权限…"); Spacer()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(red: 244 / 255.0, green: 246 / 255.0, blue: 248 / 255.0).ignoresSafeArea())
                .buttonStyle(PlainButtonStyle()).navigationBarHidden(true)
            } else { Color.clear.navigationBarHidden(true) }
        }
        .task { await verify() }
        .onChange(of: session.canAccessAdmin) { allowed in
            if !allowed { verified = false; presentation.wrappedValue.dismiss() }
        }
        .onDisappear { verified = false }
    }

    @MainActor private func verify() async {
        guard session.canAccessAdmin else { presentation.wrappedValue.dismiss(); return }
        loading = true; errorText = nil
        do {
            try await session.refreshProfile()
            guard session.canAccessAdmin else { presentation.wrappedValue.dismiss(); return }
            hasConsoleSession = session.keychain.string(account: "adminToken")?.isEmpty == false
            if hasConsoleSession { _ = try await AdminService().stats() }
            guard session.canAccessAdmin else { return }
            verified = true
        } catch { loading = false; errorText = error.localizedDescription }
    }
}

enum AdminWebSecurity {
    static let pageURL = URL(string: "../admin/", relativeTo: AppConstants.apiBaseURL)!.absoluteURL

    static func allowsDocument(_ url: URL?) -> Bool {
        guard let url, url.scheme == "https", url.host == pageURL.host, url.port == pageURL.port,
              url.user == nil, url.password == nil, url.fragment == nil else { return false }
        return ["/admin", "/admin/", "/admin/index.html"].contains(url.path)
    }

    static func endpoint(path: String, method: String, body: JSONValue?) throws -> Endpoint {
        guard path.utf8.count <= 4096, let components = URLComponents(string: path),
              components.scheme == nil, components.host == nil, components.fragment == nil,
              let verb = HTTPMethod(rawValue: method),
              !components.path.split(separator: "/", omittingEmptySubsequences: false).contains(where: { $0 == "." || $0 == ".." }),
              !components.path.contains("\\"), !components.path.contains("%") else {
            throw APIError(code: 403, message: "后台请求地址无效", extra: nil)
        }
        let admin = components.path.hasPrefix("/api/admin/")
        let consoleLogin = components.path == "/api/auth/console/login" && verb == .post
        guard admin || consoleLogin else { throw APIError(code: 403, message: "禁止访问非后台接口", extra: nil) }
        guard verb != .get || body == nil || body == .null else {
            throw APIError(code: 400, message: "读取请求不能携带提交内容", extra: nil)
        }
        return Endpoint(path: String(components.path.dropFirst("/api/".count)), method: verb,
                        query: components.queryItems ?? [], body: body,
                        requiresAuthentication: admin, requiresAdminToken: admin)
    }
}

/// Snapshot WKScriptMessage's untyped value synchronously, before creating a Task.
struct AdminWebRequest: Sendable {
    let id: String
    let endpoint: Endpoint

    static func parse(_ message: Any) throws -> AdminWebRequest {
        guard let object = message as? [String: Any],
              let id = object["id"] as? String, !id.isEmpty, id.count <= 64,
              let path = object["path"] as? String, let method = object["method"] as? String else {
            throw APIError(code: 400, message: "后台请求格式无效", extra: nil)
        }
        let payload = JSONValue.from(object["body"])
        let encoded = try JSONEncoder().encode(payload)
        guard encoded.count <= 1_048_576 else { throw APIError(code: 413, message: "提交内容过大", extra: nil) }
        return AdminWebRequest(id: id, endpoint: try AdminWebSecurity.endpoint(path: path, method: method, body: payload == .null ? nil : payload))
    }
}

@MainActor
private struct AdminWebPanel: UIViewRepresentable {
    let hasConsoleSession: Bool
    @Binding var loading: Bool
    @Binding var errorText: String?
    @EnvironmentObject private var session: SessionStore

    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        // Never persist the admin page's cookies, storage or cached responses.
        configuration.websiteDataStore = .nonPersistent()
        let controller = configuration.userContentController
        controller.add(context.coordinator, name: "hailuoAdmin")
        controller.addUserScript(WKUserScript(source: AdminWebBridge.script(ready: hasConsoleSession),
                                             injectionTime: .atDocumentStart, forMainFrameOnly: true))
        controller.addUserScript(WKUserScript(source: AdminWebViewport.script,
                                             injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        let webView = HailuoAdminWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 244 / 255.0, green: 246 / 255.0, blue: 248 / 255.0, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        // The native VStack already excludes the status/header/home areas.
        // Do not let WebKit apply those container insets a second time.
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.keyboardDismissMode = .interactive
        webView.onViewportChanged = { [weak coordinator = context.coordinator] in coordinator?.updateViewport() }
        webView.load(URLRequest(url: AdminWebSecurity.pageURL, cachePolicy: .reloadIgnoringLocalCacheData))
        context.coordinator.webView = webView
        return webView
    }
    func updateUIView(_ webView: WKWebView, context: Context) { context.coordinator.parent = self }
    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        coordinator.close()
        webView.stopLoading()
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "hailuoAdmin")
        webView.configuration.userContentController.removeAllUserScripts()
        webView.navigationDelegate = nil; webView.uiDelegate = nil
    }

    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        var parent: AdminWebPanel
        weak var webView: WKWebView?
        private var tasks: [String: Task<Void, Never>] = [:]
        private var active = true
        init(_ parent: AdminWebPanel) { self.parent = parent }

        func close() { active = false; tasks.values.forEach { $0.cancel() }; tasks.removeAll(); webView = nil }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard active, parent.session.canAccessAdmin, message.name == "hailuoAdmin", message.frameInfo.isMainFrame,
                  message.frameInfo.securityOrigin.protocol == "https",
                  message.frameInfo.securityOrigin.host == AdminWebSecurity.pageURL.host,
                  AdminWebSecurity.allowsDocument(message.frameInfo.request.url) else { return }
            if let object = message.body as? [String: Any], object["kind"] as? String == "logout" {
                close(); parent.session.revokeAdminAccess(); return
            }
            if let object = message.body as? [String: Any], object["kind"] as? String == "cancel", let id = object["id"] as? String {
                tasks.removeValue(forKey: id)?.cancel(); return
            }
            do {
                let request = try AdminWebRequest.parse(message.body)
                guard tasks[request.id] == nil, tasks.count < 24 else {
                    reply(id: request.id, code: 429, message: "操作过于频繁，请稍后重试", data: .null); return
                }
                tasks[request.id] = Task { @MainActor [weak self] in
                    guard let self, self.active, self.parent.session.canAccessAdmin else { return }
                    defer { self.tasks[request.id] = nil }
                    do {
                        let data: JSONValue
                        if request.endpoint.path == "auth/console/login" {
                            let body = request.endpoint.body?.objectValue ?? [:]
                            try await AdminService().authenticate(account: body["phone"]?.stringValue ?? body["account"]?.stringValue ?? "",
                                                                  password: body["password"]?.stringValue ?? "")
                            _ = try await AdminService().stats()
                            // This marker controls only web UI state. The real token
                            // stays in Keychain and is attached by APIClient, not JavaScript.
                            data = .object(["adminToken": .string("native-admin-session"), "token": .string("native-admin-session")])
                        } else {
                            // Successful admin mutations may return data:null.
                            // Preserve that web contract instead of reporting a false failure.
                            data = try await APIClient.shared.requestOptional(request.endpoint, as: JSONValue.self) ?? .null
                        }
                        try Task.checkCancellation()
                        guard self.active, self.parent.session.canAccessAdmin else { return }
                        self.reply(id: request.id, code: 0, message: "", data: data)
                    } catch {
                        guard !Task.isCancelled, self.active, self.parent.session.canAccessAdmin else { return }
                        let apiError = (error as? APIError) ?? APIError(code: -1, message: error.localizedDescription, extra: nil)
                        self.reply(id: request.id, code: apiError.code, message: apiError.message, data: apiError.extra.map(JSONValue.object) ?? .null)
                    }
                }
            } catch {
                if let id = (message.body as? [String: Any])?["id"] as? String {
                    reply(id: id, code: 403, message: error.localizedDescription, data: .null)
                }
            }
        }

        private func reply(id: String, code: Int, message: String, data: JSONValue) {
            guard active, parent.session.canAccessAdmin, let webView, AdminWebSecurity.allowsDocument(webView.url) else { return }
            let value = JSONValue.object(["id": .string(id), "response": .object(["code": .int(code), "message": .string(message), "data": data])])
            guard let encoded = try? JSONEncoder().encode(value), let json = String(data: encoded, encoding: .utf8) else { return }
            webView.evaluateJavaScript("window.__hailuoAdminReply(\(json));", completionHandler: nil)
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
            let allowed = active && parent.session.canAccessAdmin && navigationAction.targetFrame?.isMainFrame == true
                && AdminWebSecurity.allowsDocument(navigationAction.request.url)
            decisionHandler(allowed ? .allow : .cancel)
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { parent.loading = false; updateViewport() }
        func updateViewport() {
            guard active, let webView, AdminWebSecurity.allowsDocument(webView.url), !webView.bounds.isEmpty else { return }
            let size = webView.bounds.size
            webView.evaluateJavaScript("window.__hailuoAdminViewport && window.__hailuoAdminViewport(\(size.width),\(size.height));", completionHandler: nil)
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed(error) }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed(error) }
        private func failed(_ error: Error) {
            guard active, (error as NSError).code != NSURLErrorCancelled else { return }
            parent.loading = false; parent.errorText = error.localizedDescription
        }
        func webView(_ webView: WKWebView, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
            if challenge.protectionSpace.host == AdminWebSecurity.pageURL.host {
                CertificatePinning.handle(challenge, completionHandler: completionHandler)
            } else { completionHandler(.performDefaultHandling, nil) }
        }
        func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping @MainActor @Sendable (String?) -> Void) {
            guard active, parent.session.canAccessAdmin, AdminWebSecurity.allowsDocument(frame.request.url),
                  var presenter = webView.window?.rootViewController else { completionHandler(nil); return }
            while let presented = presenter.presentedViewController { presenter = presented }
            let alert = UIAlertController(title: prompt, message: nil, preferredStyle: .alert)
            alert.addTextField { $0.text = defaultText }
            alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(nil) })
            alert.addAction(UIAlertAction(title: "确定", style: .default) { _ in completionHandler(alert.textFields?.first?.text) })
            presenter.present(alert, animated: true)
        }
    }
}

@MainActor
private final class HailuoAdminWebView: WKWebView {
    var onViewportChanged: (() -> Void)?
    private var viewportSize = CGSize.zero
    override func layoutSubviews() {
        super.layoutSubviews()
        guard bounds.size != viewportSize else { return }
        viewportSize = bounds.size
        onViewportChanged?()
    }
}

/// Preserve the standalone admin design. Only adapt its fixed overlays to the
/// actual embedded viewport, including the keyboard; 100dvh can describe the
/// whole browser instead of the native WebView's usable rectangle on iOS.
enum AdminWebViewport {
    static let script = #"""
    (() => {
      if (location.origin !== 'https://xy666.cc.cd' || !['/admin','/admin/','/admin/index.html'].includes(location.pathname)) return;
      const style = document.createElement('style');
      style.id = 'hailuo-ios-viewport';
      style.textContent = `
        #modal-root, #confirm-modal-root, .modal-mask, .drawer-mask {
          top: var(--hailuo-viewport-top, 0px); bottom: auto;
          height: var(--hailuo-viewport-height, 100%); box-sizing: border-box;
        }
        .modal-mask { padding: 12px; }
        .modal, .modal.wide, .modal.generic-modal, .modal.generic-modal.config-modal,
        .modal.generic-modal.config-modal.misc-modal, .modal.admin-bc-box {
          max-height: calc(var(--hailuo-viewport-height, 100vh) - 24px);
          max-width: calc(100% - 0px);
        }
        .generic-modal-head, .generic-modal-footer, .bc-head, .bc-footer { flex-shrink: 0; }
        .generic-modal-body, .bc-compose, .bc-history { flex: 1 1 auto; min-height: 0; }
        .search-row { flex-wrap: wrap; }
        .search-row .input { flex: 1 1 160px; min-width: 0; }
        .search-row .btn { padding: 10px 12px; flex-shrink: 0; }
        .input, .config-field .input, .misc-modal .config-field .input { font-size: 16px; }
        @media (max-width: 760px) {
          #panel-view { padding: 12px; }
          .card { padding: 14px; }
          .user-item { display: grid; grid-template-columns: 40px minmax(0,1fr); gap: 8px 10px; padding: 12px; }
          .user-info { min-width: 0; }
          .user-name { font-size: 15px; line-height: 1.45; }
          .user-meta { line-height: 1.6; }
          .user-actions { grid-column: 2; margin-left: 0; gap: 6px; justify-content: flex-start; }
          .user-actions .action-btn { padding: 7px 10px; min-height: 36px; }
          .retention-rules, .misc-settings-grid, .config-field-grid, .op-row, .settings-grid {
            grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px;
          }
          .settings-stat:last-child:nth-child(odd) { grid-column: 1 / -1; }
          .retention-rule { padding: 12px; gap: 6px; }
          .retention-rule-title { font-size: 14px; }
          .retention-rule b { font-size: 16px; }
          .misc-modal .misc-setting-card { padding: 12px; }
          .config-section { padding: 12px; }
          .generic-modal-head, .generic-modal-footer { padding: 14px; }
          .generic-modal-body { padding: 14px; }
          .cleanup-card .settings-actions { gap: 6px; }
          .cleanup-card .settings-actions .page-btn { min-width: 46px; padding: 8px; }
          .cleanup-card .settings-actions .input { flex: 1 1 160px; min-width: 0; margin: 0; }
          .cleanup-schedule-controls { gap: 8px; flex-wrap: wrap; }
        }
      `;
      document.head.appendChild(style);
      let nativeHeight = innerHeight;
      const update = () => {
        const viewport = window.visualViewport;
        const height = Math.min(nativeHeight, viewport ? viewport.height : nativeHeight);
        const top = viewport ? Math.max(0, viewport.offsetTop) : 0;
        document.documentElement.style.setProperty('--hailuo-viewport-height', Math.max(0, height) + 'px');
        document.documentElement.style.setProperty('--hailuo-viewport-top', top + 'px');
      };
      window.__hailuoAdminViewport = (width, height) => {
        if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) return;
        nativeHeight = height; update();
      };
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', update);
        window.visualViewport.addEventListener('scroll', update);
      }
      window.addEventListener('resize', update);
      update();
    })();
    """#
}

/// API calls are bridged into the same native permission checks as other iOS
/// requests. JavaScript receives no user token or real admin token.
enum AdminWebBridge {
    static func script(ready: Bool) -> String {
        return #"""
        (() => {
          if (location.origin !== 'https://xy666.cc.cd' || !['/admin','/admin/','/admin/index.html'].includes(location.pathname)) return;
          const pending = new Map();
          let sequence = 0;
          sessionStorage.setItem('hailuo_admin_token', __HAILUO_NATIVE_READY__ ? 'native-admin-session' : '');
          window.__hailuoAdminReply = reply => {
            const entry = pending.get(reply.id);
            if (!entry) return;
            pending.delete(reply.id);
            entry.cleanup();
            entry.resolve(new Response(JSON.stringify(reply.response), {status: 200, headers: {'Content-Type':'application/json'}}));
          };
          window.fetch = (input, init = {}) => {
            const url = new URL(typeof input === 'string' ? input : input.url, location.href);
            if (url.origin !== location.origin || !(url.pathname.startsWith('/api/admin/') || url.pathname === '/api/auth/console/login')) {
              return Promise.reject(new TypeError('禁止访问非后台接口'));
            }
            const method = (init.method || 'GET').toUpperCase();
            const signal = init.signal;
            if (signal && signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
            let body = null;
            try { if (init.body != null) body = JSON.parse(init.body); }
            catch (_) { return Promise.reject(new TypeError('后台提交内容无效')); }
            const id = 'r' + (++sequence);
            return new Promise((resolve, reject) => {
              const abort = () => {
                pending.delete(id);
                cleanup();
                window.webkit.messageHandlers.hailuoAdmin.postMessage({kind:'cancel', id});
                reject(new DOMException('Aborted', 'AbortError'));
              };
              const timer = setTimeout(abort, 25000);
              const cleanup = () => { clearTimeout(timer); if (signal) signal.removeEventListener('abort', abort); };
              pending.set(id, {resolve, reject, cleanup});
              if (signal) signal.addEventListener('abort', abort, {once:true});
              window.webkit.messageHandlers.hailuoAdmin.postMessage({id, path:url.pathname + url.search, method, body});
            });
          };
          document.addEventListener('DOMContentLoaded', () => {
            if (!window.AAPI) return;
            const clear = window.AAPI.clear.bind(window.AAPI);
            window.AAPI.clear = () => {
              const authenticated = !!window.AAPI.token;
              clear();
              if (authenticated) window.webkit.messageHandlers.hailuoAdmin.postMessage({kind:'logout'});
            };
          }, {once:true});
        })();
        """#.replacingOccurrences(of: "__HAILUO_NATIVE_READY__", with: ready ? "true" : "false")
    }
}
