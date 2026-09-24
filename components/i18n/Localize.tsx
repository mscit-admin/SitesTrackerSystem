"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";

// Runtime translator. Swaps any on-screen text (and placeholder/title/aria-label
// attributes) whose trimmed content exactly matches a catalog entry with the
// active language's translation. Because the catalog only contains authored UI
// strings (from the source code), dynamic data (site names, user input) is never
// matched — so it is safe. Active only for non-source languages.
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "INPUT"]);
const ATTRS = ["placeholder", "title", "aria-label"];

export function Localize() {
  const { messages } = useLocale();

  useEffect(() => {
    const hasTranslations = messages && Object.keys(messages).length > 0;
    if (!hasTranslations) return;

    let applying = false;
    let scheduled = false;

    const translateTextNode = (node: Text) => {
      const v = node.nodeValue;
      if (!v) return;
      const key = v.trim();
      if (!key) return;
      const rep = messages[key];
      if (rep && rep !== key) node.nodeValue = v.replace(key, rep);
    };

    const translateEl = (el: Element) => {
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (!v) continue;
        const rep = messages[v.trim()];
        if (rep && rep !== v.trim()) el.setAttribute(a, rep);
      }
    };

    const apply = () => {
      applying = true;
      try {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const texts: Text[] = [];
        let n: Node | null;
        while ((n = walker.nextNode())) {
          const parent = (n as Text).parentElement;
          if (parent && SKIP_TAGS.has(parent.tagName)) continue;
          texts.push(n as Text);
        }
        texts.forEach(translateTextNode);
        document.querySelectorAll("[placeholder],[title],[aria-label]").forEach(translateEl);
      } finally {
        applying = false;
      }
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; apply(); });
    };

    apply();
    const obs = new MutationObserver(() => { if (!applying) schedule(); });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
    return () => obs.disconnect();
  }, [messages]);

  return null;
}
