diff --git a/ticker.js b/ticker.js
index 6e654087c3eb4cc4d44e05924f3494a865d95054..372295f63fa383d6e02f52dab04a8ee3bbaa0206 100644
--- a/ticker.js
+++ b/ticker.js
@@ -1,42 +1,85 @@
-async function loadTicker() {
-  const symbols = ["SPY", "DIA", "QQQ", "VIX", "AAPL", "MSFT"];
-  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`;
+async function loadTicker(target = document.getElementById("ticker-bar")) {
+  if (!target) return;
+
+  const symbols = [
+    { symbol: "^DJI", label: "DJIA" },
+    { symbol: "^IXIC", label: "Nasdaq" },
+    { symbol: "AAPL", label: "Apple" },
+    { symbol: "MSFT", label: "Microsoft" },
+    { symbol: "GOOGL", label: "Google" },
+    { symbol: "AMZN", label: "Amazon" },
+    { symbol: "TSLA", label: "Tesla" },
+    { symbol: "NVDA", label: "Nvidia" }
+  ];
+
+  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols
+    .map((s) => s.symbol)
+    .join(",")}`;
 
   try {
     const res = await fetch(url);
     const data = await res.json();
 
     if (!data.quoteResponse || !data.quoteResponse.result) {
-      document.getElementById("ticker-bar").innerHTML = "Error loading data";
-      return;
+      throw new Error("Missing quote data");
     }
 
     const items = data.quoteResponse.result;
+    const html = symbols
+      .map((config) => {
+        const item = items.find((entry) => entry.symbol === config.symbol);
+        if (!item) return "";
+
+        const name = config.label || item.shortName || item.symbol;
+        const price = item.regularMarketPrice ?? item.bid ?? item.ask;
+        const change = item.regularMarketChange ?? 0;
+        const changePercent = item.regularMarketChangePercent ?? 0;
+        const direction = change >= 0 ? "up" : "down";
 
-    let html = "";
-    for (const item of items) {
-      const name = item.shortName || item.symbol;
-      const price = item.regularMarketPrice;
-      const change = item.regularMarketChange;
-      const changePercent = item.regularMarketChangePercent;
+        return `
+          <div class="ticker-item">
+            <span class="ticker-label">${name}</span>
+            <span class="ticker-price">${price?.toFixed ? price.toFixed(2) : "--"}</span>
+            <span class="ticker-change ${direction}">
+              ${change >= 0 ? "+" : ""}${change.toFixed(2)}
+              (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)
+            </span>
+          </div>
+        `;
+      })
+      .join("");
 
-      html += `
+    if (!html) throw new Error("Empty ticker HTML");
+
+    target.innerHTML = html + html;
+  } catch (err) {
+    if (!target.innerHTML.trim()) {
+      target.innerHTML = `
+        <div class="ticker-item">
+          <span class="ticker-label">Markets</span>
+          <span class="ticker-price">--</span>
+          <span class="ticker-change up">+0.00 (+0.00%)</span>
+        </div>
         <div class="ticker-item">
-          <strong>${name}</strong> • ${price.toFixed(2)}
-          <span style="color:${change >= 0 ? "green" : "red"};">
-            ${change >= 0 ? "+" : ""}${change.toFixed(2)}
-            (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)
-          </span>
+          <span class="ticker-label">Forex</span>
+          <span class="ticker-price">--</span>
+          <span class="ticker-change down">-0.00 (-0.00%)</span>
         </div>
       `;
     }
+  }
+}
 
-    document.getElementById("ticker-bar").innerHTML = html;
+function initializeTicker() {
+  const target = document.getElementById("ticker-bar");
+  if (!target) return;
 
-  } catch (err) {
-    document.getElementById("ticker-bar").innerHTML = "Error loading data";
-  }
+  loadTicker(target);
+  setInterval(() => loadTicker(target), 60000);
 }
 
-loadTicker();
-setInterval(loadTicker, 60000);
+if (document.readyState === "loading") {
+  document.addEventListener("DOMContentLoaded", initializeTicker);
+} else {
+  initializeTicker();
+}
