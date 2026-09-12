import SwiftUI

struct ActionCanvas: View {
    let actions: [AutomationAction]
    let orientation: TargetOrientation
    let selectedID: UUID?
    let activeID: UUID?
    let markerScale: Double
    let tool: EditorTool
    let onSelect: (UUID) -> Void
    let onAddTap: (NormalizedPoint) -> Void
    let onAddSwipe: (NormalizedPoint, NormalizedPoint) -> Void
    let onMove: (UUID, NormalizedPoint, NormalizedPoint?) -> Void

    @State private var draftStart: CGPoint?
    @State private var draftEnd: CGPoint?

    var body: some View {
        GeometryReader { proxy in
            let size = proxy.size
            ZStack {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(AppTheme.canvas)
                GridBackdrop().clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))

                VStack(spacing: 10) {
                    Image(systemName: orientation == .portrait ? "iphone" : "ipad.landscape")
                        .font(.system(size: 28, weight: .light))
                    Text("按屏幕比例保存坐标")
                        .font(.caption)
                }
                .foregroundColor(.secondary.opacity(0.55))

                ForEach(actions.indices, id: \.self) { index in
                    let action = actions[index]
                    if action.kind == .swipe {
                        SwipePath(start: action.start.cgPoint(in: size), end: action.end.cgPoint(in: size))
                        SwipeEndHandle(active: activeID == action.id)
                            .position(action.end.cgPoint(in: size))
                            .highPriorityGesture(moveGesture(for: action, size: size, movingEnd: true))
                    }
                    ActionMarker(
                        number: index + 1,
                        selected: selectedID == action.id,
                        active: activeID == action.id,
                        scale: markerScale
                    )
                    .position(action.start.cgPoint(in: size))
                    .highPriorityGesture(moveGesture(for: action, size: size, movingEnd: false))
                    .onTapGesture { onSelect(action.id) }
                }

                if let draftStart, let draftEnd, tool == .swipe {
                    SwipePath(start: draftStart, end: draftEnd).opacity(0.55)
                }
            }
            .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .gesture(createGesture(size: size))
            .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).stroke(AppTheme.accent.opacity(0.16), lineWidth: 1))
        }
    }

    private func createGesture(size: CGSize) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                guard tool == .swipe else { return }
                if draftStart == nil { draftStart = value.startLocation }
                draftEnd = value.location
            }
            .onEnded { value in
                let start = normalized(value.startLocation, size: size)
                let end = normalized(value.location, size: size)
                if tool == .swipe && hypot(value.translation.width, value.translation.height) > 12 {
                    onAddSwipe(start, end)
                } else {
                    onAddTap(end)
                }
                draftStart = nil
                draftEnd = nil
            }
    }

    private func moveGesture(for action: AutomationAction, size: CGSize, movingEnd: Bool) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                let point = normalized(value.location, size: size)
                if movingEnd {
                    onMove(action.id, action.start, point)
                } else {
                    let deltaX = action.end.x - action.start.x
                    let deltaY = action.end.y - action.start.y
                    let newEnd = action.kind == .swipe
                        ? NormalizedPoint(x: point.x + deltaX, y: point.y + deltaY)
                        : nil
                    onMove(action.id, point, newEnd)
                }
                onSelect(action.id)
            }
    }

    private func normalized(_ point: CGPoint, size: CGSize) -> NormalizedPoint {
        NormalizedPoint(
            x: Double(min(max(point.x / max(size.width, 1), 0), 1)),
            y: Double(min(max(point.y / max(size.height, 1), 0), 1))
        )
    }
}

private struct GridBackdrop: View {
    var body: some View {
        GeometryReader { proxy in
            Path { path in
                let step: CGFloat = 34
                stride(from: step, through: proxy.size.width, by: step).forEach { x in
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: proxy.size.height))
                }
                stride(from: step, through: proxy.size.height, by: step).forEach { y in
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: proxy.size.width, y: y))
                }
            }
            .stroke(Color.primary.opacity(0.045), lineWidth: 0.7)
        }
    }
}

private struct SwipePath: View {
    let start: CGPoint
    let end: CGPoint

    var body: some View {
        Path { path in
            path.move(to: start)
            path.addLine(to: end)
        }
        .stroke(AppTheme.warning, style: StrokeStyle(lineWidth: 4, lineCap: .round, dash: [7, 6]))
    }
}

private struct SwipeEndHandle: View {
    let active: Bool

    var body: some View {
        ZStack {
            Circle().fill(AppTheme.warning)
            Image(systemName: "arrow.up.right")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
        }
        .frame(width: active ? 34 : 29, height: active ? 34 : 29)
        .shadow(color: AppTheme.warning.opacity(0.35), radius: active ? 10 : 4)
    }
}

private struct ActionMarker: View {
    let number: Int
    let selected: Bool
    let active: Bool
    let scale: Double

    var body: some View {
        ZStack {
            Circle()
                .fill(Color(UIColor.systemBackground))
            Circle()
                .stroke(active ? Color.green : AppTheme.accent, lineWidth: selected || active ? 4 : 3)
            Text("\(number)")
                .font(.system(size: 17 * CGFloat(scale), weight: .bold, design: .rounded))
                .foregroundColor(active ? .green : AppTheme.accent)
        }
        .frame(width: 48 * CGFloat(scale), height: 48 * CGFloat(scale))
        .shadow(color: (active ? Color.green : AppTheme.accent).opacity(0.3), radius: active ? 13 : 6)
        .scaleEffect(active ? 1.12 : 1)
        .animation(.easeInOut(duration: 0.16))
    }
}

struct ControlBar: View {
    @Binding var tool: EditorTool
    let allowSwipe: Bool
    let scale: Double
    let isRunning: Bool
    let canDelete: Bool
    let play: () -> Void
    let delete: () -> Void

    var body: some View {
        HStack(spacing: 7) {
            toolButton(symbol: isRunning ? "pause.fill" : "play.fill", color: isRunning ? AppTheme.warning : AppTheme.accent, action: play)
            toolButton(symbol: "plus", color: .green) { tool = .tap }
                .opacity(tool == .tap ? 1 : 0.55)
            if allowSwipe {
                toolButton(symbol: "arrow.turn.up.right", color: AppTheme.warning) { tool = .swipe }
                    .opacity(tool == .swipe ? 1 : 0.55)
            }
            toolButton(symbol: "minus", color: .red, action: delete)
                .disabled(!canDelete)
                .opacity(canDelete ? 1 : 0.3)
            toolButton(symbol: "move.3d", color: .secondary) {}
                .allowsHitTesting(false)
        }
        .padding(8 * CGFloat(scale))
        .background(Color.black.opacity(0.86))
        .cornerRadius(16 * CGFloat(scale))
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .contain)
    }

    private func toolButton(symbol: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 20 * CGFloat(scale), weight: .bold))
                .foregroundColor(color)
                .frame(width: 38 * CGFloat(scale), height: 38 * CGFloat(scale))
        }
    }
}
