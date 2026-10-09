import SwiftUI
import UIKit
import CoreImage

/// The footer is a separate native subtree, so it can be excluded from its own backdrop.
/// Only the footer is rehosted: the page and its NavigationLinks retain their original environment.
@MainActor
struct HailuoGlassFooter<Content: View>: UIViewControllerRepresentable {
    let active: Bool
    @ViewBuilder var content: (HailuoGlassBackdrop) -> Content
    func makeUIViewController(context: Context) -> HailuoGlassFooterController {
        let controller = HailuoGlassFooterController()
        controller.setContent(AnyView(content(controller.backdrop)), active: active)
        return controller
    }
    func updateUIViewController(_ controller: HailuoGlassFooterController, context: Context) {
        controller.setContent(AnyView(content(controller.backdrop)), active: active)
    }
    static func dismantleUIViewController(_ controller: HailuoGlassFooterController, coordinator: ()) {
        controller.backdrop.stop()
    }
}

@MainActor
final class HailuoGlassFooterController: UIViewController {
    let backdrop = HailuoGlassBackdrop()
    private let hosting = UIHostingController(rootView: AnyView(EmptyView()))
    override func loadView() {
        view = UIView()
        view.backgroundColor = .clear
        hosting.view.backgroundColor = .clear
        // This is a 64 pt footer. Device/keyboard insets belong to its parent.
        if #available(iOS 16.4, *) { hosting.safeAreaRegions = [] }
        addChild(hosting)
        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hosting.view)
        NSLayoutConstraint.activate([
            hosting.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hosting.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hosting.view.topAnchor.constraint(equalTo: view.topAnchor),
            hosting.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        hosting.didMove(toParent: self)
        backdrop.owner = self
    }
    func setContent(_ content: AnyView, active: Bool) {
        loadViewIfNeeded()
        hosting.rootView = AnyView(content.ignoresSafeArea())
        backdrop.active = active
        backdrop.requestCapture(rediscoverScrolls: true)
    }
    override func viewDidLayoutSubviews() { super.viewDidLayoutSubviews(); backdrop.layoutChanged() }
    override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); backdrop.visible = true }
    override func viewWillDisappear(_ animated: Bool) { super.viewWillDisappear(animated); backdrop.visible = false }
}

