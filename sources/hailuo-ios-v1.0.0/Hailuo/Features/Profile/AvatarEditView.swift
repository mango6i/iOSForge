import SwiftUI

struct AvatarEditView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @State private var selectedEmoji = "🐚"
    @State private var selectedImage: UIImage?
    @State private var existingAvatar: String?
    @State private var initialized = false
    @State private var pendingCrop: UIImage?
    @State private var cropSource: HailuoImageCropSource?
    @State private var pickerVisible = false
    @State private var saving = false

    private let emojis = ["🐚", "🌊", "🐠", "🦀", "🐡", "🦑", "🐙", "🦐", "🐋", "🐬", "🦈", "🌸", "🍀", "⭐", "🌙", "☀️", "🎵", "🎯", "💎", "🔮"]
    private let columns = Array(repeating: GridItem(.fixed(48), spacing: 8), count: 5)

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                Button { pickerVisible = true } label: { preview.frame(width: 96, height: 96).clipShape(Circle()) }.disabled(saving).accessibilityLabel("从相册更换头像")
                Text("当前头像（圆形显示）").font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText).padding(.top, 12)
                Text("点击头像从相册更换自定义头像").font(.system(size: 14)).foregroundColor(HailuoTheme.text).padding(.top, 12)
                Text("或选择一个头像表情").font(.system(size: 12)).foregroundColor(HailuoTheme.secondaryText).frame(maxWidth: .infinity, alignment: .leading).padding(.top, 10).padding(.bottom, 8)
                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(emojis, id: \.self) { emoji in
                        Button { selectedEmoji = emoji; selectedImage = nil; existingAvatar = nil } label: {
                            Text(emoji).font(.system(size: 24)).frame(width: 48, height: 48)
                                .background(selectedImage == nil && existingAvatar == nil && selectedEmoji == emoji ? HailuoTheme.primary.opacity(0.08) : Color(red: 244 / 255, green: 246 / 255, blue: 248 / 255))
                                .clipShape(Circle()).overlay(Circle().stroke(selectedImage == nil && existingAvatar == nil && selectedEmoji == emoji ? HailuoTheme.primary : .clear, lineWidth: 2))
                        }.disabled(saving)
                    }
                }
                Button(saving ? "保存中..." : "💾 保存头像") { Task { await save() } }.buttonStyle(PrimaryButtonStyle()).disabled(saving).padding(.top, 16)
            }
            .padding(20)
        }
        .hailuoPageTitle("修改头像")
        .background(HailuoPageBackground()).buttonStyle(PlainButtonStyle())
        .onAppear { initializeSelection() }
        .sheet(isPresented: $pickerVisible, onDismiss: {
            // Present the cropper only after the system picker has finished dismissing.
            if let pendingCrop { cropSource = HailuoImageCropSource(image: pendingCrop); self.pendingCrop = nil }
        }) { ImagePicker(source: .library) { image in
            guard let data = ImageDataProcessor.jpeg(image, maxEdge: 2048, maxBytes: 4 * 1024 * 1024), let resized = UIImage(data: data) else { session.show("图片处理失败", type: .error); return }
            pendingCrop = resized
        } }
        .fullScreenCover(item: $cropSource) { source in
            HailuoImageCropView(image: source.image, cancel: { cropSource = nil }) { image in
                selectedImage = image; existingAvatar = nil; cropSource = nil
            }
        }
        .overlay(LoadingOverlay(visible: saving))
    }

    @ViewBuilder private var preview: some View {
        if let selectedImage { Image(uiImage: selectedImage).resizable().scaledToFill() }
        else if let existingAvatar { AvatarView(url: existingAvatar, size: 96) }
        else { ZStack { Color(.secondarySystemBackground); Text(selectedEmoji).font(.system(size: 44)) } }
    }

    private func initializeSelection() {
        guard !initialized else { return }; initialized = true
        existingAvatar = session.profile?.avatar?.nonEmpty
        guard let avatar = session.profile?.avatar?.nonEmpty,
              !avatar.hasPrefix("http://"), !avatar.hasPrefix("https://"), !avatar.hasPrefix("/"), !avatar.hasPrefix("data:")
        else { return }
        if emojis.contains(avatar) { selectedEmoji = avatar; existingAvatar = nil }
    }

    @MainActor private func save() async {
        guard !saving, session.isAuthenticated else { return }
        let revision = session.operationRevision
        let image = selectedImage, avatar = existingAvatar ?? selectedEmoji
        saving = true; defer { saving = false }
        do {
            let value: String
            if let image {
                guard let data = ImageDataProcessor.avatarJPEG(image) else { session.show("头像处理失败", type: .error); return }
                value = try await APIClient.shared.uploadImage(data).url
            } else { value = avatar }
            guard session.isAuthenticated, revision == session.operationRevision else { return }
            try await ProfileService().updateAvatar(value)
            guard session.isAuthenticated, revision == session.operationRevision else { return }
            try await session.refreshProfile()
            guard session.isAuthenticated, revision == session.operationRevision else { return }
            session.show("头像保存成功", type: .success)
            presentation.wrappedValue.dismiss()
        } catch { if revision == session.operationRevision { session.fail(error) } }
    }
}

