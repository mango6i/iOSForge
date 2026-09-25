import AVFoundation
import Foundation
import UIKit

final class BackgroundKeeper {
    static let shared = BackgroundKeeper()

    private var player: AVAudioPlayer?
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
    private var owners = Set<String>()
    private(set) var isRunning = false

    private init() {}

    /// iOS exposes one process-wide audio session, but every AutoTap mode owns
    /// an independent lease. Releasing one mode therefore cannot suspend a
    /// different mode that is still active.
    func acquire(owner: String) throws {
        // AVAudioSession and UIApplication work is initiated by AppModel on the
        // main thread. Never synchronously wait for that queue from an engine
        // worker: iOS may suspend it during lock and create a circular wait.
        guard Thread.isMainThread else { throw KeeperError.mainThreadRequired }
        if owners.contains(owner), isRunning, player?.isPlaying == true { return }
        owners.insert(owner)
        if isRunning, player?.isPlaying == true { return }

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)

            let audioPlayer = try AVAudioPlayer(data: Self.keepAliveWaveData())
            audioPlayer.numberOfLoops = -1
            // The PCM stream is non-zero but roughly -90 dB, so iOS keeps a
            // real playback route without producing an audible tone.
            audioPlayer.volume = 1
            audioPlayer.prepareToPlay()
            guard audioPlayer.play() else { throw KeeperError.playbackDidNotStart }
            player = audioPlayer
            isRunning = true
        } catch {
            owners.remove(owner)
            throw error
        }

        if backgroundTask == .invalid {
            backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "AutoTap.HIDKeepAlive") { [weak self] in
                self?.endBackgroundTaskOnly()
            }
        }
    }

    func release(owner: String) {
        if !Thread.isMainThread {
            DispatchQueue.main.async { [weak self] in self?.release(owner: owner) }
            return
        }
        owners.remove(owner)
        guard owners.isEmpty else { return }
        stopPhysicalKeepAlive()
    }

    func releaseAll() {
        if !Thread.isMainThread {
            DispatchQueue.main.async { [weak self] in self?.releaseAll() }
            return
        }
        owners.removeAll()
        stopPhysicalKeepAlive()
    }

    private func stopPhysicalKeepAlive() {
        player?.stop()
        player = nil
        isRunning = false
        endBackgroundTaskOnly()
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    }

    private func endBackgroundTaskOnly() {
        guard backgroundTask != .invalid else { return }
        let task = backgroundTask
        backgroundTask = .invalid
        UIApplication.shared.endBackgroundTask(task)
    }

    private static func keepAliveWaveData() -> Data {
        let sampleRate: UInt32 = 8_000
        let sampleCount = Int(sampleRate)
        let dataSize = UInt32(sampleCount * MemoryLayout<Int16>.size)
        var data = Data()
        data.append(contentsOf: "RIFF".utf8)
        data.appendLittleEndian(UInt32(36) + dataSize)
        data.append(contentsOf: "WAVEfmt ".utf8)
        data.appendLittleEndian(UInt32(16))
        data.appendLittleEndian(UInt16(1))
        data.appendLittleEndian(UInt16(1))
        data.appendLittleEndian(sampleRate)
        data.appendLittleEndian(sampleRate * 2)
        data.appendLittleEndian(UInt16(2))
        data.appendLittleEndian(UInt16(16))
        data.append(contentsOf: "data".utf8)
        data.appendLittleEndian(dataSize)
        for index in 0..<sampleCount {
            let sample: Int16 = index.isMultiple(of: 200) ? 1 : 0
            data.appendLittleEndian(sample)
        }
        return data
    }

    enum KeeperError: LocalizedError {
        case playbackDidNotStart
        case mainThreadRequired

        var errorDescription: String? {
            switch self {
            case .playbackDidNotStart: return "后台音频保活启动失败。"
            case .mainThreadRequired: return "后台保活只能从主界面启动，请关闭并重新开启当前模式。"
            }
        }
    }
}

private extension Data {
    mutating func appendLittleEndian<T: FixedWidthInteger>(_ value: T) {
        var littleEndian = value.littleEndian
        Swift.withUnsafeBytes(of: &littleEndian) { bytes in
            append(contentsOf: bytes)
        }
    }
}