/// In-memory, own-window-only sampling. No screenshot is written, cached on disk or transmitted.
/// The whole footer is hidden only inside a disabled-actions transaction and restored before commit.
@MainActor
final class HailuoGlassBackdrop {
    weak var owner: HailuoGlassFooterController?
    var active = false { didSet { updateClock() } }
    var visible = false { didSet { updateClock() } }
    private var clock: CADisplayLink?
    private let surfaces = NSHashTable<HailuoLensView>.weakObjects()
    private var frame: CGImage?
    private var captureRect = CGRect.zero
    private var captureScale: CGFloat = 1
    private var capturing = false
    private var needsCapture = true
    private var needsRender = false
    private var footerRect = CGRect.zero
    private var observations: [NSKeyValueObservation] = []
    private let scrolls = NSHashTable<UIScrollView>.weakObjects()
    private var scrollFallback = false
    private var needsScrollDiscovery = true
    var isSampling: Bool { clock != nil }
    func register(_ surface: HailuoLensView) { surfaces.add(surface); requestCapture() }
    func unregister(_ surface: HailuoLensView) { surfaces.remove(surface); updateClock() }
    func requestCapture(rediscoverScrolls: Bool = false) {
        needsCapture = true
        needsScrollDiscovery = needsScrollDiscovery || rediscoverScrolls
        updateClock()
    }
    func requestRender() { needsRender = true; updateClock() }
    func layoutChanged() {
        guard let owner, let window = owner.viewIfLoaded?.window else { return }
        let rect = owner.view.convert(owner.view.bounds, to: window)
        guard rect != footerRect else { return }
        footerRect = rect
        requestCapture(rediscoverScrolls: true)
    }
    private func updateClock() {
        guard active, visible, !surfaces.allObjects.isEmpty else { stop(); return }
        guard needsCapture || needsRender else { pauseClock(); return }
        guard clock == nil else { return }
        let link = CADisplayLink(target: HailuoGlassClockTarget(self), selector: #selector(HailuoGlassClockTarget.tick(_:)))
        // Coalesce invalidations; never rasterize the window continuously at rest.
        link.preferredFramesPerSecond = 30
        link.add(to: .main, forMode: .common)
        clock = link
    }
    private func pauseClock() {
        clock?.invalidate()
        clock = nil
    }
    func stop() {
        pauseClock()
        observations.removeAll(); scrolls.removeAllObjects()
        frame = nil
        needsCapture = true; needsRender = false; scrollFallback = false
        needsScrollDiscovery = true
        surfaces.allObjects.forEach { $0.clearFrame() }
    }
    private func observeScrolls(in root: UIView, excluding footer: UIView) {
        observations.removeAll(); scrolls.removeAllObjects()
        func visit(_ view: UIView) {
            guard view !== footer, !view.isHidden else { return }
            if let scroll = view as? UIScrollView {
                scrolls.add(scroll)
                observations.append(scroll.observe(\.contentOffset, options: [.new]) { [weak self] _, _ in
                    Task { @MainActor [weak self] in self?.requestCapture() }
                })
                observations.append(scroll.observe(\.contentSize, options: [.new]) { [weak self] _, _ in
                    Task { @MainActor [weak self] in self?.requestCapture() }
                })
            }
            view.subviews.forEach(visit)
        }
        visit(root)
    }
    func refresh() {
        guard !capturing, active, visible, let owner, let window = owner.viewIfLoaded?.window,
              window.windowScene?.activationState == .foregroundActive,
              !window.isHidden, window.alpha > 0, !owner.view.isHidden else { pauseClock(); return }
        var parent: UIViewController? = owner
        while let current = parent {
            // Do not sample a modal, system picker or pushed page into the home footer.
            if current.presentedViewController != nil { pauseClock(); return }
            if let navigation = current as? UINavigationController,
               let top = navigation.topViewController, !contains(owner, in: top) { stop(); return }
            parent = current.parent
        }
        var ancestor: UIView? = owner.view
        while let current = ancestor {
            if current.isHidden || current.alpha < 0.01 { pauseClock(); return }
            ancestor = current.superview
        }
        if needsScrollDiscovery {
            observeScrolls(in: window, excluding: owner.view)
            needsScrollDiscovery = false
        }
        // Live native blur is compositor-driven. During tracking/deceleration
        // use it, then refresh refraction once scrolling settles. Reading the
        // entire SwiftUI layer tree on every scroll frame blocks the UI thread.
        if scrolls.allObjects.contains(where: { $0.isTracking || $0.isDecelerating }) {
            if !scrollFallback {
                frame = nil; surfaces.allObjects.forEach { $0.clearFrame() }; scrollFallback = true
            }
            needsCapture = true
            return
        }
        scrollFallback = false
        if !needsCapture, frame != nil {
            if needsRender { surfaces.allObjects.forEach { render($0, in: window) } }
            needsRender = false; pauseClock()
            return
        }
        let rect = owner.view.convert(owner.view.bounds, to: window).insetBy(dx: -40, dy: -40).intersection(window.bounds).integral
        guard !rect.isEmpty, rect.width.isFinite, rect.height.isFinite, rect.width <= 2_048, rect.height <= 512 else { pauseClock(); return }
        captureRect = rect
        captureScale = min(2, window.screen.scale)
        let format = UIGraphicsImageRendererFormat()
        format.scale = captureScale
        format.opaque = false
        capturing = true
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        let wasHidden = owner.view.layer.isHidden
        owner.view.layer.isHidden = true
        defer {
            owner.view.layer.isHidden = wasHidden
            CATransaction.commit()
            capturing = false
        }
        let image = UIGraphicsImageRenderer(size: rect.size, format: format).image { context in
            context.cgContext.translateBy(x: -rect.minX, y: -rect.minY)
            window.layer.render(in: context.cgContext)
        }
        frame = image.cgImage
        for surface in surfaces.allObjects { render(surface, in: window) }
        needsCapture = false; needsRender = false; pauseClock()
    }
    private func contains(_ child: UIViewController, in root: UIViewController) -> Bool {
        root === child || root.children.contains { contains(child, in: $0) }
    }
    private func render(_ surface: HailuoLensView, in window: UIWindow) {
        guard let frame, surface.window === window, !surface.bounds.isEmpty else { return }
        let rect = surface.convert(surface.bounds, to: window)
        let local = CGRect(x: (rect.minX - captureRect.minX) * captureScale,
                           y: (captureRect.maxY - rect.maxY) * captureScale,
                           width: rect.width * captureScale, height: rect.height * captureScale)
        let footer = owner?.view.convert(owner?.view.bounds ?? .zero, to: window) ?? .zero
        let artworkRect = CGRect(x: (footer.minX - captureRect.minX) * captureScale,
                                 y: (captureRect.maxY - footer.maxY) * captureScale,
                                 width: footer.width * captureScale, height: footer.height * captureScale)
        surface.render(frame, rect: local, artworkRect: artworkRect, scale: captureScale)
    }
}

@MainActor
private final class HailuoGlassClockTarget: NSObject {
    weak var backdrop: HailuoGlassBackdrop?
    init(_ backdrop: HailuoGlassBackdrop) { self.backdrop = backdrop }
    @objc func tick(_ link: CADisplayLink) {
        guard let backdrop else { link.invalidate(); return }
        autoreleasepool { backdrop.refresh() }
    }
}

struct HailuoTabArtwork: Equatable {
    var selection: Int
    var unread: Int
    var rightToLeft: Bool
    var press: Double
    var preview: Bool
    var panelOffset: CGFloat = 0
    var indicatorIndex: Double = 0
}

struct HailuoLensParameters: Equatable {
    var refractionHeight: CGFloat = 0
    var refractionAmount: CGFloat = 0
    var blurRadius: CGFloat = 0
    var vibrancy = false
    var artwork: HailuoTabArtwork?
    var artworkRefraction: CGFloat = 0
}

/// The default Backdrop highlight is directional/additive, not an opaque white stroke.
enum HailuoCapsuleDecoration: Equatable {
    case highlight(CGFloat)
    case innerShadow(radius: CGFloat, alpha: CGFloat)
    case interactive(position: CGPoint, progress: CGFloat)
}

@MainActor
struct HailuoCapsuleLighting: UIViewRepresentable {
    let decoration: HailuoCapsuleDecoration
    func makeUIView(context: Context) -> HailuoCapsuleLightingView {
        let view = HailuoCapsuleLightingView(frame: .zero)
        view.decoration = decoration
        return view
    }
    func updateUIView(_ view: HailuoCapsuleLightingView, context: Context) {
        view.decoration = decoration
    }
    static func dismantleUIView(_ view: HailuoCapsuleLightingView, coordinator: ()) { view.image = nil }
}

@MainActor
final class HailuoCapsuleLightingView: UIImageView {
    var decoration: HailuoCapsuleDecoration = .highlight(0) {
        didSet { if decoration != oldValue { setNeedsLayout() } }
    }
    private var renderedDecoration: HailuoCapsuleDecoration?
    private var renderedSize = CGSize.zero
    private var renderedScale: CGFloat = 0
    override init(frame: CGRect) {
        super.init(frame: frame)
        contentMode = .scaleToFill
        isUserInteractionEnabled = false
        isAccessibilityElement = false
        backgroundColor = .clear
    }
    required init?(coder: NSCoder) { return nil }
    override func didMoveToWindow() { super.didMoveToWindow(); setNeedsLayout() }
    override func layoutSubviews() {
        super.layoutSubviews()
        let scale = window?.screen.scale ?? traitCollection.displayScale
        guard !bounds.isEmpty, scale > 0, bounds.width <= 2_048, bounds.height <= 512 else {
            image = nil; renderedSize = .zero; renderedScale = 0
            return
        }
        guard renderedDecoration != decoration || renderedSize != bounds.size || renderedScale != scale else { return }
        renderedDecoration = decoration
        renderedSize = bounds.size
        renderedScale = scale
        let rect = CGRect(origin: .zero, size: CGSize(width: bounds.width * scale, height: bounds.height * scale))
        image = HailuoLensRenderer.decoration(decoration, rect: rect, scale: scale)
            .flatMap { HailuoLensRenderer.context.createCGImage($0, from: rect) }
            .map { UIImage(cgImage: $0, scale: scale, orientation: .up) }
    }
}

/// Unit-mass damped spring, integrated analytically so frame rate cannot change its response.
/// Stiffness/damping ratios below are the ones used in Android's LiquidGlassGestures.kt.
struct HailuoTabSpring: Equatable {
    var value: Double
    var velocity: Double = 0
    var target: Double
    let stiffness: Double
    let dampingRatio: Double
    init(_ value: Double, stiffness: Double, dampingRatio: Double) {
        self.value = value
        target = value
        self.stiffness = stiffness
        self.dampingRatio = dampingRatio
    }
    var settled: Bool { abs(value - target) < 0.001 && abs(velocity) < 0.01 }
    mutating func snap(_ next: Double) { value = next; target = next; velocity = 0 }
    mutating func advance(_ seconds: Double) {
        guard seconds.isFinite, seconds > 0 else { return }
        let dt = min(seconds, 0.1)
        let omega = sqrt(stiffness)
        let displacement = value - target
        if dampingRatio == 1 {
            let coefficient = velocity + omega * displacement
            let decay = exp(-omega * dt)
            value = target + decay * (displacement + coefficient * dt)
            velocity = decay * (velocity - omega * coefficient * dt)
        } else {
            let decayRate = dampingRatio * omega
            let frequency = omega * sqrt(max(0.0001, 1 - dampingRatio * dampingRatio))
            let coefficient = (velocity + decayRate * displacement) / frequency
            let cosine = cos(frequency * dt), sine = sin(frequency * dt)
            let wave = displacement * cosine + coefficient * sine
            let decay = exp(-decayRate * dt)
            value = target + decay * wave
            velocity = decay * (-decayRate * wave - displacement * frequency * sine + coefficient * frequency * cosine)
        }
        if settled { snap(target) }
    }
}

struct HailuoTabMotionFrame: Equatable {
    var index: Double = 0
    var press: Double = 0
    var scaleX: Double = 1
    var scaleY: Double = 1
    var velocity: Double = 0
    var panel: Double = 0
}

@MainActor
final class HailuoTabMotion: ObservableObject {
    @Published private(set) var frame = HailuoTabMotionFrame()
    private var position = HailuoTabSpring(0, stiffness: 1_000, dampingRatio: 1)
    private var press = HailuoTabSpring(0, stiffness: 1_000, dampingRatio: 1)
    private var scaleX = HailuoTabSpring(1, stiffness: 250, dampingRatio: 0.6)
    private var scaleY = HailuoTabSpring(1, stiffness: 250, dampingRatio: 0.7)
    private var velocity = HailuoTabSpring(0, stiffness: 300, dampingRatio: 0.5)
    private var panel = HailuoTabSpring(0, stiffness: 300, dampingRatio: 1)
    private var link: CADisplayLink?
    private var lastTimestamp: CFTimeInterval?
    private var releasing = false
    private var dragging = false
    private var enabled = false
    var isAnimating: Bool { link != nil }
    var targetIndex: Int { Int(position.target.rounded()) }
    static func easeOut(_ fraction: Double) -> Double {
        let x = min(1, max(0, fraction))
        var low = 0.0, high = 1.0
        for _ in 0..<20 {
            let t = (low + high) / 2
            let curveX = 3 * (1 - t) * t * t * 0.58 + t * t * t
            if curveX < x { low = t } else { high = t }
        }
        let t = (low + high) / 2
        return 3 * (1 - t) * t * t + t * t * t
    }
    func configure(index: Int, enabled: Bool) {
        self.enabled = enabled
        if !enabled || !dragging && position.target != Double(index) {
            stop(index: index)
        }
    }
    func select(_ index: Int) {
        guard enabled else { stop(index: index); return }
        position.target = Double(min(2, max(0, index)))
        velocity.target = 0
        beginPress()
        releasing = true
        startClock()
    }
    func touch(_ down: Bool) {
        guard enabled else { return }
        dragging = down
        if down { beginPress() }
        else { releasing = true; panel.target = 0 }
        startClock()
    }
    func drag(index: CGFloat, translation: CGFloat) {
        guard enabled, dragging else { return }
        position.target = Double(min(2, max(0, index)))
        panel.snap(Double(translation))
        startClock()
    }
    func stop(index: Int) {
        link?.invalidate(); link = nil; lastTimestamp = nil
        dragging = false; releasing = false
        position.snap(Double(min(2, max(0, index))))
        press.snap(0); scaleX.snap(1); scaleY.snap(1); velocity.snap(0); panel.snap(0)
        publish()
    }
    private func beginPress() {
        releasing = false
        press.target = 1
        scaleX.target = 78.0 / 56.0
        scaleY.target = 78.0 / 56.0
    }
    private func startClock() {
        guard link == nil else { return }
        let clock = CADisplayLink(target: HailuoTabMotionClock(self), selector: #selector(HailuoTabMotionClock.tick(_:)))
        clock.preferredFramesPerSecond = 60
        clock.add(to: .main, forMode: .common)
        link = clock
    }
    func tick(_ clock: CADisplayLink) {
        let seconds = lastTimestamp.map { clock.timestamp - $0 } ?? clock.duration
        lastTimestamp = clock.timestamp
        advance(seconds)
    }
    /// Also used by XCTest without a run-loop clock.
    func advance(_ seconds: Double) {
        guard enabled, seconds.isFinite, seconds > 0 else { return }
        position.advance(seconds)
        // Android's tracker normalizes velocity by its two-index range.
        velocity.target = dragging ? position.velocity / 2 : 0
        velocity.advance(seconds)
        if releasing && abs(position.value - position.target) < 0.05 {
            releasing = false
            press.target = 0; scaleX.target = 1; scaleY.target = 1
        }
        press.advance(seconds); scaleX.advance(seconds); scaleY.advance(seconds); panel.advance(seconds)
        publish()
        if !dragging && position.settled && press.settled && scaleX.settled && scaleY.settled && velocity.settled && panel.settled {
            link?.invalidate(); link = nil; lastTimestamp = nil
        }
    }
    private func publish() {
        let v = velocity.value / 10
        let next = HailuoTabMotionFrame(index: position.value, press: min(1, max(0, press.value)),
            scaleX: scaleX.value / (1 - min(0.2, max(-0.2, v * 0.75))),
            scaleY: scaleY.value * (1 - min(0.2, max(-0.2, v * 0.25))), velocity: velocity.value, panel: panel.value)
        if frame != next { frame = next }
    }
}

@MainActor
private final class HailuoTabMotionClock: NSObject {
    weak var motion: HailuoTabMotion?
    init(_ motion: HailuoTabMotion) { self.motion = motion }
    @objc func tick(_ link: CADisplayLink) {
        guard let motion else { link.invalidate(); return }
        motion.tick(link)
    }
}

@MainActor
struct HailuoLensSurface: UIViewRepresentable {
    let backdrop: HailuoGlassBackdrop
    let parameters: HailuoLensParameters
    func makeUIView(context: Context) -> HailuoLensView {
        let view = HailuoLensView()
        view.backdrop = backdrop
        view.parameters = parameters
        backdrop.register(view)
        return view
    }
    func updateUIView(_ view: HailuoLensView, context: Context) { view.parameters = parameters }
    static func dismantleUIView(_ view: HailuoLensView, coordinator: ()) {
        view.backdrop?.unregister(view)
        view.backdrop = nil
        view.clearFrame()
    }
}

@MainActor
final class HailuoLensView: UIView {
    weak var backdrop: HailuoGlassBackdrop?
    var parameters = HailuoLensParameters() {
        didSet {
            guard oldValue != parameters else { return }
            if imageView.image == nil { fallback.isHidden = parameters.blurRadius <= 0 }
            backdrop?.requestRender()
        }
    }
    private let fallback = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterial))
    private let imageView = UIImageView()
    private var lastArtwork: HailuoTabArtwork?
    private var lastArtworkSize = CGSize.zero
    private var artworkImage: CGImage?
    var renderedImage: UIImage? { imageView.image }
    override init(frame: CGRect) {
        super.init(frame: frame)
        isUserInteractionEnabled = false
        isAccessibilityElement = false
        backgroundColor = .clear
        imageView.contentMode = .scaleToFill
        addSubview(fallback)
        addSubview(imageView)
    }
    required init?(coder: NSCoder) { return nil }
    override func layoutSubviews() {
        super.layoutSubviews()
        let changed = imageView.frame != bounds
        fallback.frame = bounds
        imageView.frame = bounds
        if changed { backdrop?.requestRender() }
    }
    func clearFrame() {
        imageView.image = nil
        artworkImage = nil
        fallback.isHidden = parameters.blurRadius <= 0
    }
    func render(_ input: CGImage, rect: CGRect, artworkRect: CGRect, scale: CGFloat) {
        guard rect.width > 0, rect.height > 0, scale > 0 else { clearFrame(); return }
        // Capture coordinates include the bar/indicator's animated scale. Effects
        // must run in the unscaled local capsule, then UIKit applies that scale once.
        let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
        let captureToLocal = HailuoLensRenderer.surfaceTransform(size: size, captureRect: rect)
        let localRect = CGRect(origin: .zero, size: size)
        let localArtworkRect = artworkRect.applying(captureToLocal)
        var image = CIImage(cgImage: input).transformed(by: captureToLocal).clampedToExtent()
        image = HailuoLensRenderer.prepare(image, parameters: parameters, scale: scale)
        if let artwork = parameters.artwork {
            if artworkImage == nil || lastArtwork != artwork || lastArtworkSize != artworkRect.size {
                artworkImage = HailuoLensRenderer.tabArtwork(artwork, size: artworkRect.size, scale: scale)
                lastArtwork = artwork
                lastArtworkSize = artworkRect.size
            }
            if parameters.artworkRefraction > 0 {
                // Android records a pressed, refracted background before recording the sharp tabs.
                image = HailuoLensRenderer.lens(image, rect: localArtworkRect.insetBy(dx: 0, dy: 4 * scale),
                                               height: parameters.artworkRefraction * scale, amount: parameters.artworkRefraction * scale)
                    .composited(over: image)
            }
            if let glow = HailuoLensRenderer.interactiveGlow(artwork, rect: artworkRect, scale: scale) {
                image = glow.transformed(by: captureToLocal)
                    .applyingFilter("CIAdditionCompositing", parameters: [kCIInputBackgroundImageKey: image])
            }
            if let artworkImage {
                image = CIImage(cgImage: artworkImage)
                    .transformed(by: CGAffineTransform(translationX: artworkRect.minX, y: artworkRect.minY))
                    .transformed(by: captureToLocal).composited(over: image)
            }
        }
        image = HailuoLensRenderer.lens(image, rect: localRect, height: parameters.refractionHeight * scale, amount: parameters.refractionAmount * scale)
        guard let result = HailuoLensRenderer.context.createCGImage(image, from: localRect) else { clearFrame(); return }
        imageView.image = UIImage(cgImage: result, scale: scale, orientation: .up)
        fallback.isHidden = true
    }
}