struct HailuoImageCropSource: Identifiable {
    let id = UUID()
    let image: UIImage
}

/// Same bounded circle crop as Android: drag, pinch 1–5×, then export 512 px.
struct HailuoImageCropView: View {
    let image: UIImage
    var backgroundCrop = false
    let cancel: () -> Void
    let confirm: (UIImage) -> Void
    @State private var zoom: CGFloat = 1
    @State private var offset = CGSize.zero
    @GestureState private var pinch: CGFloat = 1
    @GestureState private var drag = CGSize.zero

    var body: some View {
        GeometryReader { geometry in
            let viewport = cropSize(in: geometry.size)
            let center = CGPoint(x: geometry.size.width / 2, y: geometry.size.height * (backgroundCrop ? 0.47 : 0.44))
            let scale = max(1, min(5, zoom * pinch))
            let baseScale = max(viewport.width / max(1, image.size.width), viewport.height / max(1, image.size.height))
            let shift = bounded(CGSize(width: offset.width + drag.width, height: offset.height + drag.height), viewport: viewport, scale: baseScale * scale)
            ZStack {
                Color.black
                Image(uiImage: image).resizable()
                    .frame(width: image.size.width * baseScale * scale, height: image.size.height * baseScale * scale)
                    .position(x: center.x + shift.width, y: center.y + shift.height)
                AvatarCropMask(center: center, viewport: viewport, circle: !backgroundCrop).fill(.black.opacity(0.6), style: FillStyle(eoFill: true)).allowsHitTesting(false)
                Group {
                    if backgroundCrop { Rectangle().stroke(.white, lineWidth: 2) }
                    else { Circle().stroke(.white, lineWidth: 2) }
                }.frame(width: viewport.width, height: viewport.height).position(center).allowsHitTesting(false)
                VStack {
                    Text("移动和缩放").font(.system(size: 17)).foregroundColor(.white).padding(.top, 48)
                    Spacer()
                    HStack {
                        Button("取消", action: cancel).padding(.horizontal, 16).padding(.vertical, 10)
                        Spacer()
                        Button("确定") { confirm(cropped(viewport: viewport, scale: baseScale * scale, shift: shift)) }
                            .padding(.horizontal, 16).padding(.vertical, 10).background(Color(red: 7 / 255, green: 193 / 255, blue: 96 / 255)).cornerRadius(6)
                    }.font(.system(size: 17)).foregroundColor(.white).padding(.horizontal, 24).padding(.bottom, 40)
                }.allowsHitTesting(true)
            }.contentShape(Rectangle())
                .gesture(DragGesture().updating($drag) { value, state, _ in state = value.translation }.onEnded { value in
                    offset = bounded(CGSize(width: offset.width + value.translation.width, height: offset.height + value.translation.height), viewport: viewport, scale: baseScale * zoom)
                })
                .simultaneousGesture(MagnificationGesture().updating($pinch) { value, state, _ in state = value }.onEnded { value in
                    zoom = max(1, min(5, zoom * value)); offset = bounded(offset, viewport: viewport, scale: baseScale * zoom)
                })
        }.ignoresSafeArea().buttonStyle(PlainButtonStyle())
    }
    private func cropSize(in canvas: CGSize) -> CGSize {
        guard backgroundCrop else { return CGSize(width: canvas.width * 0.78, height: canvas.width * 0.78) }
        let aspect = max(0.4, min(0.75, canvas.width / max(1, canvas.height)))
        let height = min(canvas.width * 0.82 / aspect, canvas.height * 0.68)
        return CGSize(width: height * aspect, height: height)
    }
    private func bounded(_ value: CGSize, viewport: CGSize, scale: CGFloat) -> CGSize {
        let x = max(0, (image.size.width * scale - viewport.width) / 2)
        let y = max(0, (image.size.height * scale - viewport.height) / 2)
        return CGSize(width: min(x, max(-x, value.width)), height: min(y, max(-y, value.height)))
    }
    private func cropped(viewport: CGSize, scale: CGFloat, shift: CGSize) -> UIImage {
        let ratio = (backgroundCrop ? 1080 : 512) / max(1, viewport.width)
        let output = CGSize(width: viewport.width * ratio, height: viewport.height * ratio)
        let size = CGSize(width: image.size.width * scale * ratio, height: image.size.height * scale * ratio)
        let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
        return UIGraphicsImageRenderer(size: output, format: format).image { _ in
            image.draw(in: CGRect(x: (output.width - size.width) / 2 + shift.width * ratio, y: (output.height - size.height) / 2 + shift.height * ratio, width: size.width, height: size.height))
        }
    }
}

private struct AvatarCropMask: Shape {
    let center: CGPoint
    let viewport: CGSize
    let circle: Bool
    func path(in rect: CGRect) -> Path {
        var path = Path(rect)
        let hole = CGRect(x: center.x - viewport.width / 2, y: center.y - viewport.height / 2, width: viewport.width, height: viewport.height)
        if circle { path.addEllipse(in: hole) } else { path.addRect(hole) }
        return path
    }
}
