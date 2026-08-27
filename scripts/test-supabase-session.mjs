import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath:
    process.env.MAGISTER_CHROME_EXECUTABLE ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

const context = await browser.newContext();
const page = await context.newPage();

await page.goto(
  "http://localhost:3001/login",
  {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  },
);

console.log("");
console.log("LOGIN PAGINA:", page.url());

console.log("");
console.log("=== AUTH COOKIES ===");

const cookies = await context.cookies();

for (const cookie of cookies) {
  if (
    cookie.name.toLowerCase().includes("auth") ||
    cookie.name.toLowerCase().includes("sb-")
  ) {
    console.log(
      cookie.name,
      "| domain:",
      cookie.domain,
      "| expires:",
      cookie.expires,
    );
  }
}

console.log("");
console.log("=== SUPABASE STORAGE ===");

const storage = await page.evaluate(() => {
  const entries = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (
      key &&
      (
        key.toLowerCase().includes("supabase") ||
        key.toLowerCase().includes("auth")
      )
    ) {
      entries[key] = localStorage.getItem(key);
    }
  }

  return entries;
});

console.log(
  JSON.stringify(storage, null, 2),
);

await browser.close();

console.log("");
console.log("=========================================================");
console.log(" KLAAR - READ ONLY");
console.log("=========================================================");
