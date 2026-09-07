#!/usr/bin/env python3
"""
Marcus Vance Adversarial Sales Subagent Runner
Directly drives macOS native SalesHunter Coach window via Quartz.
"""

import time
import subprocess
import Quartz
from AppKit import NSWorkspace

def get_coach_window():
    windows = Quartz.CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionOnScreenOnly, Quartz.kCGNullWindowID)
    for w in windows:
        owner = w.get("kCGWindowOwnerName", "")
        if "coach" in owner.lower() or "saleshunter" in owner.lower():
            bounds = w.get("kCGWindowBounds", {})
            wid = w.get("kCGWindowNumber")
            return wid, int(bounds["X"]), int(bounds["Y"]), int(bounds["Width"]), int(bounds["Height"])
    return None, None, None, None, None

def capture_screenshot(path):
    wid, x, y, w, h = get_coach_window()
    if x is not None:
        subprocess.run(["screencapture", "-x", f"-R{x},{y},{w},{h}", path], check=True)
        print(f"Captured: {path}")
    else:
        print("Window not found for capture")

def click(x, y):
    point = Quartz.CGPointMake(x, y)
    down = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseDown, point, Quartz.kCGMouseButtonLeft)
    up = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseUp, point, Quartz.kCGMouseButtonLeft)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, down)
    time.sleep(0.05)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, up)
    time.sleep(0.2)

def scroll(x, y, dy):
    # Positive dy scrolls UP, negative dy scrolls DOWN
    event = Quartz.CGEventCreateScrollWheelEvent(None, Quartz.kCGScrollEventUnitPixel, 1, dy)
    Quartz.CGEventSetLocation(event, Quartz.CGPointMake(x, y))
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)
    time.sleep(0.1)

def type_text(text):
    # Send characters
    for char in text:
        event_down = Quartz.CGEventCreateKeyboardEvent(None, 0, True)
        Quartz.CGEventKeyboardSetUnicodeString(event_down, len(char), char)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, event_down)
        time.sleep(0.01)
        event_up = Quartz.CGEventCreateKeyboardEvent(None, 0, False)
        Quartz.CGEventKeyboardSetUnicodeString(event_up, len(char), char)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, event_up)
        time.sleep(0.01)

def activate_app():
    subprocess.run(["osascript", "-e", 'tell application "SalesHunter Coach" to activate'], check=False)
    time.sleep(0.3)
    return True

if __name__ == "__main__":
    activate_app()
    wid, x, y, w, h = get_coach_window()
    print(f"Window bounds: {x},{y},{w}x{h}")
    # Scroll all the way up
    for _ in range(8):
        scroll(x + 500, y + 400, 300)
    time.sleep(0.5)
    capture_screenshot("/Users/chrisbenson/.gemini/antigravity-ide/brain/f0bcdeea-277a-4713-97a7-69c996f8dc3f/marcus_top_view.png")
