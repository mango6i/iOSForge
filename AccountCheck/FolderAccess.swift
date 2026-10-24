import Foundation
import UIKit
import UniformTypeIdentifiers
import SwiftUI

struct FolderGrant: Codable, Identifiable {
    let id: UUID
    let title: String
    var bookmark: Data
}

final class FolderAccess {
    private let key = "authorizedFolderBookmarks.v1"
    var grants: [FolderGrant] {
        get { UserDefaults.standard.data(forKey:key).flatMap { try? JSONDecoder().decode([FolderGrant].self, from:$0) } ?? [] }
        set { UserDefaults.standard.set(try? JSONEncoder().encode(newValue), forKey:key) }
    }
    func add(_ url: URL) throws {
        guard url.startAccessingSecurityScopedResource() else { throw CheckFailure.unreadable }
        defer { url.stopAccessingSecurityScopedResource() }
        let bookmark = try url.bookmarkData(options:.minimalBookmark, includingResourceValuesForKeys:nil, relativeTo:nil)
        var list = grants
        // Avoid duplicated scans when a directory is picked again; store only the bookmark and visible folder label.
        list.removeAll { old in
            var stale = false
            return (try? URL(resolvingBookmarkData:old.bookmark, bookmarkDataIsStale:&stale).standardizedFileURL) == url.standardizedFileURL
        }
        list.append(FolderGrant(id:UUID(),title:url.lastPathComponent,bookmark:bookmark))
        grants = list
    }
    func resolve(_ grant: FolderGrant) throws -> URL {
        var stale = false
        let url = try URL(resolvingBookmarkData:grant.bookmark, bookmarkDataIsStale:&stale)
        guard !stale else { throw CheckFailure.unreadable }
        return url
    }
    func remove(_ id: UUID) { grants = grants.filter { $0.id != id } }
    func read<T>(_ url: URL, body: (URL) throws -> T) throws -> T {
        guard url.startAccessingSecurityScopedResource() else { throw CheckFailure.unreadable }
        defer { url.stopAccessingSecurityScopedResource() }
        var coordinatedError: NSError?
        var result: Result<T,Error>?
        NSFileCoordinator().coordinate(readingItemAt:url, options:.withoutChanges, error:&coordinatedError) { safeURL in
            result = Result { try body(safeURL) }
        }
        if coordinatedError != nil { throw CheckFailure.unreadable }
        guard let result = result else { throw CheckFailure.unreadable }
        return try result.get()
    }
}

struct FolderPicker: UIViewControllerRepresentable {
    var onPick: ([URL]) -> Void
    func makeUIViewController(context:Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes:[.folder], asCopy:false)
        picker.allowsMultipleSelection = true
        picker.delegate = context.coordinator
        return picker
    }
    func updateUIViewController(_ uiViewController:UIDocumentPickerViewController, context:Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(onPick) }
    final class Coordinator: NSObject, UIDocumentPickerDelegate {
        let callback: ([URL]) -> Void
        init(_ callback:@escaping ([URL])->Void) { self.callback = callback }
        func documentPicker(_ controller:UIDocumentPickerViewController, didPickDocumentsAt urls:[URL]) { callback(urls) }
    }
}
