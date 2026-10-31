"""Drive the Sightline UI headlessly and save screenshots.

python tools/screenshot.py "<company>" "<context or ''>" <out.png> [width] [height] [--founder]
Saves <out.png> (viewport) and <out>-full.png (full page); with --founder also opens the first founder drawer.
"""
import sys

from playwright.sync_api import sync_playwright

URL = "http://localhost:5000/"


def main(name: str, ctx: str, out: str, width=1440, height=900, founder=False):
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": width, "height": height})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))
        page.goto(URL)
        page.wait_for_selector("#examples .ex", timeout=10_000)
        if ctx == "@chip":  # click the sample chip with this title
            page.locator("#examples .ex", has_text=name).first.click()
        else:
            page.fill("#q", f"{name} — {ctx}" if ctx else name)
            page.click("#run")
        page.wait_for_selector("#co-name", timeout=90_000)
        page.wait_for_function("!document.querySelector('#run').disabled", timeout=90_000)
        try:  # research finished (step message changes) and financials settled
            page.wait_for_function("/^(Done|Profile ready,)/.test(document.querySelector('#step-msg').textContent)", timeout=120_000)
            page.wait_for_function("!document.querySelector('#pnl .skel')", timeout=120_000)
        except Exception:
            print("research/financials did not settle")
        page.wait_for_timeout(1200)
        page.screenshot(path=out, full_page=False)
        page.screenshot(path=out.replace(".png", "-full.png"), full_page=True)
        if page.locator(".pnl-cell").count():
            page.locator("#pnl").scroll_into_view_if_needed()
            page.locator(".pnl-cell").first.click()
            page.wait_for_timeout(300)
            page.screenshot(path=out.replace(".png", "-pnl.png"), full_page=False)
            page.keyboard.press("Escape")
        if founder and page.locator(".f-card").count():
            page.locator(".f-card").first.click()
            page.wait_for_timeout(500)
            page.screenshot(path=out.replace(".png", "-founder.png"), full_page=False)
        print("errors:", errors or "none")
        b.close()


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--founder"]
    main(args[0], args[1], args[2], *(int(x) for x in args[3:5]), founder="--founder" in sys.argv)
