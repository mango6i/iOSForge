import AVFoundation
import Foundation

final class BackgroundKeeper {
    static let shared = BackgroundKeeper()

    private let engine = AVAudioEngine()
    private var sourceNode: AVAudioSourceNode?
    private(set) var isRunning = false

    private init() {}

    func start() throws {
        guard !isRunning else { return }
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try session.setActive(true)

        guard let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1) else {
            throw KeeperError.audioFormatUnavailable
        }

        let node = AVAudioSourceNode { _, _, _, audioBufferList -> OSStatus in
            let buffers = UnsafeMutableAudioBufferListPointer(audioBufferList)
            for buffer in buffers {
                if let data = buffer.mData {
                    memset(data, 0, Int(buffer.mDataByteSize))
                }
            }
            return noErr
        }
        sourceNode = node
        engine.attach(node)
        engine.connect(node, to: engine.mainMixerNode, format: format)
        engine.mainMixerNode.outputVolume = 0.0001
        engine.prepare()
        try engine.start()
        isRunning = true
    }

    func stop() {
        guard isRunning || sourceNode != nil else { return }
        engine.stop()
        if let node = sourceNode {
            engine.disconnectNodeOutput(node)
            engine.detach(node)
        }
        sourceNode = nil
        isRunning = false
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    }

    enum KeeperError: LocalizedError {
        case audioFormatUnavailable

        var errorDescription: String? { "无法创建后台音频格式。" }
    }
}

