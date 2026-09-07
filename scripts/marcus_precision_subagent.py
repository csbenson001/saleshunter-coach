#!/usr/bin/env python3
"""
Marcus Vance Precision Subagent: Exact UI Coordinates Execution
"""

import time
import subprocess
import os
import Quartz

ARTIFACT_DIR = "/Users/chrisbenson/.gemini/antigravity-ide/brain/f0bcdeea-277a-4713-97a7-69c996f8dc3f"

def get_coach_window():
    windows = Quartz.CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionOnScreenOnly, Quartz.kCGNullWindowID)
    for w in windows:
        owner = w.get("kCGWindowOwnerName", "")
        if "coach" in owner.lower() or "saleshunter" in owner.lower():
            bounds = w.get("kCGWindowBounds", {})
            wid = w.get("kCGWindowNumber")
            return wid, int(bounds["X"]), int(bounds["Y"]), int(bounds["Width"]), int(bounds["Height"])
    return None, None, None, None, None

def capture(filename):
    wid, x, y, w, h = get_coach_window()
    path = os.path.join(ARTIFACT_DIR, filename)
    subprocess.run(["screencapture", "-x", f"-R{x},{y},{w},{h}", path], check=True)
    print(f"Captured: {filename}")
    return path

def click(x, y):
    point = Quartz.CGPointMake(x, y)
    down = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseDown, point, Quartz.kCGMouseButtonLeft)
    up = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseUp, point, Quartz.kCGMouseButtonLeft)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, down)
    time.sleep(0.05)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, up)
    time.sleep(0.25)

def scroll_px(x, y, dy):
    event = Quartz.CGEventCreateScrollWheelEvent(None, Quartz.kCGScrollEventUnitPixel, 1, dy)
    Quartz.CGEventSetLocation(event, Quartz.CGPointMake(x, y))
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)
    time.sleep(0.08)

def scroll_to_top(x, y):
    for _ in range(8):
        scroll_px(x + 500, y + 400, 350)
    time.sleep(0.3)

def run_precision_trials():
    subprocess.run(["osascript", "-e", 'tell application "SalesHunter Coach" to activate'], check=False)
    time.sleep(0.4)

    wid, wx, wy, ww, wh = get_coach_window()
    print(f"Window bounds: ({wx}, {wy}) {ww}x{wh}")

    # Reset to top
    scroll_to_top(wx, wy)

    # 1. Click CFO Budget Freeze Scenario Card
    cfo_card = (wx + 260, wy + 200)
    print(f"Clicking CFO Scenario card at {cfo_card}...")
    click(*cfo_card)
    time.sleep(0.3)

    # 2. Click Execute Proof Simulation
    sim_btn = (wx + 250, wy + 430)
    print(f"Clicking Execute Proof Simulation at {sim_btn}...")
    click(*sim_btn)
    time.sleep(0.6)
    capture("marcus_real_cfo_simulation_result.png")

    # 3. Click Gong / Chorus Incumbent Ambush Scenario Card
    gong_card = (wx + 500, wy + 200)
    print(f"Clicking Gong Incumbent Ambush card at {gong_card}...")
    click(*gong_card)
    time.sleep(0.3)

    # 4. Click Execute Proof Simulation
    print(f"Clicking Execute Proof Simulation at {sim_btn}...")
    click(*sim_btn)
    time.sleep(0.6)
    capture("marcus_real_gong_simulation_result.png")

    # 5. Click Chip 3: "CFO budget freeze" in Section 2
    cfo_chip = (wx + 685, wy + 545)
    print(f"Clicking 'CFO budget freeze' chip at {cfo_chip}...")
    click(*cfo_chip)
    time.sleep(0.6)
    capture("marcus_real_cfo_chip_tested.png")

    # Scroll down to view the full scorecard
    scroll_px(wx + 500, wy + 400, -350)
    time.sleep(0.3)
    capture("marcus_real_cfo_chip_scorecard.png")

    # Scroll back up
    scroll_to_top(wx, wy)

    # 6. Click Chip 1: "Can we get 20% off?" (Give-to-Get Matrix)
    discount_chip = (wx + 380, wy + 545)
    print(f"Clicking 'Can we get 20% off?' concession chip at {discount_chip}...")
    click(*discount_chip)
    time.sleep(0.6)
    capture("marcus_real_concession_chip_tested.png")

    # Scroll down to view the concession radar
    scroll_px(wx + 500, wy + 400, -350)
    time.sleep(0.3)
    capture("marcus_real_concession_chip_radar.png")

    print("\n--- ALL PRECISION TRIALS COMPLETE ---")

if __name__ == "__main__":
    run_precision_trials()
