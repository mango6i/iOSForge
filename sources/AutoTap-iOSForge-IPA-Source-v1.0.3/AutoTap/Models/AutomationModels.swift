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
    /// Optional high-fidelity path captured by gesture recording.  Older
    /// scripts only have start/end and continue to use the generated curve.
    var gesturePath: [NormalizedPoint]?
    /// Milliseconds from touch-down for every point in `gesturePath`.
    var gesturePathOffsetsMilliseconds: [Int]?

    init(
        id: UUID = UUID(),
        kind: AutomationActionKind = .tap,
        start: NormalizedPoint,
        end: NormalizedPoint? = nil,
        intervalMilliseconds: Int = 500,
        intervalUnit: IntervalUnit = .milliseconds,
        durationMilliseconds: Int = 60,
        repeatCount: Int = 1,
        gesturePath: [NormalizedPoint]? = nil,
        gesturePathOffsetsMilliseconds: [Int]? = nil
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
        let normalizedPath = gesturePath?.isEmpty == false ? gesturePath : nil
        self.gesturePath = normalizedPath
        if let normalizedPath,
           let offsets = gesturePathOffsetsMilliseconds,
           offsets.count == normalizedPath.count {
            var previous = 0
            self.gesturePathOffsetsMilliseconds = offsets.enumerated().map { index, value in
                let clamped = index == 0 ? 0 : min(max(value, previous + 1), 10_000)
                previous = clamped
                return clamped
            }
        } else {
            self.gesturePathOffsetsMilliseconds = nil
        }
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
        case durationMilliseconds, repeatCount, gesturePath, gesturePathOffsetsMilliseconds
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
        let decodedPath = try container.decodeIfPresent([NormalizedPoint].self, forKey: .gesturePath)
        let decodedOffsets = try container.decodeIfPresent([Int].self, forKey: .gesturePathOffsetsMilliseconds)
        if let decodedPath, decodedPath.count >= 2,
           let decodedOffsets, decodedOffsets.count == decodedPath.count {
            gesturePath = decodedPath
            var previous = 0
            gesturePathOffsetsMilliseconds = decodedOffsets.enumerated().map { index, value in
                let clamped = index == 0 ? 0 : min(max(value, previous + 1), 10_000)
                previous = clamped
                return clamped
            }
        } else {
            gesturePath = nil
            gesturePathOffsetsMilliseconds = nil
        }
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
        try container.encodeIfPresent(gesturePath, forKey: .gesturePath)
        try container.encodeIfPresent(gesturePathOffsetsMilliseconds, forKey: .gesturePathOffsetsMilliseconds)
    }
}

enum AutomationMode: String, Codable, CaseIterable {
    case single
    case multiple

    var title: String { self == .single ? "单点击" : "多点击" }
    var subtitle: String { self == .single ? "只循环当前目标" : "按编号顺序执行全部目标" }
}

enum RecordingCaptureMode: String, Codable, CaseIterable {
    case taps
    case gestures

    var title: String {
        switch self {
        case .taps: return "点击录制"
        case .gestures: return "手势录制"
        }
    }

    var scriptTitle: String {
        switch self {
        case .taps: return "点击录制脚本"
        case .gestures: return "手势脚本"
        }
    }
}

enum AutomationProfileCategory: String, Codable, CaseIterable, Hashable {
    case single
    case multiple
    case recording
    case gestureRecording

    var mode: AutomationMode {
        self == .single ? .single : .multiple
    }

    var isRecording: Bool {
        self == .recording || self == .gestureRecording
    }

    var captureMode: RecordingCaptureMode? {
        switch self {
        case .recording: return .taps
        case .gestureRecording: return .gestures
        default: return nil
        }
    }

    var title: String {
        switch self {
        case .single: return "单点脚本"
        case .multiple: return "多点脚本"
        case .recording: return "点击录制脚本"
        case .gestureRecording: return "手势脚本"
        }
    }
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
    /// Optional so profiles written by older releases still decode. Their
    /// category falls back to their old single/multiple mode.
    var profileCategory: AutomationProfileCategory?
    var orientation: TargetOrientation
    var actions: [AutomationAction]
    var cycleCount: Int
    /// Optional for backward-compatible decoding of profiles saved before v20.
    /// A missing value has the same meaning as zero seconds.
    var cycleIntervalSeconds: Int?
    /// Recording-only resume behavior. Optional keeps scripts written by older
    /// versions decodable; nil means continuing from the paused position.
    var restartRecordingFromBeginningOnResume: Bool?
    var startDelaySeconds: Int
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        mode: AutomationMode = .single,
        profileCategory: AutomationProfileCategory? = nil,
        orientation: TargetOrientation = .portrait,
        actions: [AutomationAction] = [],
        cycleCount: Int = 0,
        cycleIntervalSeconds: Int = 0,
        restartRecordingFromBeginningOnResume: Bool = false,
        startDelaySeconds: Int = 1,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.mode = mode
        self.profileCategory = profileCategory ?? (mode == .single ? .single : .multiple)
        self.orientation = orientation
        self.actions = actions
        self.cycleCount = min(max(cycleCount, 0), 999_999)
        self.cycleIntervalSeconds = min(max(cycleIntervalSeconds, 0), 86_400)
        self.restartRecordingFromBeginningOnResume = restartRecordingFromBeginningOnResume
        self.startDelaySeconds = min(max(startDelaySeconds, 0), 15)
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

    var category: AutomationProfileCategory {
        profileCategory ?? (mode == .single ? .single : .multiple)
    }

    var restartsRecordingFromBeginningOnResume: Bool {
        category.isRecording && restartRecordingFromBeginningOnResume == true
    }

    static let starter = AutomationProfile(
        name: "我的第一个脚本",
        mode: .single,
        profileCategory: .single,
        actions: [
            AutomationAction(start: NormalizedPoint(x: 0.5, y: 0.5), intervalMilliseconds: 500)
        ]
    )
}

enum RunDestination: String, CaseIterable {
    case preview
    case system
}
