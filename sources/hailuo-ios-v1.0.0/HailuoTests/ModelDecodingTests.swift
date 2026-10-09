import XCTest
import UIKit
import CoreImage
import SwiftUI
@testable import Hailuo

final class ModelDecodingTests: XCTestCase {
    @MainActor
    func testScaledLensSamplesInLocalCoordinatesWithoutScalingEffectTwice() {
        let capture = CGRect(x: 37, y: 90, width: 390, height: 156)
        let localSize = CGSize(width: 300, height: 112)
        let transform = HailuoLensRenderer.surfaceTransform(size: localSize, captureRect: capture)
        let origin = capture.origin.applying(transform)
        let end = CGPoint(x: capture.maxX, y: capture.maxY).applying(transform)
        XCTAssertEqual(origin.x, 0, accuracy: 0.000_001)
        XCTAssertEqual(origin.y, 0, accuracy: 0.000_001)
        XCTAssertEqual(end.x, localSize.width, accuracy: 0.000_001)
        XCTAssertEqual(end.y, localSize.height, accuracy: 0.000_001)
        let restored = CGPoint(x: 123, y: 51).applying(transform.inverted()).applying(transform)
        XCTAssertEqual(restored.x, 123, accuracy: 0.000_001)
        XCTAssertEqual(restored.y, 51, accuracy: 0.000_001)
    }

    func testNavigationSpringsUseFrameIndependentAndroidPhysics() {
        for damping in [1.0, 0.6, 0.7, 0.5] {
            var fast = HailuoTabSpring(0, stiffness: 250, dampingRatio: damping)
            var slow = fast
            fast.target = 1; slow.target = 1
            for _ in 0..<24 { fast.advance(1.0 / 120) }
            for _ in 0..<6 { slow.advance(1.0 / 30) }
            XCTAssertEqual(fast.value, slow.value, accuracy: 0.000_001)
            XCTAssertEqual(fast.velocity, slow.velocity, accuracy: 0.000_001)
            for _ in 0..<240 { fast.advance(1.0 / 60) }
            XCTAssertTrue(fast.settled)
            XCTAssertEqual(fast.value, 1)
            let previous = fast
            fast.advance(.nan); fast.advance(-1); fast.advance(0)
            XCTAssertEqual(fast, previous)
        }
    }

    @MainActor
    func testNavigationMotionSettlesAndStopsItsClockWhenDisabled() {
        let motion = HailuoTabMotion()
        motion.configure(index: 0, enabled: true)
        motion.select(2)
        XCTAssertEqual(motion.targetIndex, 2)
        XCTAssertTrue(motion.isAnimating)
        for _ in 0..<240 { motion.advance(1.0 / 60) }
        XCTAssertFalse(motion.isAnimating)
        XCTAssertEqual(motion.frame.index, 2)
        XCTAssertEqual(motion.frame.press, 0)
        XCTAssertEqual(motion.frame.scaleX, 1)
        XCTAssertEqual(motion.frame.scaleY, 1)
        motion.touch(true)
        motion.drag(index: 0.5, translation: -80)
        motion.advance(1.0 / 60)
        XCTAssertGreaterThan(motion.frame.press, 0)
        XCTAssertLessThan(motion.frame.panel, 0)
        motion.configure(index: 1, enabled: false) // Background/reduce-motion/disappearance.
        XCTAssertFalse(motion.isAnimating)
        XCTAssertEqual(motion.frame, HailuoTabMotionFrame(index: 1))
        XCTAssertEqual(HailuoTabMotion.easeOut(0), 0, accuracy: 0.000_001)
        XCTAssertEqual(HailuoTabMotion.easeOut(1), 1, accuracy: 0.000_001)
        XCTAssertGreaterThan(HailuoTabMotion.easeOut(0.5), 0.5)
    }

