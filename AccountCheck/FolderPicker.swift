import UIKit
import UniformTypeIdentifiers
import SwiftUI

@MainActor struct FolderPicker: UIViewControllerRepresentable {
    var onPick: ([URL]) -> Void
    var onCancel: () -> Void
    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        Self.makeController(delegate:context.coordinator)
    }
    static func makeController(delegate: UIDocumentPickerDelegate) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder], asCopy: false)
        // Select one actual folder. A parent folder can still contain several tree sources.
        // Do not require the Files provider's multiple-folder selection UI to finish a grant.
        picker.allowsMultipleSelection = false
        picker.delegate = delegate
        picker.title = "添加树洞目录"
        return picker
    }
    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {
        context.coordinator.onPick = onPick
        context.coordinator.onCancel = onCancel
    }
    func makeCoordinator() -> Coordinator { Coordinator(onPick:onPick,onCancel:onCancel) }
    @MainActor final class Coordinator: NSObject, UIDocumentPickerDelegate {
        var onPick: ([URL]) -> Void
        var onCancel: () -> Void
        private var finished = false
        init(onPick: @escaping ([URL]) -> Void,onCancel: @escaping () -> Void) {
            self.onPick = onPick; self.onCancel = onCancel
        }
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            select(urls)
        }
        // Some supported system/provider combinations still send the single-URL selector.
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentAt url: URL) {
            select([url])
        }
        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            guard !finished else { return }; finished = true
            onCancel()
        }
        private func select(_ urls:[URL]) {
            guard !finished else { return }; finished = true
            // The view records the selection and dismisses first. Filesystem reads start in onDismiss.
            onPick(urls)
        }
    }
}
