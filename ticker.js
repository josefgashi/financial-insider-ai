diff --git a/ticker.js b/ticker.js
index 6e654087c3eb4cc4d44e05924f3494a865d95054..683a6935d1a7200ad01b80e7477b331cc259a612 100644
--- a/ticker.js
+++ b/ticker.js
@@ -1,42 +1,72 @@
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
+      target.innerHTML = "Error loading data";
       return;
     }
 
     const items = data.quoteResponse.result;
-
     let html = "";
-    for (const item of items) {
-      const name = item.shortName || item.symbol;
-      const price = item.regularMarketPrice;
-      const change = item.regularMarketChange;
-      const changePercent = item.regularMarketChangePercent;
+
+    for (const config of symbols) {
+      const item = items.find((entry) => entry.symbol === config.symbol);
+      if (!item) continue;
+
+      const name = config.label || item.shortName || item.symbol;
+      const price = item.regularMarketPrice ?? item.bid ?? item.ask;
+      const change = item.regularMarketChange ?? 0;
+      const changePercent = item.regularMarketChangePercent ?? 0;
+      const direction = change >= 0 ? "up" : "down";
 
       html += `
         <div class="ticker-item">
-          <strong>${name}</strong> • ${price.toFixed(2)}
-          <span style="color:${change >= 0 ? "green" : "red"};">
+          <span class="ticker-label">${name}</span>
+          <span>${price?.toFixed ? price.toFixed(2) : "--"}</span>
+          <span class="ticker-change ${direction}">
             ${change >= 0 ? "+" : ""}${change.toFixed(2)}
             (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)
           </span>
         </div>
       `;
     }
 
-    document.getElementById("ticker-bar").innerHTML = html;
-
+    // Duplicate content to create a seamless marquee loop
+    target.innerHTML = html + html;
   } catch (err) {
-    document.getElementById("ticker-bar").innerHTML = "Error loading data";
+    target.innerHTML = "Error loading data";
   }
 }
 
-loadTicker();
-setInterval(loadTicker, 60000);
+function initializeTicker() {
+  const target = document.getElementById("ticker-bar");
+  if (!target) return;
+
+  loadTicker(target);
+  setInterval(() => loadTicker(target), 60000);
+}
+
+if (document.readyState === "loading") {
+  document.addEventListener("DOMContentLoaded", initializeTicker);
+} else {
+  initializeTicker();
+}
