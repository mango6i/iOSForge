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
        // Keep the full user-entered range.  The system timer/HID route may
        // be less precise below 40 ms, but clamping here made a value such as
        // 1 ms impossible to save and silently restored it as 40 ms.
        case .milliseconds: return 1...60_000
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
    /// Last value entered for each unit (milliseconds, seconds, minutes).
    /// Keeping these presets separate means switching the picker does not
    /// overwrite a value the user entered for another unit.
    var intervalPresets: [Int]
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
        let normalizedInterval = min(max(intervalMilliseconds, 1), 3_600_000)
        self.intervalMilliseconds = normalizedInterval
        self.intervalUnit = intervalUnit
        self.intervalPresets = Self.makeIntervalPresets(for: normalizedInterval)
        self.durationMilliseconds = min(max(durationMilliseconds, 1), 10_000)
        self.repeatCount = min(max(repeatCount, 0), 999)
    }

    var intervalDisplayValue: Int {
        guard let index = IntervalUnit.allCases.firstIndex(of: intervalUnit),
              intervalPresets.indices.contains(index) else {
            return max(intervalUnit.allowedValues.lowerBound, Int((Double(intervalMilliseconds) / Double(intervalUnit.multiplier)).rounded()))
        }
        return min(max(intervalPresets[index], intervalUnit.allowedValues.lowerBound), intervalUnit.allowedValues.upperBound)
    }

    mutating func setIntervalDisplayValue(_ value: Int) {
        let clamped = min(max(value, intervalUnit.allowedValues.lowerBound), intervalUnit.allowedValues.upperBound)
        if intervalPresets.count != IntervalUnit.allCases.count {
            intervalPresets = Self.makeIntervalPresets(for: intervalMilliseconds)
        }
        if let index = IntervalUnit.allCases.firstIndex(of: intervalUnit) {
            intervalPresets[index] = clamped
        }
        intervalMilliseconds = min(max(clamped * intervalUnit.multiplier, 1), 3_600_000)
    }

    mutating func changeIntervalUnit(to newUnit: IntervalUnit) {
        let oldIndex = IntervalUnit.allCases.firstIndex(of: intervalUnit)
        let oldValue = intervalDisplayValue
        if intervalPresets.count != IntervalUnit.allCases.count {
            intervalPresets = Self.makeIntervalPresets(for: intervalMilliseconds)
        }
        if let oldIndex { intervalPresets[oldIndex] = oldValue }
        intervalUnit = newUnit
        let newIndex = IntervalUnit.allCases.firstIndex(of: newUnit) ?? 0
        let newValue = intervalPresets.indices.contains(newIndex)
            ? intervalPresets[newIndex]
            : Int((Double(intervalMilliseconds) / Double(newUnit.multiplier)).rounded())
        setIntervalDisplayValue(newValue)
    }

    private static func makeIntervalPresets(for milliseconds: Int) -> [Int] {
        IntervalUnit.allCases.map { unit in
            let converted = Int((Double(milliseconds) / Double(unit.multiplier)).rounded())
            return min(max(converted, unit.allowedValues.lowerBound), unit.allowedValues.upperBound)
        }
    }

    private enum CodingKeys: String, CodingKey {
        case id, kind, start, end, intervalMilliseconds, intervalUnit, intervalPresets
        case durationMilliseconds, repeatCount
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        kind = try container.decode(AutomationActionKind.self, forKey: .kind)
        start = try container.decode(NormalizedPoint.self, forKey: .start)
        end = try container.decodeIfPresent(NormalizedPoint.self, forKey: .end) ?? start
        let rawInterval = try container.decodeIfPresent(Int.self, forKey: .intervalMilliseconds) ?? 500
        intervalMilliseconds = min(max(rawInterval, 1), 3_600_000)
        intervalUnit = try container.decodeIfPresent(IntervalUnit.self, forKey: .intervalUnit) ?? .milliseconds
        let decodedPresets = try container.decodeIfPresent([Int].self, forKey: .intervalPresets)
        if let decodedPresets, decodedPresets.count == IntervalUnit.allCases.count {
            intervalPresets = IntervalUnit.allCases.enumerated().map { index, unit in
                min(max(decodedPresets[index], unit.allowedValues.lowerBound), unit.allowedValues.upperBound)
            }
        } else {
            intervalPresets = Self.makeIntervalPresets(for: intervalMilliseconds)
        }
        durationMilliseconds = min(max(try container.decodeIfPresent(Int.self, forKey: .durationMilliseconds) ?? 60, 1), 10_000)
        repeatCount = min(max(try container.decodeIfPresent(Int.self, forKey: .repeatCount) ?? 1, 0), 999)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(kind, forKey: .kind)
        try container.encode(start, forKey: .start)
        try container.encode(end, forKey: .end)
        try container.encode(intervalMilliseconds, forKey: .intervalMilliseconds)
        try container.encode(intervalUnit, forKey: .intervalUnit)
        try container.encode(intervalPresets, forKey: .intervalPresets)
        try container.encode(durationMilliseconds, forKey: .durationMilliseconds)
        try container.encode(repeatCount, forKey: .repeatCount)
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
        self.startDelaySeconds = min(max(startDelaySeconds, 0), 15)
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
