import Foundation

final class ProfileStore: ObservableObject {
    @Published private(set) var profiles: [AutomationProfile] = []
    @Published var selectedProfileID: UUID? = nil {
        didSet { persistSelection() }
    }

    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()
    private let selectionKey = "AutoTap.SelectedProfileID"
    private let fileURL: URL

    init() {
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let directory = support.appendingPathComponent("AutoTap", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        fileURL = directory.appendingPathComponent("profiles.json")
        load()
    }

    var selectedProfile: AutomationProfile? {
        if let selectedProfileID,
           let profile = profiles.first(where: { $0.id == selectedProfileID }) {
            return profile
        }
        return profiles.first
    }

    func profile(id: UUID?) -> AutomationProfile? {
        guard let id else { return selectedProfile }
        return profiles.first(where: { $0.id == id })
    }

    @discardableResult
    func createProfile() -> UUID {
        let profile = AutomationProfile(name: "新建脚本 \(profiles.count + 1)")
        profiles.append(profile)
        selectedProfileID = profile.id
        save()
        return profile.id
    }

    func select(_ id: UUID) {
        guard profiles.contains(where: { $0.id == id }) else { return }
        selectedProfileID = id
    }

    func update(_ profile: AutomationProfile) {
        guard let index = profiles.firstIndex(where: { $0.id == profile.id }) else { return }
        var copy = profile
        copy.updatedAt = Date()
        profiles[index] = copy
        save()
    }

    @discardableResult
    func duplicate(_ id: UUID) -> UUID? {
        guard var copy = profiles.first(where: { $0.id == id }) else { return nil }
        copy.id = UUID()
        copy.name += " 副本"
        copy.createdAt = Date()
        copy.updatedAt = Date()
        copy.actions = copy.actions.map {
            var action = $0
            action.id = UUID()
            return action
        }
        profiles.append(copy)
        selectedProfileID = copy.id
        save()
        return copy.id
    }

    func delete(_ id: UUID) {
        guard profiles.count > 1 else { return }
        profiles.removeAll(where: { $0.id == id })
        if selectedProfileID == id { selectedProfileID = profiles.first?.id }
        save()
    }

    func exportURL(for id: UUID) throws -> URL {
        guard let profile = profile(id: id) else { throw StoreError.profileNotFound }
        let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
            .appendingPathComponent("AutoTapExports", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let safeName = profile.name.replacingOccurrences(of: "/", with: "-")
        let url = directory.appendingPathComponent("\(safeName).autotap.json")
        try encoder.encode(profile).write(to: url, options: .atomic)
        return url
    }

    @discardableResult
    func importProfile(from url: URL) throws -> UUID {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        let data = try Data(contentsOf: url)
        var profile = try decoder.decode(AutomationProfile.self, from: data)
        if profiles.contains(where: { $0.id == profile.id }) { profile.id = UUID() }
        profile.name += "（导入）"
        profile.createdAt = Date()
        profile.updatedAt = Date()
        profile.actions = profile.actions.map {
            var action = $0
            action.id = UUID()
            return action
        }
        profiles.append(profile)
        selectedProfileID = profile.id
        save()
        return profile.id
    }

    private func load() {
        if let data = try? Data(contentsOf: fileURL),
           let saved = try? decoder.decode([AutomationProfile].self, from: data),
           !saved.isEmpty {
            profiles = saved
        } else {
            profiles = [.starter]
            save()
        }

        if let raw = UserDefaults.standard.string(forKey: selectionKey),
           let id = UUID(uuidString: raw),
           profiles.contains(where: { $0.id == id }) {
            selectedProfileID = id
        } else {
            selectedProfileID = profiles.first?.id
        }
    }

    private func save() {
        guard let data = try? encoder.encode(profiles) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    private func persistSelection() {
        UserDefaults.standard.set(selectedProfileID?.uuidString, forKey: selectionKey)
    }

    enum StoreError: LocalizedError {
        case profileNotFound

        var errorDescription: String? { "找不到要导出的脚本。" }
    }
}
