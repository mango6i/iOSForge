import Foundation

final class ProfileStore: ObservableObject {
    @Published private(set) var profiles: [AutomationProfile] = []
    @Published private(set) var persistenceErrorMessage: String?
    @Published var selectedProfileID: UUID? = nil {
        didSet { persistSelection() }
    }

    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()
    private let selectionKey = "AutoTap.SelectedProfileID"
    private let categorySelectionPrefix = "AutoTap.SelectedProfileID."
    private let supportDirectoryURL: URL
    private let fileURL: URL
    private let backupURL: URL
    let exportsDirectoryURL: URL

    init() {
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let directory = support.appendingPathComponent("AutoTap", isDirectory: true)
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        supportDirectoryURL = directory
        fileURL = directory.appendingPathComponent("profiles.json")
        backupURL = directory.appendingPathComponent("profiles.backup.json")
        exportsDirectoryURL = documents
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try FileManager.default.createDirectory(at: documents, withIntermediateDirectories: true)
        } catch {
            persistenceErrorMessage = "无法创建脚本数据目录：\(error.localizedDescription)"
        }
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
    func addRecordedProfile(name: String, actions: [AutomationAction]) throws -> UUID {
        let profile = AutomationProfile(
            name: name,
            mode: .multiple,
            profileCategory: .recording,
            actions: actions,
            cycleCount: 0,
            startDelaySeconds: 3
        )
        let previousSelection = selectedProfileID
        profiles.append(profile)
        select(profile.id)
        guard save() else {
            profiles.removeAll(where: { $0.id == profile.id })
            selectedProfileID = previousSelection
            throw StoreError.persistenceFailed(persistenceErrorMessage ?? "录制脚本无法写入应用数据目录。")
        }
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
        try FileManager.default.createDirectory(at: exportsDirectoryURL, withIntermediateDirectories: true)
        let forbidden = CharacterSet(charactersIn: "/:\\")
        let cleaned = profile.name.components(separatedBy: forbidden).joined(separator: "-")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let safeName = cleaned.isEmpty ? profile.category.title : cleaned
        let url = exportsDirectoryURL.appendingPathComponent("\(safeName).autotap.json")
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
        let previousSelection = selectedProfileID
        profiles.append(profile)
        select(profile.id)
        guard save() else {
            profiles.removeAll(where: { $0.id == profile.id })
            selectedProfileID = previousSelection
            throw StoreError.persistenceFailed(persistenceErrorMessage ?? "导入的脚本无法写入应用数据目录。")
        }
        return profile.id
    }

    private func load() {
        var loadedFromBackup = false
        let savedProfiles: [AutomationProfile]?
        if let saved = decodeProfiles(at: fileURL) {
            savedProfiles = saved
        } else if let saved = decodeProfiles(at: backupURL) {
            savedProfiles = saved
            loadedFromBackup = true
        } else {
            savedProfiles = nil
        }

        if var saved = savedProfiles {
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
            if didMigrate || loadedFromBackup { _ = save() }
        } else {
            profiles = [.starter]
            _ = save()
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

    private func decodeProfiles(at url: URL) -> [AutomationProfile]? {
        guard let data = try? Data(contentsOf: url),
              let decoded = try? decoder.decode([AutomationProfile].self, from: data),
              !decoded.isEmpty else { return nil }
        return decoded
    }

    @discardableResult
    private func save() -> Bool {
        do {
            try FileManager.default.createDirectory(at: supportDirectoryURL, withIntermediateDirectories: true)
            let data = try encoder.encode(profiles)
            try data.write(to: fileURL, options: .atomic)
            try? data.write(to: backupURL, options: .atomic)
            persistenceErrorMessage = nil
            return true
        } catch {
            persistenceErrorMessage = "脚本保存失败：\(error.localizedDescription)"
            return false
        }
    }

    private func persistSelection() {
        UserDefaults.standard.set(selectedProfileID?.uuidString, forKey: selectionKey)
    }

    private func categorySelectionKey(_ category: AutomationProfileCategory) -> String {
        categorySelectionPrefix + category.rawValue
    }

    enum StoreError: LocalizedError {
        case profileNotFound
        case persistenceFailed(String)

        var errorDescription: String? {
            switch self {
            case .profileNotFound:
                return "找不到要导出的脚本。"
            case .persistenceFailed(let message):
                return message
            }
        }
    }
}