    @MainActor
    func testCapsuleHighlightIsDirectionalAndInnerShadowIsTopWeighted() throws {
        _ = try XCTUnwrap(HailuoLensRenderer.decorationKernel)
        let rect = CGRect(x: 0, y: 0, width: 180, height: 64)
        func alpha(_ image: CIImage, x: CGFloat, y: CGFloat) -> UInt8 {
            var pixel = [UInt8](repeating: 0, count: 4)
            pixel.withUnsafeMutableBytes { buffer in
                HailuoLensRenderer.context.render(image, toBitmap: buffer.baseAddress!, rowBytes: 4,
                    bounds: CGRect(x: x, y: y, width: 1, height: 1), format: .RGBA8,
                    colorSpace: HailuoLensRenderer.colorSpace)
            }
            return pixel[3]
        }
        let highlight = try XCTUnwrap(HailuoLensRenderer.decoration(.highlight(1), rect: rect, scale: 1))
        XCTAssertGreaterThan(alpha(highlight, x: 9, y: 54), alpha(highlight, x: 170, y: 54))
        XCTAssertEqual(alpha(highlight, x: 90, y: 32), 0, "Highlight must remain at the rim")
        let shadow = try XCTUnwrap(HailuoLensRenderer.decoration(.innerShadow(radius: 8, alpha: 1), rect: rect, scale: 1))
        XCTAssertGreaterThan(alpha(shadow, x: 90, y: 60), alpha(shadow, x: 90, y: 3))
        XCTAssertNil(HailuoLensRenderer.decoration(.highlight(0), rect: rect, scale: 1))
        let glow = try XCTUnwrap(HailuoLensRenderer.decoration(.interactive(position: CGPoint(x: 30, y: 32), progress: 1), rect: rect, scale: 1))
        XCTAssertGreaterThan(alpha(glow, x: 30, y: 32), alpha(glow, x: 150, y: 32))
        XCTAssertNil(HailuoLensRenderer.decoration(.interactive(position: CGPoint(x: 30, y: 32), progress: 0), rect: rect, scale: 1))
    }

