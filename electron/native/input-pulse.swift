import Foundation
import CoreGraphics
// Aggregate event counts only. Never reads key codes, typed text, titles, or clipboard.
let source = CGEventSourceStateID.combinedSessionState
var lastKeys = CGEventSource.counterForEventType(source, eventType: .keyDown)
var lastClicks = CGEventSource.counterForEventType(source, eventType: .leftMouseDown)
while true {
    Thread.sleep(forTimeInterval: 0.2)
    let keys = CGEventSource.counterForEventType(source, eventType: .keyDown)
    let clicks = CGEventSource.counterForEventType(source, eventType: .leftMouseDown)
    let keyDelta = keys >= lastKeys ? min(keys - lastKeys, 100) : 0
    let clickDelta = clicks >= lastClicks ? min(clicks - lastClicks, 20) : 0
    if keyDelta > 0 || clickDelta > 0 {
        print("{\"keys\":\(keyDelta),\"clicks\":\(clickDelta)}")
        fflush(stdout)
    }
    lastKeys = keys
    lastClicks = clicks
}
