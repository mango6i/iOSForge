import Foundation

enum IPRegion: Equatable, Sendable {
    case mainlandChina
    case outsideMainlandChina
    case unknown

    var shouldShowGoogleLogin: Bool {
        self == .outsideMainlandChina
    }

    static func classify(countryCode: String?) -> IPRegion {
        guard let countryCode else { return .unknown }
        let code = countryCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard code.count == 2, code.allSatisfy({ $0.isLetter && $0.isASCII }) else {
            return .unknown
        }
        return code == "CN" ? .mainlandChina : .outsideMainlandChina
    }
}

/// Resolves only the public-IP country code. Unknown or failed lookups fail closed,
/// so a lookup error never exposes the Google sign-in entry in mainland China.
actor IPRegionService {
    static let shared = IPRegionService()

    private let session: URLSession
    private let endpoint = AppConstants.ipCountryLookupURL
    private let cacheDuration: TimeInterval = 20 * 60
    private var cachedRegion: (value: IPRegion, date: Date)?
    private var inFlight: Task<IPRegion, Never>?

    init() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 5
        configuration.timeoutIntervalForResource = 5
        configuration.urlCache = nil
        configuration.httpCookieStorage = nil
        session = URLSession(configuration: configuration)
    }

    func resolve(forceRefresh: Bool = false) async -> IPRegion {
        if !forceRefresh,
           let cachedRegion,
           Date().timeIntervalSince(cachedRegion.date) < cacheDuration {
            return cachedRegion.value
        }
        if let inFlight { return await inFlight.value }

        let task = Task { await self.fetchRegion() }
        inFlight = task
        let result = await task.value
        inFlight = nil
        if result != .unknown { cachedRegion = (result, Date()) }
        return result
    }

    private func fetchRegion() async -> IPRegion {
        var request = URLRequest(url: endpoint, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 5)
        request.setValue("text/plain", forHTTPHeaderField: "Accept")

        do {
            let (data, response) = try await session.data(for: request)
            guard let response = response as? HTTPURLResponse,
                  (200..<300).contains(response.statusCode),
                  let countryCode = String(data: data, encoding: .utf8) else {
                return .unknown
            }
            return IPRegion.classify(countryCode: countryCode)
        } catch {
            return .unknown
        }
    }
}
