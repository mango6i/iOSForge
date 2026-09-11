import CoreGraphics
import Foundation

struct NormalizedPoint: Codable, Equatable, Hashable {
    var x: Double
    var y: Double

    init(x: Double, y: Double) {
        self.x = min(max(x, 0), 1)
        self.y = min(max(y, 0), 1)
    }

    func cgPoint(in size: CGSize) -> CGPoint {
        CGPoint(x: CGFloat(x) * size.width, y: CGFloat(y) * size.height)
    }
}

enum AutomationActionKind: String, Codable, CaseIterable {
    case tap
    case swipe

    var title: String { self == .tap ? "点击" : "滑动" }
    var symbol: String { self == .tap ? "hand.tap.fill" : "arrow.up.right" }
}

enum IntervalUnit: String, Codable, CaseIterable {
    case milliseconds
    case seconds
    case minutes

    var title: String {
        switch self {
        case .milliseconds: return "毫秒"
        case .seconds: return "秒"
        case .minutes: return "分钟"
        }
    }

    var multiplier: Int {
        switch self {
        case .milliseconds: return 1
        case .seconds: return 1_000
        case .minutes: return 60_000
        }
    }

    var allowedValues: ClosedRange<Int> {
        switch self {
        case .milliseconds: return 40...60_000
        case .seconds: return 1...3_600
        case .minutes: return 1...60
        }
    }

    var step: Int { self == .milliseconds ? 10 : 1 }
}

struct AutomationAction: Identifiable, Codable, Equatable {
    var id: UUID
    var kind: AutomationActionKind
    var start: NormalizedPoint
    var end: NormalizedPoint
    var intervalMilliseconds: Int
    var intervalUnit: IntervalUnit
    var durationMilliseconds: Int
    var repeatCount: Int

    init(
        id: UUID = UUID(),
        kind: AutomationActionKind = .tap,
        start: NormalizedPoint,
        end: NormalizedPoint? = nil,
        intervalMilliseconds: Int = 500,
        intervalUnit: IntervalUnit = .milliseconds,
        durationMilliseconds: Int = 60,
        repeatCount: Int = 1
    ) {
        self.id = id
        self.kind = kind
        self.start = start
        self.end = end ?? start
        self.intervalMilliseconds = min(max(intervalMilliseconds, 40), 3_600_000)
        self.intervalUnit = intervalUnit
        self.durationMilliseconds = min(max(durationMilliseconds, 40), 10_000)
        self.repeatCount = min(max(repeatCount, 1), 999)
    }

    var intervalDisplayValue: Int {
        max(intervalUnit.allowedValues.lowerBound, intervalMilliseconds / intervalUnit.multiplier)
    }

    mutating func setIntervalDisplayValue(_ value: Int) {
        let clamped = min(max(value, intervalUnit.allowedValues.lowerBound), intervalUnit.allowedValues.upperBound)
        intervalMilliseconds = min(max(clamped * intervalUnit.multiplier, 40), 3_600_000)
    }

    mutating func changeIntervalUnit(to newUnit: IntervalUnit) {
        intervalUnit = newUnit
        let rounded = Int((Double(intervalMilliseconds) / Double(newUnit.multiplier)).rounded())
        setIntervalDisplayValue(rounded)
    }
}

enum AutomationMode: String, Codable, CaseIterable {
    case single
    case multiple

    var title: String { self == .single ? "单点击" : "多点击" }
    var subtitle: String { self == .single ? "只循环当前目标" : "按编号顺序执行全部目标" }
}

enum TargetOrientation: String, Codable, CaseIterable {
    case portrait
    case landscape

    var title: String { self == .portrait ? "竖屏" : "横屏" }
    var aspectRatio: CGFloat { self == .portrait ? 390.0 / 844.0 : 844.0 / 390.0 }
}

struct AutomationProfile: Identifiable, Codable, Equatable {
    var id: UUID
    var name: String
    var mode: AutomationMode
    var orientation: TargetOrientation
    var actions: [AutomationAction]
    var cycleCount: Int
    var startDelaySeconds: Int
    var safetyTimeoutSeconds: Int
    var timingJitterPercent: Int
    var positionJitterPoints: Double
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        mode: AutomationMode = .single,
        orientation: TargetOrientation = .portrait,
        actions: [AutomationAction] = [],
        cycleCount: Int = 0,
        startDelaySeconds: Int = 3,
        safetyTimeoutSeconds: Int = 600,
        timingJitterPercent: Int = 0,
        positionJitterPoints: Double = 0,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.mode = mode
        self.orientation = orientation
        self.actions = actions
        self.cycleCount = min(max(cycleCount, 0), 999_999)
        self.startDelaySeconds = min(max(startDelaySeconds, 1), 15)
        self.safetyTimeoutSeconds = min(max(safetyTimeoutSeconds, 10), 3_600)
        self.timingJitterPercent = min(max(timingJitterPercent, 0), 30)
        self.positionJitterPoints = min(max(positionJitterPoints, 0), 12)
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    var runnableActions: [AutomationAction] {
        switch mode {
        case .single:
            return actions.first.map { [$0] } ?? []
        case .multiple:
            return actions
        }
    }

    static let starter = AutomationProfile(
        name: "我的第一个脚本",
        mode: .single,
        actions: [
            AutomationAction(start: NormalizedPoint(x: 0.5, y: 0.5), intervalMilliseconds: 500)
        ]
    )
}

enum RunDestination: String, CaseIterable {
    case preview
    case system
}
