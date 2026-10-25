import Foundation
import SQLite3

@main struct CoreSelfTests {
    static func main() throws {
        func expect(_ test: Bool, _ message:String) { precondition(test,message) }
        expect(ProfileResult.parse(["forbid":2,"name":"主号昵称"]).outcome == .normal,"normal code")
        let abnormal = ProfileResult.parse(["forbid":10,"name":"分身昵称"])
        expect(abnormal.outcome == .abnormal && abnormal.text.contains("10 / CHEAT"),"CHEAT raw mark")
        expect(abnormal.name == "分身昵称","independent nickname")
        for invalid in [[String:Any](),["forbid":0],["forbid":999],["forbid":true],["forbid":"2"],["forbid":2.5],["forbid":12]] {
            expect(ProfileResult.parse(invalid).outcome == .unknown,"never default missing or unknown to normal")
        }
        for code in ProfileResult.constants.keys where code != 2 && code != 12 {
            let result = ProfileResult.parse(["forbid":code])
            expect(result.outcome == .abnormal && result.rawMark == String(code),"preserve known mark")
        }
        let source = "/fixture/树洞①"
        let row = AccountRow(sourceID:source,fullID:"tester^1",number:0,nickname:"完整长昵称不会截断",databaseURL:URL(fileURLWithPath:"/fixture/tester^1.db"))
        let pair = Pairing.pairs(source:source,accounts:[row],firstNumber:3)
        expect(pair.count == 2 && pair.map(\.number) == [3,3],"same group number")
        expect(pair[0].outcome == .missing && pair[1].fullID == "tester^1","missing main explicit")
        let other = AccountRow(sourceID:"/fixture/树洞②",fullID:"tester^1",number:0,nickname:row.nickname,databaseURL:row.databaseURL)
        expect(other.id != row.id,"same nickname/ID across sources is distinct")
        expect(!Pairing.validID("tester^2") && !Pairing.validID("../tester"),"exact ^1 pairing")
        expect(Pairing.validID("C-tester^1"),"test prefixes must never be stripped")
        let request = try JSONSerialization.jsonObject(with:ReadOnlyProtocol.request(userID:"tester^1",sequence:7)) as! [String:Any]
        expect(request["proto"] as? String == "fetchProfileReq" && request["userid"] as? String == "tester^1" && request.count == 3,"only ordinary profile request")
        expect(ReadOnlyProtocol.sessionFailure(["proto":"otherPlaceLogin"]) == .sessionRestricted,"session restriction")
        let config:[String:Any] = ["deviceId":"test-device","deviceUuid":"test-uuid","dataCenter":"do","murls_do_pro":["example.com:443"]]
        expect(try ConnectionConfig.parse(config).endpoints[0].host == "example.com","read original config")
        for invalidHost in ["http://example.com","example.com?token=x","user@example.com","example.com/path"] {
            var bad = config; bad["murls_do_pro"] = [invalidHost]
            do { _ = try ConnectionConfig.parse(bad); preconditionFailure("bad server config accepted") } catch {}
        }
        let temp = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at:temp,withIntermediateDirectories:true)
        defer { try? FileManager.default.removeItem(at:temp) }
        let dbURL = temp.appendingPathComponent("tester^1.db")
        var handle:OpaquePointer?
        expect(sqlite3_open(dbURL.path,&handle) == SQLITE_OK,"fixture database")
        expect(sqlite3_exec(handle,"CREATE TABLE UserProfile(k TEXT,v TEXT); CREATE TABLE Profiles(userid TEXT,k TEXT,v TEXT); INSERT INTO UserProfile VALUES('mpasswd','\"fake-test-only\"'); INSERT INTO Profiles VALUES('tester^1','name','\"分身独立昵称\"');",nil,nil,nil) == SQLITE_OK,"fixture rows")
        sqlite3_close(handle)
        let before = try Data(contentsOf:dbURL)
        do {
            let db = try ReadOnlyDatabase(dbURL)
            expect(try db.credential() == "fake-test-only","credential read")
            expect(try db.nickname(userID:"tester^1",shared:false) == "分身独立昵称","own nickname read")
            do { _ = try db.rows("DELETE FROM UserProfile"); preconditionFailure("mutation accepted") } catch {}
        }
        expect(try Data(contentsOf:dbURL) == before,"source bytes unchanged")
        let scan = DirectoryScanner.scan(temp)
        expect(scan.rows.count == 1 && scan.issue != nil,"missing shared is explicit")
        let empty = temp.appendingPathComponent("empty")
        try FileManager.default.createDirectory(at:empty,withIntermediateDirectories:true)
        expect(DirectoryScanner.scan(empty).issue != nil,"empty scan is not normal")
        let corrupt = temp.appendingPathComponent("broken.db")
        try Data("not SQLite".utf8).write(to:corrupt)
        let broken = DirectoryScanner.scan(temp).rows.first(where:{$0.fullID == "broken"})
        expect(broken?.localIssue == .invalidDatabase,"unreadable account visible")
        let parent = temp.appendingPathComponent("batch")
        for name in ["树洞①","树洞②","其他应用"] {
            try FileManager.default.createDirectory(at:parent.appendingPathComponent(name),withIntermediateDirectories:true)
        }
        let batch = try DirectoryScanner.discover(parent)
        expect(Set(batch.map(\.lastPathComponent)) == Set(["树洞①","树洞②"]),"one parent selection discovers the tree sources only")
        print("PASS: status mapping, independent names, pairing, sources, configuration, safe protocol, SQLite read-only and empty/error scans")
    }
}