/// Kyant Backdrop 2.0.1's capsule SDF/circular edge mapping and seven-sample dispersion,
/// adapted to Core Image's bottom-left working coordinates. See LiquidGlass-NOTICE.txt.
@MainActor
enum HailuoLensRenderer {
    static let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) ?? CGColorSpaceCreateDeviceRGB()
    static let context = CIContext(options: [.cacheIntermediates: false, .workingColorSpace: colorSpace, .outputColorSpace: colorSpace])
    static let kernel = CIKernel(source: kernelSource)
    static let decorationKernel = CIColorKernel(source: decorationSource)
    static func surfaceTransform(size: CGSize, captureRect: CGRect) -> CGAffineTransform {
        let x = size.width / captureRect.width, y = size.height / captureRect.height
        return CGAffineTransform(a: x, b: 0, c: 0, d: y, tx: -captureRect.minX * x, ty: -captureRect.minY * y)
    }
    static let decorationSource = """
    kernel vec4 hailuoCapsuleDecoration(vec4 rect, float mode, float width, float opacity, float offsetY, vec2 position) {
        vec2 halfSize = rect.zw * 0.5;
        vec2 centered = destCoord() - rect.xy - halfSize;
        float radius = min(halfSize.x, halfSize.y);
        vec2 corner = abs(centered) - (halfSize - vec2(radius));
        float sd = length(max(corner, 0.0)) - radius + min(max(corner.x, corner.y), 0.0);
        float inside = 1.0 - smoothstep(-0.5, 0.5, sd);
        vec2 positive = max(corner, 0.0);
        float magnitude = length(positive);
        float axis = step(corner.y, corner.x);
        vec2 grad = sign(centered) * mix(vec2(axis, 1.0 - axis), positive / max(magnitude, 0.0001), step(0.0001, magnitude));
        // Default angle is 45 degrees in Android's top-left coordinates.
        float intensity = abs(dot(grad, vec2(0.70710678, -0.70710678)));
        float rim = 1.0 - smoothstep(max(0.0, width - 0.5), width + 0.5, abs(sd));
        float highlight = inside * rim * intensity * opacity;
        vec2 shiftedCorner = abs(centered + vec2(0.0, offsetY)) - (halfSize - vec2(radius));
        float shiftedSD = length(max(shiftedCorner, 0.0)) - radius + min(max(shiftedCorner.x, shiftedCorner.y), 0.0);
        float shiftedInside = 1.0 - smoothstep(-0.5, 0.5, shiftedSD);
        float shadow = inside * (1.0 - shiftedInside) * opacity;
        float glowRadius = max(width, 0.0001);
        float falloff = 1.0 - smoothstep(glowRadius * 0.5, glowRadius, distance(destCoord(), position));
        float glow = inside * opacity * (0.08 + 0.15 * falloff);
        vec4 rimOrShadow = mix(vec4(highlight), vec4(0.0, 0.0, 0.0, shadow), min(mode, 1.0));
        return mix(rimOrShadow, vec4(glow), step(1.5, mode));
    }
    """
    static func decoration(_ value: HailuoCapsuleDecoration, rect: CGRect, scale: CGFloat) -> CIImage? {
        guard !rect.isEmpty, scale > 0, let decorationKernel else { return nil }
        let mode: CGFloat, width: CGFloat, alpha: CGFloat, offset: CGFloat, blur: CGFloat, position: CIVector
        switch value {
        case .highlight(let strength):
            mode = 0; width = ceil(0.5 * scale); alpha = 0.5 * min(1, max(0, strength)); offset = 0; blur = 0.25 * scale
            position = CIVector(x: rect.midX, y: rect.midY)
        case .innerShadow(let radius, let strength):
            mode = 1; width = 0; alpha = 0.15 * min(1, max(0, strength)); offset = max(0, radius) * scale; blur = offset
            position = CIVector(x: rect.midX, y: rect.midY)
        case .interactive(let point, let progress):
            mode = 2; width = min(rect.width, rect.height) * 1.5; alpha = min(1, max(0, progress)); offset = 0; blur = 0
            position = CIVector(x: rect.minX + point.x * scale, y: rect.maxY - point.y * scale)
        }
        guard alpha > 0 else { return nil }
        return decorationKernel.apply(extent: rect.insetBy(dx: -blur * 3 - 2, dy: -blur * 3 - 2),
            arguments: [CIVector(cgRect: rect), mode, width, alpha, offset, position])?
            .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: blur])
    }
    static func interactiveGlow(_ values: HailuoTabArtwork, rect: CGRect, scale: CGFloat) -> CIImage? {
        guard values.press > 0, scale > 0 else { return nil }
        let points = CGSize(width: rect.width / scale, height: rect.height / scale)
        let index = values.rightToLeft ? 2 - values.indicatorIndex : values.indicatorIndex
        let x = 4 + (CGFloat(index) + 0.5) * (points.width - 8) / 3
        let inner = rect.insetBy(dx: 0, dy: 4 * scale)
        guard let glow = decoration(.interactive(position: CGPoint(x: x, y: inner.height / scale / 2), progress: CGFloat(values.press)), rect: inner, scale: scale) else { return nil }
        let growth = 1 + CGFloat(values.press) * 16 / points.width
        return glow.transformed(by: CGAffineTransform(a: growth, b: 0, c: 0, d: growth,
            tx: rect.midX * (1 - growth) + values.panelOffset * scale, ty: rect.midY * (1 - growth)))
    }
    static let kernelSource = """
    kernel vec4 hailuoLens(sampler content, vec4 rect, float height, float amount) {
        vec2 halfSize = rect.zw * 0.5;
        vec2 centered = destCoord() - rect.xy - halfSize;
        float radius = min(halfSize.x, halfSize.y);
        vec2 corner = abs(centered) - (halfSize - vec2(radius));
        float sd = length(max(corner, 0.0)) - radius + min(max(corner.x, corner.y), 0.0);
        float edge = clamp(1.0 + min(sd, 0.0) / height, 0.0, 1.0);
        float d = -(1.0 - sqrt(max(0.0, 1.0 - edge * edge))) * amount;
        float gradRadius = min(radius * 1.5, min(halfSize.x, halfSize.y));
        vec2 q = abs(centered) - (halfSize - vec2(gradRadius));
        vec2 positive = max(q, 0.0);
        float magnitude = length(positive);
        float axis = step(q.y, q.x);
        vec2 grad = sign(centered) * mix(vec2(axis, 1.0 - axis), positive / max(magnitude, 0.0001), step(0.0001, magnitude));
        grad /= max(length(grad), 0.0001);
        vec2 refracted = destCoord() + d * grad;
        // AGSL is top-left; negate this product to preserve its dispersion quadrants.
        vec2 dispersion = d * grad * (-centered.x * centered.y / max(halfSize.x * halfSize.y, 0.0001));
        vec4 red = sample(content, samplerTransform(content, refracted + dispersion));
        vec4 orange = sample(content, samplerTransform(content, refracted + dispersion * (2.0 / 3.0)));
        vec4 yellow = sample(content, samplerTransform(content, refracted + dispersion * (1.0 / 3.0)));
        vec4 green = sample(content, samplerTransform(content, refracted));
        vec4 cyan = sample(content, samplerTransform(content, refracted - dispersion * (1.0 / 3.0)));
        vec4 blue = sample(content, samplerTransform(content, refracted - dispersion * (2.0 / 3.0)));
        vec4 purple = sample(content, samplerTransform(content, refracted - dispersion));
        return vec4((red.r + orange.r + yellow.r) / 3.5 + purple.r / 7.0,
                    orange.g / 7.0 + (yellow.g + green.g + cyan.g) / 3.5,
                    (cyan.b + blue.b + purple.b) / 3.0,
                    (red.a + orange.a + yellow.a + green.a + cyan.a + blue.a + purple.a) / 7.0);
    }
    """
    static func prepare(_ image: CIImage, parameters: HailuoLensParameters, scale: CGFloat) -> CIImage {
        var result = image
        if parameters.vibrancy {
            // Same saturation matrix as Backdrop's vibrancy(), not a platform blur preset.
            result = result.applyingFilter("CIColorMatrix", parameters: [
                "inputRVector": CIVector(x: 1.3935, y: -0.3575, z: -0.036, w: 0),
                "inputGVector": CIVector(x: -0.1065, y: 1.1425, z: -0.036, w: 0),
                "inputBVector": CIVector(x: -0.1065, y: -0.3575, z: 1.464, w: 0)
            ])
        }
        if parameters.blurRadius > 0 {
            result = result.applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: parameters.blurRadius * scale])
        }
        return result
    }
    static func lens(_ image: CIImage, rect: CGRect, height: CGFloat, amount: CGFloat) -> CIImage {
        guard height > 0, amount > 0, !rect.isEmpty, let kernel else { return image.cropped(to: rect) }
        return kernel.apply(extent: rect, roiCallback: { _, area in area.insetBy(dx: -2 * amount, dy: -2 * amount) },
                            arguments: [CISampler(image: image), CIVector(cgRect: rect), height, amount]) ?? image.cropped(to: rect)
    }
    static func tabArtwork(_ values: HailuoTabArtwork, size: CGSize, scale: CGFloat) -> CGImage? {
        guard size.width > 0, size.height > 0 else { return nil }
        let points = CGSize(width: size.width / scale, height: size.height / scale)
        let format = UIGraphicsImageRendererFormat()
        format.scale = scale
        let cell = (points.width - 8) / 3
        let labels = ["消息", "联系人", "我"]
        let icons = ["tab_chat", "tab_people", "tab_settings"]
        return UIGraphicsImageRenderer(size: points, format: format).image { context in
            // This is Android's invisible recording row, not the visible sharp row.
            // Record its panel offset/overall press scale before the per-tab 1.2 scale.
            context.cgContext.translateBy(x: values.panelOffset + points.width / 2, y: points.height / 2)
            let panelScale = 1 + CGFloat(min(1, max(0, values.press))) * 16 / points.width
            context.cgContext.scaleBy(x: panelScale, y: panelScale)
            context.cgContext.translateBy(x: -points.width / 2, y: -points.height / 2)
            for index in 0..<3 {
                let visual = values.rightToLeft ? 2 - index : index
                let x = 4 + (CGFloat(visual) + 0.5) * cell
                let selected = values.selection == index
                let color = selected ? values.preview ? UIColor(red: 46 / 255, green: 125 / 255, blue: 50 / 255, alpha: 1)
                    : UIColor(red: 39 / 255, green: 136 / 255, blue: 52 / 255, alpha: 1)
                    : values.preview ? UIColor(red: 92 / 255, green: 112 / 255, blue: 104 / 255, alpha: 1)
                    : UIColor(red: 138 / 255, green: 152 / 255, blue: 144 / 255, alpha: 1)
                let font = UIFont.systemFont(ofSize: 11, weight: !values.preview && selected ? .semibold : .regular)
                let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color]
                let label = labels[index] as NSString
                let labelSize = label.size(withAttributes: attributes)
                let slot: CGFloat = values.preview ? 22 : 27
                let y = (points.height - slot - labelSize.height) / 2
                let icon: CGFloat = values.preview ? 22 : 24
                context.cgContext.saveGState()
                if values.press > 0 {
                    context.cgContext.translateBy(x: x, y: points.height / 2)
                    let scale = 1 + 0.2 * CGFloat(min(1, max(0, values.press)))
                    context.cgContext.scaleBy(x: scale, y: scale)
                    context.cgContext.translateBy(x: -x, y: -points.height / 2)
                }
                UIImage(named: icons[index])?.withTintColor(color, renderingMode: .alwaysOriginal)
                    .draw(in: CGRect(x: x - icon / 2, y: y + (slot - icon) / 2 + (values.preview ? 0 : 3), width: icon, height: icon))
                label.draw(at: CGPoint(x: x - labelSize.width / 2, y: y + slot), withAttributes: attributes)
                if index == 0, values.unread > 0 {
                    let badge = (values.unread > 99 ? "99+" : "\(values.unread)") as NSString
                    let badgeAttributes: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 9, weight: .bold), .foregroundColor: UIColor.white]
                    let badgeSize = badge.size(withAttributes: badgeAttributes)
                    let rect = CGRect(x: x + 22 + 3 - max(16, badgeSize.width + 8), y: y + 5, width: max(16, badgeSize.width + 8), height: 16)
                    UIColor(red: 1, green: 90 / 255, blue: 95 / 255, alpha: 1).setFill()
                    UIBezierPath(roundedRect: rect, cornerRadius: 9).fill()
                    badge.draw(at: CGPoint(x: rect.midX - badgeSize.width / 2, y: rect.midY - badgeSize.height / 2), withAttributes: badgeAttributes)
                }
                context.cgContext.restoreGState()
            }
        }.cgImage
    }
}
