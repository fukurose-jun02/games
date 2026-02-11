from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the game from the file system
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Initial screenshot
        page.screenshot(path="verification/initial.png")
        print("Initial state screenshot taken.")

        # Check initial state
        initial_time = page.evaluate("state.time")
        initial_distance = page.evaluate("state.distance")
        print(f"Initial Time: {initial_time}, Initial Distance: {initial_distance}")

        # Start game by pressing Space
        page.keyboard.press("Space")
        print("Pressed Space to start game.")

        # Wait for a second to let the loop run
        page.wait_for_timeout(1000)

        # Check state again
        current_time = page.evaluate("state.time")
        current_distance = page.evaluate("state.distance")
        print(f"Current Time: {current_time}, Current Distance: {current_distance}")

        # Screenshot after running
        page.screenshot(path="verification/verification.png")
        print("Running state screenshot taken.")

        if current_distance < initial_distance:
            print("SUCCESS: Distance decreased, game loop is running.")
        else:
            print("FAILURE: Distance did not decrease, game loop might be stuck.")

        if current_time < initial_time:
             print("SUCCESS: Time decreased.")
        else:
             print("FAILURE: Time did not decrease.")

        browser.close()

if __name__ == "__main__":
    run()
