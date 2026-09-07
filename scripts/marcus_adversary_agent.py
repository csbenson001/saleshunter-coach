#!/usr/bin/env python3
"""
Marcus 'The Closer' Vance Autonomous Adversary Subagent
Directly drives and evaluates SalesHunter Coach native app via macOS Quartz events.

Runs 4 Battlefield Trials:
  Trial 1: The Ruthless CFO Budget Freeze Drill ($85,000 Target)
  Trial 2: The Gong / Chorus Incumbent Ambush Drill ($55,000 Target)
  Trial 3: The Vague 'Send Me an Email' Trap Drill ($40,000 Target)
  Trial 4: Real-Time Objection Arena: Gong & Concession Testing
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
    time.sleep(0.06)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, up)
    time.sleep(0.2)

def double_click(x, y):
    point = Quartz.CGPointMake(x, y)
    for i in (1, 2):
        down = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseDown, point, Quartz.kCGMouseButtonLeft)
        Quartz.CGEventSetIntegerValueField(down, Quartz.kCGMouseEventClickState, i)
        up = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseUp, point, Quartz.kCGMouseButtonLeft)
        Quartz.CGEventSetIntegerValueField(up, Quartz.kCGMouseEventClickState, i)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, down)
        time.sleep(0.04)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, up)
        time.sleep(0.04)
    time.sleep(0.2)

def triple_click(x, y):
    point = Quartz.CGPointMake(x, y)
    for i in (1, 2, 3):
        down = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseDown, point, Quartz.kCGMouseButtonLeft)
        Quartz.CGEventSetIntegerValueField(down, Quartz.kCGMouseEventClickState, i)
        up = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventLeftMouseUp, point, Quartz.kCGMouseButtonLeft)
        Quartz.CGEventSetIntegerValueField(up, Quartz.kCGMouseEventClickState, i)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, down)
        time.sleep(0.04)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, up)
        time.sleep(0.04)
    time.sleep(0.2)

def scroll_px(x, y, dy):
    event = Quartz.CGEventCreateScrollWheelEvent(None, Quartz.kCGScrollEventUnitPixel, 1, dy)
    Quartz.CGEventSetLocation(event, Quartz.CGPointMake(x, y))
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)
    time.sleep(0.08)

def scroll_to_top(x, y):
    for _ in range(10):
        scroll_px(x + 500, y + 400, 300)
    time.sleep(0.4)

def select_all_and_delete():
    # Cmd+A
    cmd_down = Quartz.CGEventCreateKeyboardEvent(None, 0x37, True)
    a_down = Quartz.CGEventCreateKeyboardEvent(None, 0x00, True)
    a_up = Quartz.CGEventCreateKeyboardEvent(None, 0x00, False)
    cmd_up = Quartz.CGEventCreateKeyboardEvent(None, 0x37, False)
    
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, cmd_down)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, a_down)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, a_up)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, cmd_up)
    time.sleep(0.1)
    
    # Backspace
    bs_down = Quartz.CGEventCreateKeyboardEvent(None, 0x33, True)
    bs_up = Quartz.CGEventCreateKeyboardEvent(None, 0x33, False)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, bs_down)
    Quartz.CGEventPost(Quartz.kCGHIDEventTap, bs_up)
    time.sleep(0.1)

def type_string(text):
    for char in text:
        ev_down = Quartz.CGEventCreateKeyboardEvent(None, 0, True)
        Quartz.CGEventKeyboardSetUnicodeString(ev_down, len(char), char)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, ev_down)
        time.sleep(0.012)
        ev_up = Quartz.CGEventCreateKeyboardEvent(None, 0, False)
        Quartz.CGEventKeyboardSetUnicodeString(ev_up, len(char), char)
        Quartz.CGEventPost(Quartz.kCGHIDEventTap, ev_up)
        time.sleep(0.012)
    time.sleep(0.2)

def run_adversary_trials():
    subprocess.run(["osascript", "-e", 'tell application "SalesHunter Coach" to activate'], check=False)
    time.sleep(0.5)

    wid, wx, wy, ww, wh = get_coach_window()
    print(f"[Marcus Vance Subagent] Connected to window ID {wid} at ({wx}, {wy}) {ww}x{wh}")

    # Step 0: Ensure scrolled to top
    print("[Marcus Vance Subagent] Resetting scroll to top...")
    scroll_to_top(wx, wy)
    capture("subagent_step0_initial_top.png")

    # TRIAL 1: The Ruthless CFO Budget Freeze
    print("\n--- TRIAL 1: The Ruthless CFO Budget Freeze Drill ---")
    cfo_card_x = wx + 260
    cfo_card_y = wy + 240
    print(f"Clicking CFO Budget Freeze card at ({cfo_card_x}, {cfo_card_y})...")
    click(cfo_card_x, cfo_card_y)
    time.sleep(0.3)

    sim_btn_x = wx + 250
    sim_btn_y = wy + 520
    print(f"Clicking Execute Proof Simulation at ({sim_btn_x}, {sim_btn_y})...")
    start_t = time.time()
    click(sim_btn_x, sim_btn_y)
    latency_trial1 = (time.time() - start_t) * 1000
    time.sleep(0.8)
    capture("subagent_trial1_cfo_sim_result.png")
    print(f"Trial 1 executed (UI click latency: {latency_trial1:.1f}ms)")

    # TRIAL 2: The Gong / Chorus Incumbent Ambush
    print("\n--- TRIAL 2: The Gong / Chorus Incumbent Ambush Drill ---")
    gong_card_x = wx + 480
    gong_card_y = wy + 240
    print(f"Clicking Gong Incumbent Ambush card at ({gong_card_x}, {gong_card_y})...")
    click(gong_card_x, gong_card_y)
    time.sleep(0.3)

    print("Executing Proof Simulation for Gong Ambush...")
    start_t = time.time()
    click(sim_btn_x, sim_btn_y)
    latency_trial2 = (time.time() - start_t) * 1000
    time.sleep(0.8)
    capture("subagent_trial2_gong_sim_result.png")
    print(f"Trial 2 executed (UI click latency: {latency_trial2:.1f}ms)")

    # TRIAL 3: The Vague 'Send Me an Email' Trap Drill
    print("\n--- TRIAL 3: The Vague 'Send Me an Email' Trap Drill ---")
    email_card_x = wx + 720
    email_card_y = wy + 240
    print(f"Clicking Send Me an Email Trap card at ({email_card_x}, {email_card_y})...")
    click(email_card_x, email_card_y)
    time.sleep(0.3)

    print("Executing Proof Simulation for Timing Trap...")
    start_t = time.time()
    click(sim_btn_x, sim_btn_y)
    latency_trial3 = (time.time() - start_t) * 1000
    time.sleep(0.8)
    capture("subagent_trial3_email_trap_result.png")
    print(f"Trial 3 executed (UI click latency: {latency_trial3:.1f}ms)")

    # Scroll down to reveal Live Objection Buster Arena
    print("\n--- TRIAL 4: Real-Time Objection & Concession Radar Arena ---")
    print("Scrolling down to reveal Objection Arena...")
    for _ in range(5):
        scroll_px(wx + 500, wy + 400, -350)
        time.sleep(0.1)
    time.sleep(0.4)
    capture("subagent_trial4_scrolled_to_arena.png")

    # In scrolled view, locate input box and prove button
    # Let's target the input box
    input_x = wx + 400
    input_y = wy + 250  # After scrolling down ~1750px, the input is near top of scrolled view
    print(f"Clicking text input at ({input_x}, {input_y})...")
    click(input_x, input_y)
    time.sleep(0.2)
    select_all_and_delete()

    objection_text = "We already use Gong and it records everything. Why pay for you?"
    print(f"Typing objection: '{objection_text}'...")
    type_string(objection_text)
    time.sleep(0.3)
    capture("subagent_trial4_typed_gong.png")

    prove_btn_x = wx + 960
    prove_btn_y = wy + 250
    print(f"Clicking Prove It button at ({prove_btn_x}, {prove_btn_y})...")
    start_t = time.time()
    click(prove_btn_x, prove_btn_y)
    latency_trial4_a = (time.time() - start_t) * 1000
    time.sleep(0.8)
    capture("subagent_trial4_gong_tested.png")

    # Scroll slightly more to see full scorecard of objection test
    scroll_px(wx + 500, wy + 400, -250)
    time.sleep(0.3)
    capture("subagent_trial4_gong_scorecard.png")

    # Now test Chip: "Can we get a 30% discount?"
    print("\nTesting Discount Concession Radar...")
    scroll_to_top(wx, wy)
    for _ in range(4):
        scroll_px(wx + 500, wy + 400, -300)
    time.sleep(0.4)

    click(input_x, input_y)
    select_all_and_delete()
    discount_text = "Your price is 30% higher than what we budgeted."
    print(f"Typing discount objection: '{discount_text}'...")
    type_string(discount_text)
    time.sleep(0.3)
    click(prove_btn_x, prove_btn_y)
    time.sleep(0.8)
    capture("subagent_trial4_discount_tested.png")

    # Scroll to see Concession Radar HUD
    scroll_px(wx + 500, wy + 400, -300)
    time.sleep(0.3)
    capture("subagent_trial4_concession_hud_view.png")

    print("\n=======================================================")
    print("  MARCUS VANCE AUTONOMOUS SUBAGENT TRIAL COMPLETE")
    print("=======================================================")

if __name__ == "__main__":
    run_adversary_trials()
