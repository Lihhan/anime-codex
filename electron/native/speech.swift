import Foundation
import AVFoundation
import Darwin

// Local installed voices only. No audio/input recording or network service.
final class Completion: NSObject, AVSpeechSynthesizerDelegate {
    var done = false
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) { done = true }
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) { done = true }
}
func emit(_ value: Any) throws {
    let data = try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    print(String(decoding: data, as: UTF8.self))
    fflush(stdout)
}
do {
    let input = FileHandle.standardInput.readDataToEndOfFile()
    guard let p = try JSONSerialization.jsonObject(with: input) as? [String: Any] else { throw NSError(domain: "Invalid speech input", code: 1) }
    let voices = AVSpeechSynthesisVoice.speechVoices()
    if p["mode"] as? String == "voices" {
        try emit(voices.map { ["name": $0.name, "id": $0.identifier, "lang": $0.language, "gender": $0.gender == .female ? "Female" : $0.gender == .male ? "Male" : "Unknown"] })
    } else {
        guard let text = p["text"] as? String, !text.isEmpty, text.count <= 2000,
              let lang = p["lang"] as? String, ["zh-CN", "en-US", "ja-JP"].contains(lang),
              let pitch = p["pitch"] as? Double, (0.8...1.35).contains(pitch),
              let rate = p["rate"] as? Double, (0.5...2.0).contains(rate) else { throw NSError(domain: "Invalid speech request", code: 1) }
        let requested = p["voice"] as? String ?? ""
        let matching = voices.filter { $0.language == lang || $0.language.prefix(2) == lang.prefix(2) }
        let voice = requested.isEmpty ? (matching.first { $0.gender == .female } ?? matching.first) : matching.first { $0.identifier == requested || $0.name == requested }
        guard let selected = voice else { throw NSError(domain: "No installed system voice for " + lang, code: 1) }
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = selected
        utterance.pitchMultiplier = Float(pitch)
        utterance.rate = min(AVSpeechUtteranceMaximumSpeechRate, max(AVSpeechUtteranceMinimumSpeechRate, AVSpeechUtteranceDefaultSpeechRate * Float(rate)))
        let completion = Completion(), synthesizer = AVSpeechSynthesizer()
        synthesizer.delegate = completion
        let parent = getppid()
        synthesizer.speak(utterance)
        while !completion.done {
            if getppid() != parent { synthesizer.stopSpeaking(at: .immediate); exit(0) }
            RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.05))
        }
        try emit(["spoken": true, "voice": selected.name, "pitch": pitch, "rate": rate])
    }
} catch {
    FileHandle.standardError.write(Data((error.localizedDescription + "\n").utf8))
    exit(1)
}
