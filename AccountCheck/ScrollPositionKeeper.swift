import SwiftUI
import UIKit

struct ScrollAnchorKey: PreferenceKey {
    static var defaultValue: [String:CGFloat] = [:]
    static func reduce(value:inout [String:CGFloat],nextValue:()->[String:CGFloat]) {
        value.merge(nextValue(),uniquingKeysWith: { _,new in new })
    }
}

extension View {
    func scrollAnchor(_ id:String) -> some View {
        background(GeometryReader { geometry in
            Color.clear.preference(key:ScrollAnchorKey.self,
                value:[id:geometry.frame(in:.named("account-scroll")).minY])
        })
    }
}

@MainActor final class ScrollPositionKeeper: ObservableObject {
    weak var scrollView: UIScrollView?
    private var pending: (removed:String,anchor:String,y:CGFloat)?

    func hold(removing:String,frames:[String:CGFloat]) {
        guard let scrollView = scrollView else { return }
        let surviving = frames.filter { $0.key != removing }
        let visible = surviving.filter { $0.value >= 0 && $0.value < scrollView.bounds.height }
        let anchor = (visible.isEmpty ? surviving : visible).min { abs($0.value) < abs($1.value) }
        if let anchor = anchor { pending = (removing,anchor.key,anchor.value) }
    }

    func update(_ frames:[String:CGFloat]) {
        guard let saved = pending, frames[saved.removed] == nil,
              let y = frames[saved.anchor], let scrollView = scrollView else { return }
        pending = nil
        let delta = y - saved.y
        DispatchQueue.main.async { [weak scrollView] in
            guard let scrollView = scrollView else { return }
            scrollView.layoutIfNeeded()
            let offset = Self.offset(current:scrollView.contentOffset.y,delta:delta,
                contentHeight:scrollView.contentSize.height,viewportHeight:scrollView.bounds.height,
                top:scrollView.adjustedContentInset.top,bottom:scrollView.adjustedContentInset.bottom)
            scrollView.setContentOffset(CGPoint(x:scrollView.contentOffset.x,y:offset),animated:false)
        }
    }

    static func offset(current:CGFloat,delta:CGFloat,contentHeight:CGFloat,
                       viewportHeight:CGFloat,top:CGFloat,bottom:CGFloat) -> CGFloat {
        let minimum = -top
        let maximum = max(minimum,contentHeight - viewportHeight + bottom)
        return min(maximum,max(minimum,current + delta))
    }
}

struct ScrollViewProbe: UIViewRepresentable {
    let keeper: ScrollPositionKeeper
    func makeUIView(context:Context) -> Probe {
        let view = Probe()
        view.keeper = keeper
        view.isUserInteractionEnabled = false
        return view
    }
    func updateUIView(_ view:Probe,context:Context) { view.keeper = keeper; view.connect() }
    final class Probe: UIView {
        weak var keeper: ScrollPositionKeeper?
        override func didMoveToWindow() { super.didMoveToWindow(); connect() }
        override func layoutSubviews() { super.layoutSubviews(); connect() }
        func connect() {
            var ancestor = superview
            while let view = ancestor {
                if let scroll = view as? UIScrollView { keeper?.scrollView = scroll; return }
                ancestor = view.superview
            }
        }
    }
}
