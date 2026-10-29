import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

const crashWatch = `
(function () {
  var text = "";
  function paint() {
    if (!text || !document.body || document.getElementById("pinora-crash")) return;
    var box = document.createElement("pre");
    box.id = "pinora-crash";
    box.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;max-height:46vh;overflow:auto;z-index:99999;margin:0;padding:12px 14px;background:#241910;color:#f4efe4;font:13px/1.45 ui-sans-serif,sans-serif;white-space:pre-wrap";
    box.textContent = text;
    document.body.appendChild(box);
  }
  function note(message, stack) {
    var next = String(message || "");
    if (stack) next += "\\n" + stack;
    if (!next.trim()) return;
    text = next;
    paint();
  }
  window.addEventListener("error", function (event) {
    note(event.message, event.error && event.error.stack);
  });
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    note(reason && reason.message ? reason.message : reason, reason && reason.stack);
  });
  function arm() {
    if (!document.body || document.body.dataset.pinoraWatch) return;
    document.body.dataset.pinoraWatch = "1";
    new MutationObserver(paint).observe(document.body, { childList: true });
  }
  new MutationObserver(function () {
    arm();
    paint();
  }).observe(document.documentElement, { childList: true });
  arm();
})();
`;

export const metadata: Metadata = {
  title: "Pinora · Dayfive",
  description: "Five folk practices. One minute. The same round for the whole world.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560&family=Outfit:wght@380;560;650&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Script id="pinora-crash-watch" strategy="beforeInteractive">
          {crashWatch}
        </Script>
        {children}
      </body>
    </html>
  );
}
