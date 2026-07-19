import { chromium } from "playwright";

async function run() {
  console.log("Launching browser to inspect layout...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  
  const layoutInfo = await page.evaluate(() => {
    const getStyleInfo = (el) => {
      if (!el) return null;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        tagName: el.tagName.toLowerCase(),
        id: el.id || "",
        className: el.className || "",
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        margin: style.margin,
        padding: style.padding,
        display: style.display,
        position: style.position,
        maxWidth: style.maxWidth,
        boxSizing: style.boxSizing
      };
    };
    
    const info = [];
    
    // 1. html
    const htmlEl = document.documentElement;
    info.push({ label: "html", ...getStyleInfo(htmlEl) });
    
    // 2. body
    const bodyEl = document.body;
    info.push({ label: "body", ...getStyleInfo(bodyEl) });
    
    // 3. root
    const rootEl = document.getElementById("root");
    info.push({ label: "root", ...getStyleInfo(rootEl) });
    
    // 4. ClickSpark div (first child of root)
    const clickSparkEl = rootEl ? rootEl.firstElementChild : null;
    info.push({ label: "ClickSpark div", ...getStyleInfo(clickSparkEl) });
    
    // 5. Page wrapper (inside ClickSpark)
    const pageWrapperEl = clickSparkEl ? clickSparkEl.querySelector(".min-h-screen") : null;
    info.push({ label: "Page wrapper", ...getStyleInfo(pageWrapperEl) });
    
    // 6. SiteHeader
    const headerEl = document.querySelector("header");
    info.push({ label: "SiteHeader", ...getStyleInfo(headerEl) });
    
    // 7. Hero section
    const heroEl = document.querySelector("section");
    info.push({ label: "Hero section", ...getStyleInfo(heroEl) });
    
    return info;
  });
  
  console.log("Layout Info:\n", JSON.stringify(layoutInfo, null, 2));
  await browser.close();
}

run().catch(console.error);
