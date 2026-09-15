import Foundation

final class ProfileStore: ObservableObject {
    @Published private(set) var profiles: [AutomationProfile] = []
    @Published var selectedProfileID: UUID? = nil {
        didSet { persistSelection() }
    }

    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()
    private let selectionKey = "AutoTap.SelectedProfileID"
    private let categorySelectionPrefix = "AutoTap.SelectedProfileID."
    private let fileURL: URL

    init() {
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let directory = support.appendingPathComponent("AutoTap", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        fileURL = directory.appendingPathComponent("profiles.json")
        migrateLegacyProfilesIfNeeded()
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

    func profiles(for category: AutomationProfileCategory) -> [AutomationProfile] {
        profiles.filter { $0.category == category }
    }

    func selectedProfile(for category: AutomationProfileCategory) -> AutomationProfile? {
        if let raw = UserDefaults.standard.string(forKey: categorySelectionKey(category)),
           let id = UUID(uuidString: raw),
           let profile = profiles.first(where: { $0.id == id && $0.category == category }) {
            return profile
        }
        if let selectedProfile, selectedProfile.category == category { return selectedProfile }
        return profiles.first(where: { $0.category == category })
    }

    @discardableResult
    func ensureSelectedProfile(for category: AutomationProfileCategory) -> UUID {
        if let profile = selectedProfile(for: category) {
            select(profile.id)
            return profile.id
        }
        return createProfile(category: category)
    }

    @discardableResult
    func createProfile(category: AutomationProfileCategory) -> UUID {
        let number = profiles(for: category).count + 1
        let profile = AutomationProfile(
            name: "新建\(category.title) \(number)",
            mode: category.mode,
            profileCategory: category
        )
        profiles.append(profile)
        select(profile.id)
        save()
        return profile.id
    }

    @discardableResult
    func addRecordedProfile(name: String, actions: [AutomationAction]) -> UUID {
        let profile = AutomationProfile(
            name: name,
            mode: .multiple,
            profileCategory: .recording,
            actions: actions,
            cycleCount: 0,
            startDelaySeconds: 3
        )
        profiles.append(profile)
        select(profile.id)
        save()
        return profile.id
    }

    func select(_ id: UUID) {
        guard let profile = profiles.first(where: { $0.id == id }) else { return }
        selectedProfileID = id
        UserDefaults.standard.set(id.uuidString, forKey: categorySelectionKey(profile.category))
    }

    func update(_ profile: AutomationProfile) {
        guard let index = profiles.firstIndex(where: { $0.id == profile.id }) else { return }
        var copy = profile
        let category = copy.category
        copy.profileCategory = category
        copy.mode = category.mode
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
        select(copy.id)
        save()
        return copy.id
    }

    func delete(_ id: UUID) {
        guard profiles.count > 1 else { return }
        let deletedCategory = profiles.first(where: { $0.id == id })?.category
        profiles.removeAll(where: { $0.id == id })
        if selectedProfileID == id {
            selectedProfileID = profiles.first(where: { $0.category == deletedCategory })?.id
                ?? profiles.first?.id
        }
        if let deletedCategory,
           UserDefaults.standard.string(forKey: categorySelectionKey(deletedCategory)) == id.uuidString {
            let replacement = profiles.first(where: { $0.category == deletedCategory })?.id
            UserDefaults.standard.set(replacement?.uuidString, forKey: categorySelectionKey(deletedCategory))
        }
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
    func importProfile(from url: URL, category: AutomationProfileCategory) throws -> UUID {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        let data = try Data(contentsOf: url)
        var profile = try decoder.decode(AutomationProfile.self, from: data)
        if profiles.contains(where: { $0.id == profile.id }) { profile.id = UUID() }
        profile.name += "（导入）"
        profile.mode = category.mode
        profile.profileCategory = category
        profile.createdAt = Date()
        profile.updatedAt = Date()
        profile.actions = profile.actions.map {
            var action = $0
            action.id = UUID()
            return action
        }
        profiles.append(profile)
        select(profile.id)
        save()
        return profile.id
    }

    private func load() {
        if let data = try? Data(contentsOf: fileURL),
           var saved = try? decoder.decode([AutomationProfile].self, from: data),
           !saved.isEmpty {
            // Profiles before v21 did not store a category. Preserve their
            // single/multiple separation and recover default-named recordings.
            var didMigrate = false
            for index in saved.indices where saved[index].profileCategory == nil {
                didMigrate = true
                if saved[index].name.hasPrefix("录制脚本") {
                    saved[index].profileCategory = .recording
                } else if saved[index].mode == .single && saved[index].actions.count <= 1 {
                    saved[index].profileCategory = .single
                } else {
                    saved[index].profileCategory = .multiple
                }
            }
            for index in saved.indices {
                let expectedMode = saved[index].category.mode
                if saved[index].mode != expectedMode {
                    saved[index].mode = expectedMode
                    didMigrate = true
                }
            }
            profiles = saved
            if didMigrate { save() }
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

    private func migrateLegacyProfilesIfNeeded() {
        guard !FileManager.default.fileExists(atPath: fileURL.path) else { return }
        let legacyURL = URL(fileURLWithPath: "/var/mobile/Library/Application Support/AutoTap/profiles.json")
        guard legacyURL.standardizedFileURL != fileURL.standardizedFileURL,
              let data = try? Data(contentsOf: legacyURL) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    private func save() {
        guard let data = try? encoder.encode(profiles) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    private func persistSelection() {
        UserDefaults.standard.set(selectedProfileID?.uuidString, forKey: selectionKey)
    }

    private func categorySelectionKey(_ category: AutomationProfileCategory) -> String {
        categorySelectionPrefix + category.rawValue
    }

    enum StoreError: LocalizedError {
        case profileNotFound

        var errorDescription: String? { "找不到要导出的脚本。" }
    }
}