    @MainActor
    func testBackdropCapturesSwiftUIBehindFooterWithoutFeedbackOrFooterPixels() async throws {
        guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }) else {
            throw XCTSkip("This sampling test requires the hosted application in a foreground window scene")
        }
        let window = UIWindow(windowScene: scene)
        window.frame = CGRect(x: 0, y: 0, width: 200, height: 200)
        let background = UIHostingController(rootView: ZStack {
            Color.red
            Text("底层样本").font(.system(size: 28, weight: .bold)).foregroundColor(.white)
        }.ignoresSafeArea())
        window.rootViewController = background
        let footer = HailuoGlassFooterController()
        footer.setContent(AnyView(Color.blue), active: false)
        background.addChild(footer)
        footer.view.frame = CGRect(x: 20, y: 68, width: 160, height: 64)
        background.view.addSubview(footer.view)
        footer.didMove(toParent: background)
        let surface = HailuoLensView()
        surface.frame = footer.view.bounds
        footer.view.addSubview(surface)
        surface.backdrop = footer.backdrop
        footer.backdrop.register(surface)
        window.isHidden = false // Never make this fixture key or replace the application's real window.
        defer { footer.backdrop.stop(); window.isHidden = true; window.rootViewController = nil }
        window.layoutIfNeeded()
        try await Task.sleep(nanoseconds: 40_000_000)
        footer.backdrop.visible = true
        footer.backdrop.active = true
        footer.backdrop.refresh()
        let cgImage = try XCTUnwrap(surface.renderedImage?.cgImage)
        let width = cgImage.width, height = cgImage.height
        var pixels = [UInt8](repeating: 0, count: width * height * 4)
        pixels.withUnsafeMutableBytes { bytes in
            HailuoLensRenderer.context.render(CIImage(cgImage: cgImage), toBitmap: bytes.baseAddress!, rowBytes: width * 4,
                bounds: CGRect(x: 0, y: 0, width: width, height: height), format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
        }
        var red = 0, white = 0, blue = 0
        for index in stride(from: 0, to: pixels.count, by: 4) {
            if pixels[index] > 200 && pixels[index + 1] < 50 && pixels[index + 2] < 50 { red += 1 }
            if pixels[index] > 200 && pixels[index + 1] > 200 && pixels[index + 2] > 200 { white += 1 }
            if pixels[index] < 50 && pixels[index + 2] > 200 { blue += 1 }
        }
        XCTAssertGreaterThan(red, 10, "The real underlying page must be captured")
        XCTAssertGreaterThan(white, 10, "SwiftUI text, not just a UIKit background color, must enter the backdrop")
        XCTAssertEqual(blue, 0, "The blue footer must be excluded to prevent recursive feedback")
        XCTAssertFalse(footer.view.layer.isHidden, "Capture must restore footer visibility before committing")
        XCTAssertFalse(footer.backdrop.isSampling, "Idle glass must not keep rasterizing the window")
        footer.backdrop.requestRender()
        XCTAssertTrue(footer.backdrop.isSampling)
        footer.backdrop.refresh()
        XCTAssertFalse(footer.backdrop.isSampling, "Render only the cached backdrop, then stop again")
    }

    @MainActor
    func testOpticalBackdropClockStopsWhenBackgroundedHiddenOrDetached() {
        let backdrop = HailuoGlassBackdrop()
        let surface = HailuoLensView()
        backdrop.active = true
        backdrop.visible = true
        backdrop.register(surface)
        XCTAssertTrue(backdrop.isSampling)
        backdrop.active = false
        XCTAssertFalse(backdrop.isSampling)
        backdrop.active = true
        XCTAssertTrue(backdrop.isSampling)
        backdrop.visible = false
        XCTAssertFalse(backdrop.isSampling)
        backdrop.visible = true
        XCTAssertTrue(backdrop.isSampling)
        backdrop.unregister(surface)
        XCTAssertFalse(backdrop.isSampling)
    }

    @MainActor
    func testLiquidLensKernelCompilesAndActuallyChangesBackdropPixels() throws {
        _ = try XCTUnwrap(HailuoLensRenderer.kernel, "The optical kernel must compile on the target system; a decorative border is not a lens.")
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let fixture = UIGraphicsImageRenderer(size: CGSize(width: 180, height: 100), format: format).image { _ in
            for x in stride(from: 0, to: 180, by: 3) {
                (x % 6 == 0 ? UIColor.red : UIColor.blue).setFill()
                UIRectFill(CGRect(x: x, y: 0, width: 3, height: 100))
            }
        }
        let input = CIImage(cgImage: try XCTUnwrap(fixture.cgImage)).clampedToExtent()
        let rect = CGRect(x: 20, y: 18, width: 140, height: 64)
        let unchanged = try XCTUnwrap(HailuoLensRenderer.context.createCGImage(input, from: rect))
        let rendered = HailuoLensRenderer.lens(input, rect: rect, height: 24, amount: 24)
        let output = try XCTUnwrap(HailuoLensRenderer.context.createCGImage(rendered, from: rect))
        XCTAssertEqual(output.width, 140)
        XCTAssertEqual(output.height, 64)
        let originalPixels = try XCTUnwrap(unchanged.dataProvider?.data) as Data
        let lensPixels = try XCTUnwrap(output.dataProvider?.data) as Data
        XCTAssertNotEqual(lensPixels, originalPixels, "Real backdrop sampling must move pixels, not simply tint the rim.")
        let disabled = HailuoLensRenderer.lens(input, rect: rect, height: 0, amount: 0)
        let disabledImage = try XCTUnwrap(HailuoLensRenderer.context.createCGImage(disabled, from: rect))
        XCTAssertEqual(try XCTUnwrap(disabledImage.dataProvider?.data) as Data, originalPixels)
    }

    func testWhisperThreadFilterRejectsOtherThreadsAndDoesNotUseReplyIDAsThread() throws {
        let data = Data(#"[{"id":"r-one","whisperId":"first"},{"id":"r-two","whisper_id":"second"},{"id":"first"},{"id":"r-three","whisperId":"first"}]"#.utf8)
        let replies = try JSONDecoder().decode([WhisperReply].self, from: data)
        XCTAssertEqual(WhisperService.repliesForWhisper(replies, whisperID: "first").map(\.id), ["r-one", "r-three"])
        XCTAssertEqual(WhisperService.repliesForWhisper(replies, whisperID: "second").map(\.id), ["r-two"])
        XCTAssertTrue(WhisperService.repliesForWhisper(replies, whisperID: "").isEmpty)
        XCTAssertTrue(WhisperService.repliesForWhisper(replies, whisperID: "unknown").isEmpty)
    }

    func testWhisperInputLimitMatchesAndroidAndJavaUTF16WithoutCuttingUnicode() {
        XCTAssertTrue(WhisperInputRules.accepts(""))
        XCTAssertTrue(WhisperInputRules.accepts(String(repeating: "海", count: 500)))
        XCTAssertFalse(WhisperInputRules.accepts(String(repeating: "海", count: 501)))
        XCTAssertTrue(WhisperInputRules.accepts(String(repeating: "🐚", count: 250)))
        XCTAssertFalse(WhisperInputRules.accepts(String(repeating: "🐚", count: 251)))
        let family = "👨‍👩‍👧‍👦"
        XCTAssertEqual(family.count, 1)
        XCTAssertEqual(family.utf16.count, 11)
        XCTAssertTrue(WhisperInputRules.accepts(String(repeating: family, count: 45)))
        XCTAssertFalse(WhisperInputRules.accepts(String(repeating: family, count: 46)))
    }

    func testModalWidthPreservesAndroidShellVariants() {
        XCTAssertEqual(HailuoModalMetrics.width(available: 390, layout: .standard), 366.6, accuracy: 0.001)
        XCTAssertEqual(HailuoModalMetrics.width(available: 1024, layout: .standard), 460)
        XCTAssertEqual(HailuoModalMetrics.width(available: 390, layout: .chat), 358)
        XCTAssertEqual(HailuoModalMetrics.width(available: 390, layout: .location), 390)
        XCTAssertEqual(HailuoModalMetrics.width(available: 390, layout: .friendGift), 390)
        XCTAssertEqual(HailuoModalMetrics.width(available: 390, layout: .friendMenu), 366)
        XCTAssertEqual(HailuoModalMetrics.width(available: 390, layout: .settingsPrompt), 358)
        XCTAssertEqual(HailuoModalLayout.settingsPrompt.radius, 16)
        XCTAssertEqual(HailuoModalLayout.settingsPrompt.padding, 20)
        XCTAssertEqual(HailuoModalLayout.chat.radius, 16)
        XCTAssertEqual(HailuoModalLayout.chat.padding, 16)
        XCTAssertEqual(HailuoModalLayout.standard.radius, 20)
        XCTAssertEqual(HailuoModalLayout.standard.padding, 20)
    }

    func testModalFittingShrinksSuccessAndClampsLongContentToKeyboardViewport() {
        let limit = HailuoModalMetrics.contentLimit(requested: .greatestFiniteMagnitude, available: 700, padding: 20)
        XCTAssertEqual(limit, 636)
        XCTAssertEqual(HailuoModalMetrics.fittedHeight(measured: 520, limit: limit), 520)
        XCTAssertEqual(HailuoModalMetrics.fittedHeight(measured: 120.2, limit: limit), 121)
        let keyboardLimit = HailuoModalMetrics.contentLimit(requested: .greatestFiniteMagnitude, available: 230, padding: 20)
        XCTAssertEqual(keyboardLimit, 166)
        XCTAssertEqual(HailuoModalMetrics.fittedHeight(measured: 520, limit: keyboardLimit), 166)
        XCTAssertEqual(HailuoModalMetrics.contentLimit(requested: 140, available: 700, padding: 16), 140)
    }

    func testModalMetricsRejectInvalidOrUnavailableGeometry() {
        for invalid in [CGFloat.nan, .infinity, -.infinity, -1, 0] {
            XCTAssertEqual(HailuoModalMetrics.width(available: invalid, layout: .chat), 1)
            XCTAssertEqual(HailuoModalMetrics.fittedHeight(measured: invalid, limit: 500), 1)
        }
        XCTAssertEqual(HailuoModalMetrics.contentLimit(requested: 500, available: 20, padding: 20), 1)
        XCTAssertEqual(HailuoModalMetrics.contentLimit(requested: .nan, available: 230, padding: 20), 166)
    }

    func testUnreadWhisperRepliesMatchBadgeWithoutHidingFutureThreadReplies() throws {
        let data = Data(#"[{"id":"old","whisperId":"thread","senderUid":2},{"id":"new","whisperId":"thread","senderUid":2},{"id":"new","whisperId":"thread","senderUid":2},{"id":"own","whisperId":"thread","senderUid":1},{"id":"server-read","senderUid":2,"isRead":true}]"#.utf8)
        let replies = try JSONDecoder().decode([WhisperReply].self, from: data)
        let unread = WhisperLocalReadState.unreadReplies(replies, readKeys: ["old", "w:thread"], currentUserID: "1")
        XCTAssertEqual(unread.map(\.id), ["new"])
        let otherAccount = WhisperLocalReadState.unreadReplies(replies, readKeys: [], currentUserID: "1")
        XCTAssertEqual(otherAccount.map(\.id), ["old", "new"])
    }

    func testUnreadWhisperFallbackMarkersApplyToOneReplyOnly() throws {
        let data = Data(#"[{"whisperId":"thread","createdAt":"2026-10-08T12:00:00Z","content":"first"},{"whisperId":"thread","createdAt":"2026-10-08T12:01:00Z","content":"second"}]"#.utf8)
        let replies = try JSONDecoder().decode([WhisperReply].self, from: data)
        let firstKeys = WhisperLocalReadState.keys(for: replies[0])
        XCTAssertTrue(firstKeys.isDisjoint(with: WhisperLocalReadState.keys(for: replies[1])))
        XCTAssertEqual(WhisperLocalReadState.unreadReplies(replies, readKeys: firstKeys, currentUserID: nil).map(\.content), ["second"])
    }

    func testAccountCacheFilenamesDoNotShareDataOrContainPathSeparators() {
        let first = DiskStore.accountFilename("friends.json", ownerID: "account/one")
        let second = DiskStore.accountFilename("friends.json", ownerID: "account/two")
        XCTAssertNotEqual(first, second)
        XCTAssertFalse(first.contains("/"))
        XCTAssertFalse(first.contains("\\"))
        XCTAssertTrue(first.hasSuffix("_friends.json"))
    }

    func testPaymentAmountsUseWholeCentsAndRejectUnsafeValues() {
        XCTAssertEqual(PaymentSelection.minorUnits(9.9), 990)
        XCTAssertTrue(PaymentSelection.sameAmount(9.9, 9.9000000003))
        XCTAssertFalse(PaymentSelection.sameAmount(9.9, 9.91))
        for value in [Double.nan, .infinity, -.infinity, -1, 0, 0.001, 9.901, 1_000_001] {
            XCTAssertNil(PaymentSelection.minorUnits(value))
            XCTAssertFalse(PaymentSelection.sameAmount(value, value))
        }
        XCTAssertEqual(PaymentSelection.vip(id: "vip_month", title: "月度会员", amount: 9.9).id, "vip-vip_month")
        XCTAssertEqual(PaymentSelection.shells(tier: 10, count: 20).amount, 10)
    }
    func testMessageOutboxSurvivesCacheRoundTripWithoutChangingRetryKey() throws {
        let original = ChatMessage(id: "local-retry-key", fromMe: true, type: "text", content: "未发送的消息",
                                   quoteMsgId: "quoted", quoteContent: "引用原文", deliveryState: .failed, clientMessageId: "local-retry-key")
        let cached = try JSONDecoder().decode(ChatMessage.self, from: JSONEncoder().encode(original))
        XCTAssertEqual(cached, original)
        XCTAssertTrue(cached.isLocalOutbox)
        XCTAssertEqual(cached.deliveryState, .failed)
        let old = try decoder().decode(ChatMessage.self, from: Data(#"{"id":"server-message","content":"hello"}"#.utf8))
        XCTAssertEqual(old.deliveryState, .sent)
        XCTAssertFalse(old.isLocalOutbox)
    }

    func testMessageCachePreservesIrreversibleStatesDuringReplacement() {
        let existing = [ChatMessage(id: "destroyed", isDestroyed: true),
                        ChatMessage(id: "recalled", recalled: true),
                        ChatMessage(id: "alias-recalled", isRecalled: true), ChatMessage(id: "old")]
        let incoming = [ChatMessage(id: "destroyed"), ChatMessage(id: "recalled"), ChatMessage(id: "alias-recalled")]
        let result = MessageCacheMerger.merge(existing: existing, incoming: incoming, deleted: [], replacing: true)
        XCTAssertEqual(Set(result.map(\.id)), ["destroyed", "recalled", "alias-recalled"])
        XCTAssertTrue(result.allSatisfy(\.unavailable))
    }

    func testMessageCacheDropsAcknowledgedOutboxWithoutChangingOtherRetryKeys() {
        let pending = ChatMessage(id: "local-1", fromMe: true, deliveryState: .failed, clientMessageId: "local-1")
        let unrelated = ChatMessage(id: "local-2", fromMe: true, deliveryState: .failed, clientMessageId: "local-2")
        let confirmed = ChatMessage(id: "server-1", fromMe: true, clientMessageId: "local-1")
        let result = MessageCacheMerger.merge(existing: [pending, unrelated], incoming: [confirmed], deleted: [])
        XCTAssertEqual(Set(result.map(\.id)), ["server-1", "local-2"])
        XCTAssertEqual(result.first(where: { $0.id == "local-2" })?.clientMessageId, "local-2")
    }

    func testMessageCacheDeletionAppliesToServerAndClientIDs() {
        let result = MessageCacheMerger.merge(existing: [ChatMessage(id: "deleted")],
            incoming: [ChatMessage(id: "server-ack", clientMessageId: "local-deleted"), ChatMessage(id: "keep")],
            deleted: ["deleted", "local-deleted"])
        XCTAssertEqual(result.map(\.id), ["keep"])
    }

    func testMessageCacheDeduplicatesWithoutRestoringDestroyedDuplicate() {
        let result = MessageCacheMerger.merge(existing: [], incoming: [ChatMessage(id: ""),
            ChatMessage(id: "b", createdAt: "2026-10-08", isDestroyed: true),
            ChatMessage(id: "b", createdAt: "2026-10-08"), ChatMessage(id: "a", createdAt: "2026-10-08")], deleted: [])
        XCTAssertEqual(result.map(\.id), ["a", "b"])
        XCTAssertTrue(result[1].isDestroyed)
        let cachedDuplicates = MessageCacheMerger.merge(existing: [ChatMessage(id: "old", recalled: true), ChatMessage(id: "old")],
                                                        incoming: [ChatMessage(id: "old")], deleted: [])
        XCTAssertTrue(cachedDuplicates[0].recalled)
    }

    func testClearedMessageCacheRejectsLateSyncAndSeparatesAccounts() async throws {
        let disk = DiskStore()
        let owner = "cache-test-\(UUID().uuidString)", other = "cache-other-\(UUID().uuidString)"
        let friend = "peer", oldRevision = await disk.messageCacheRevision(ownerID: owner, friendID: friend)
        try await disk.mergeMessageCache([ChatMessage(id: "first")], ownerID: owner, friendID: friend, expectedRevision: oldRevision)
        let otherMessages = await disk.cachedMessages(ownerID: other, friendID: friend)
        XCTAssertTrue(otherMessages.isEmpty)
        await disk.clearMessageCache(ownerID: owner, friendID: friend)
        do {
            try await disk.mergeMessageCache([ChatMessage(id: "late")], ownerID: owner, friendID: friend, expectedRevision: oldRevision)
            XCTFail("An old sync response must not recreate cleared history")
        } catch is CancellationError {
            // Expected: only requests started after clear may populate this cache.
        }
        let cleared = await disk.cachedMessages(ownerID: owner, friendID: friend)
        XCTAssertTrue(cleared.isEmpty)
        let currentRevision = await disk.messageCacheRevision(ownerID: owner, friendID: friend)
        try await disk.mergeMessageCache([ChatMessage(id: "new")], ownerID: owner, friendID: friend, expectedRevision: currentRevision)
        try await disk.deleteCachedMessages(["new"], ownerID: owner, friendID: friend)
        try await disk.mergeMessageCache([ChatMessage(id: "new")], ownerID: owner, friendID: friend)
        let deleted = await disk.cachedMessages(ownerID: owner, friendID: friend)
        XCTAssertTrue(deleted.isEmpty)
        await disk.clearMessageCache(ownerID: owner, friendID: friend)
    }

    func testSkinCacheWithoutRemoteURLStillDecodes() throws {
        let data = Data(#"{"name":"custom","customImageData":"AQID","opacity":0.4}"#.utf8)
        let value = try JSONDecoder().decode(SkinConfiguration.self, from: data)
        XCTAssertEqual(value.name, "custom")
        XCTAssertEqual(value.customImageData, Data([1, 2, 3]))
        XCTAssertNil(value.customImageURL)
        let withURL = SkinConfiguration(name: "custom", customImageData: value.customImageData, customImageURL: "https://example.invalid/bg.jpg", opacity: 0.4)
        XCTAssertEqual(try JSONDecoder().decode(SkinConfiguration.self, from: JSONEncoder().encode(withURL)), withURL)
    }

    @MainActor func testAvatarExportIsSquareAndBounded() throws {
        let format = UIGraphicsImageRendererFormat(); format.scale = 1
        let source = UIGraphicsImageRenderer(size: CGSize(width: 600, height: 300), format: format).image { _ in
            UIColor.green.setFill(); UIRectFill(CGRect(x: 0, y: 0, width: 600, height: 300))
        }
        let bytes = try XCTUnwrap(ImageDataProcessor.avatarJPEG(source))
        let output = try XCTUnwrap(UIImage(data: bytes))
        XCTAssertEqual(output.size.width, 512)
        XCTAssertEqual(output.size.height, 512)
        XCTAssertLessThanOrEqual(bytes.count, 700 * 1024)
    }

    func testServerDateParserAcceptsFractionalZuluTimestamp() {
        XCTAssertNotNil(ServerDateParser.parse("2026-08-21T19:13:48.321Z"))
        XCTAssertNotNil(ServerDateParser.parse("2026-08-21T19:13:48Z"))
        XCTAssertNotNil(ServerDateParser.parse("2026-08-21 19:13:48"))
        XCTAssertNotNil(ServerDateParser.parse("2026-08-21T19:13:48+08:00"))
        XCTAssertNotNil(ServerDateParser.parse("2026-08-21"))
    }
    private func decoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }

    func testProfileAcceptsAndroidAliases() throws {
        let data = Data(#"{"id":"profile-uuid","phone":"13800138000","name":"海螺用户","vip_flag":1,"vip_expire_at":"2027-01-01","shell_count":"18"}"#.utf8)
        let value = try decoder().decode(Profile.self, from: data)
        XCTAssertEqual(value.id, "profile-uuid")
        XCTAssertNil(value.userId)
        XCTAssertEqual(value.phoneNumber, "13800138000")
        XCTAssertEqual(value.displayName, "海螺用户")
        XCTAssertTrue(value.isVip)
        XCTAssertEqual(value.shells, 18)
    }

    func testProfileKeepsDatabaseUUIDSeparateFromPublicID() throws {
        let data = Data(#"{"id":"7354fb51-1d80-4347-b47e-8ed07cf002eb","userId":10000001}"#.utf8)
        let value = try decoder().decode(Profile.self, from: data)
        XCTAssertEqual(value.id, "7354fb51-1d80-4347-b47e-8ed07cf002eb")
        XCTAssertEqual(value.userId, "10000001")
        let cached = try JSONDecoder().decode(Profile.self, from: JSONEncoder().encode(value))
        XCTAssertEqual(cached.id, value.id)
        XCTAssertEqual(cached.userId, value.userId)
    }

    func testLegacyProfileCacheMigratesUUIDAndNumericIDStillWorks() throws {
        let cache = Data(#"{"__local_id":"","userId":"7354fb51-1d80-4347-b47e-8ed07cf002eb"}"#.utf8)
        let value = try decoder().decode(Profile.self, from: cache)
        XCTAssertEqual(value.id, "7354fb51-1d80-4347-b47e-8ed07cf002eb")
        XCTAssertNil(value.userId)
        let numeric = try decoder().decode(Profile.self, from: Data(#"{"id":10000001}"#.utf8))
        XCTAssertEqual(numeric.userId, "10000001")
    }

    func testReadableMessageTimeUsesLocalCalendarAndYesterday() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(secondsFromGMT: 8 * 3600))
        let now = try XCTUnwrap(ServerDateParser.parse("2026-10-07T11:30:00Z"))
        XCTAssertEqual(HailuoDateText.short("2026-10-07T03:30:00.123456Z", now: now, calendar: calendar), "11:30")
        XCTAssertEqual(HailuoDateText.short("2026-10-06T03:30:00Z", now: now, calendar: calendar), "昨天 11:30")
        XCTAssertEqual(HailuoDateText.short("invalid", now: now, calendar: calendar), "")
    }

    func testCheckinStatusAcceptsAllServerNames() throws {
        let data = Data(#"{"checkedIn":true,"consecutive":7,"rewardShells":3,"next":4}"#.utf8)
        let value = try decoder().decode(CheckinStatus.self, from: data)
        XCTAssertTrue(value.checkedToday)
        XCTAssertEqual(value.consecutiveDays, 7)
        XCTAssertEqual(value.reward, 3)
        XCTAssertEqual(value.nextReward, 4)
    }

    func testVIPStatusMapsVipExpire() throws {
        let data = Data(#"{"is_vip":true,"vip_expire":"2027-08-01","source":"shell"}"#.utf8)
        let value = try decoder().decode(VipStatus.self, from: data)
        XCTAssertTrue(value.isVip)
        XCTAssertEqual(value.expireDate, "2027-08-01")
        XCTAssertEqual(value.source, "shell")
    }

    func testMessageSyncPolicyAcceptsAndroidFieldNames() throws {
        let data = Data(#"{"normalDays":14,"vipMonths":3}"#.utf8)
        let value = try decoder().decode(MessageSyncPolicy.self, from: data)
        XCTAssertEqual(value.normalDays, 14)
        XCTAssertEqual(value.vipMonths, 3)
    }

    func testPaymentCatalogUsesServerDrivenOffers() throws {
        let data = Data(#"{"enabled":true,"channels":["wechat","alipay"],"currency":"CNY","vip":[{"id":"vip_month","name":"月卡","rmb":9.9,"days":30,"giftShells":5}],"shell":[{"id":"shell_10","rmb":10,"shells":20,"giftVip":false}],"message":"购买开放"}"#.utf8)
        let value = try decoder().decode(PaymentCatalog.self, from: data)
        XCTAssertTrue(value.enabled)
        XCTAssertEqual(value.channels, ["wechat", "alipay"])
        XCTAssertEqual(value.vip.first?.id, "vip_month")
        XCTAssertEqual(value.vip.first?.rmb, 9.9)
        XCTAssertEqual(value.vip.first?.giftShells, 5)
        XCTAssertEqual(value.shell.first?.shells, 20)
    }

    func testPaymentOrderAcceptsAndroidResponseKeys() throws {
        let data = Data(#"{"orderId":"order-1","status":"pending","amount":10,"channel":"wechat","delivered":false,"expiresAt":"2026-10-01T00:00:00Z","paymentData":{"url":"weixin://pay"}}"#.utf8)
        let value = try decoder().decode(PaymentOrder.self, from: data)
        XCTAssertEqual(value.orderId, "order-1")
        XCTAssertEqual(value.amount, 10)
        XCTAssertEqual(value.paymentData?["url"], "weixin://pay")
    }

    func testConversationAcceptsFriendTimeAliases() throws {
        let data = Data(#"{"friendId":"peer","peer_avatar":"/a.png","is_friend":true,"my_sent":20,"peer_sent":21,"friendCreatedAt":"2026-08-01"}"#.utf8)
        let value = try decoder().decode(Conversation.self, from: data)
        XCTAssertEqual(value.friendId, "peer")
        XCTAssertEqual(value.peerAvatar, "/a.png")
        XCTAssertTrue(value.isFriend)
        XCTAssertEqual(value.mySent, 20)
        XCTAssertEqual(value.friendAddTime, "2026-08-01")
    }

    func testFriendAndBroadcastLegacyAliases() throws {
        let friendData = Data(#"{"id":"peer","head_img":"/avatar.jpg","gmtCreate":"2026-08-02","is_trusted":true}"#.utf8)
        let friend = try decoder().decode(Friend.self, from: friendData)
        XCTAssertEqual(friend.avatar, "/avatar.jpg")
        XCTAssertEqual(friend.createdAt, "2026-08-02")
        XCTAssertTrue(friend.isTrusted)

        let broadcastData = Data(#"{"id":"notice","body":"安全提醒","admin_name":"管理员","memo":"附言","sentAt":"2026-08-03"}"#.utf8)
        let broadcast = try decoder().decode(Broadcast.self, from: broadcastData)
        XCTAssertEqual(broadcast.content, "安全提醒")
        XCTAssertEqual(broadcast.senderName, "管理员")
        XCTAssertEqual(broadcast.note, "附言")
        XCTAssertEqual(broadcast.createdAt, "2026-08-03")
    }

    func testChatDefaultsAndLegacyMessageType() throws {
        let data = Data(#"{"list":[{"id":"m1","msg_type":"image","content":"/image.jpg"}],"my_sent":20}"#.utf8)
        let value = try decoder().decode(MessagesResponse.self, from: data)
        XCTAssertEqual(value.list.first?.type, "image")
        XCTAssertFalse(value.list.first?.fromMe ?? true)
        XCTAssertEqual(value.mySent, 20)
        XCTAssertFalse(value.hasMore)
        XCTAssertFalse(value.legacyHistoryHidden)
    }

    func testAdminAndTransactionAliasesUseAndroidDefaults() throws {
        let userData = Data(#"{"id":"uuid","phone":"13800138000","vip_flag":1,"shells":12}"#.utf8)
        let user = try decoder().decode(AdminUser.self, from: userData)
        XCTAssertEqual(user.phoneNumber, "13800138000")
        XCTAssertTrue(user.isVip)
        XCTAssertFalse(user.isBanned)

        let txData = Data(#"{"id":"tx","transaction_type":"chat_image_view","relatedNickname":"对方","amount":-1}"#.utf8)
        let tx = try decoder().decode(ShellTransaction.self, from: txData)
        XCTAssertEqual(tx.transactionType, "chat_image_view")
        XCTAssertEqual(tx.relatedUserName, "对方")
        XCTAssertEqual(tx.amount, -1)
    }

    func testPartialAdminStatsDoesNotFailDecoding() throws {
        let data = Data(#"{"totalUsers":99,"today_active_users":7}"#.utf8)
        let value = try decoder().decode(AdminStats.self, from: data)
        XCTAssertEqual(value.totalUsers, 99)
        XCTAssertEqual(value.todayActiveUsers, 7)
        XCTAssertEqual(value.vipUsers, 0)
    }

    func testAdminBroadcastAcceptsAndroidLegacyAliases() throws {
        let data = Data(#"{"id":"broadcast","body":"系统通知","created_at_time":"2026-08-20 12:00:00"}"#.utf8)
        let value = try decoder().decode(AdminBroadcast.self, from: data)
        XCTAssertEqual(value.content, "系统通知")
        XCTAssertEqual(value.createdAt, "2026-08-20 12:00:00")
    }

    func testNavigationGlassParametersStayInSupportedRange() throws {
        var appearance = NavigationGlassConfiguration()
        appearance.highlightStrength = -1
        appearance.chromaticStrength = .infinity
        appearance.blurRadius = 100
        let safe = appearance.normalized
        XCTAssertEqual(safe.highlightStrength, 0)
        XCTAssertEqual(safe.chromaticStrength, 1)
        XCTAssertEqual(safe.blurRadius, 16)
        let data = try JSONEncoder().encode(safe)
        XCTAssertEqual(try JSONDecoder().decode(NavigationGlassConfiguration.self, from: data), safe)
    }

    func testJSONValueRoundTrip() throws {
        let original = JSONValue.object(["enabled": .bool(true), "count": .int(3), "items": .array([.string("a"), .null])])
        let data = try JSONEncoder().encode(original)
        XCTAssertEqual(try JSONDecoder().decode(JSONValue.self, from: data), original)
    }
}
