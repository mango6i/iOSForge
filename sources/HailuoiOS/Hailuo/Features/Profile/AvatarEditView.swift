import SwiftUI

struct AvatarEditView: View {
    @EnvironmentObject private var session: SessionStore
    @Environment(\.presentationMode) private var presentation
    @State private var selectedEmoji = "🐚"
    @State private var selectedImage: UIImage?
    @State private var pickerVisible = false
    @State private var saving = false

    private let emojis = ["🐚", "🌊", "🐠", "🦀", "🐡", "🦑", "🐙", "🦐", "🐋", "🐬", "🦈", "🌸", "🍀", "⭐", "🌙", "☀️", "🎵", "🎯", "💎", "🔮"]
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 5)

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                preview.frame(width: 96, height: 96).clipShape(Circle()).overlay(Circle().stroke(HailuoTheme.primary.opacity(0.6), lineWidth: 2))
                Text("当前头像（圆形显示）").font(.caption).foregroundColor(.secondary)
                Button("🖼️ 从相册选择自定义头像") { pickerVisible = true }
                    .frame(maxWidth: .infinity).padding(.vertical, 12)
                    .background(Color(.secondarySystemBackground)).clipShape(RoundedRectangle(cornerRadius: 12))
                Text("或选择一个头像表情").font(.caption).foregroundColor(.secondary).frame(maxWidth: .infinity, alignment: .leading)
                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(emojis, id: \.self) { emoji in
                        Button { selectedEmoji = emoji; selectedImage = nil } label: {
                            Text(emoji).font(.system(size: 25)).frame(width: 48, height: 48)
                                .background(selectedImage == nil && selectedEmoji == emoji ? HailuoTheme.primary.opacity(0.10) : Color(.secondarySystemBackground))
                                .clipShape(Circle()).overlay(Circle().stroke(selectedImage == nil && selectedEmoji == emoji ? HailuoTheme.primary : .clear, lineWidth: 2))
                        }
                    }
                }
                Button(saving ? "保存中..." : "💾 保存头像") { Task { await save() } }.buttonStyle(PrimaryButtonStyle()).disabled(saving)
            }
            .padding(20)
        }
        .navigationBarTitle("修改头像", displayMode: .inline)
        .onAppear { initializeSelection() }
        .sheet(isPresented: $pickerVisible) { ImagePicker(source: .library) { selectedImage = $0 } }
        .overlay(LoadingOverlay(visible: saving))
    }

    @ViewBuilder private var preview: some View {
        if let selectedImage { Image(uiImage: selectedImage).resizable().scaledToFill() }
        else { ZStack { Color(.secondarySystemBackground); Text(selectedEmoji).font(.system(size: 44)) } }
    }

    private func initializeSelection() {
        guard let avatar = session.profile?.avatar?.nonEmpty,
              !avatar.hasPrefix("http://"), !avatar.hasPrefix("https://"), !avatar.hasPrefix("/"), !avatar.hasPrefix("data:")
        else { return }
        if emojis.contains(avatar) { selectedEmoji = avatar }
    }

    @MainActor private func save() async {
        saving = true; defer { saving = false }
        do {
            let value: String
            if let selectedImage {
                guard let data = ImageDataProcessor.avatarJPEG(selectedImage) else { session.show("头像处理失败", type: .error); return }
                value = try await APIClient.shared.uploadImage(data).url
            } else { value = selectedEmoji }
            try await ProfileService().updateAvatar(value)
            try await session.refreshProfile()
            session.show("头像保存成功", type: .success)
            presentation.wrappedValue.dismiss()
        } catch { session.fail(error) }
    }
}
