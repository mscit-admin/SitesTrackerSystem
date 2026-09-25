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

// Remember each node's ORIGINAL Arabic source so re-applies always translate
// from the source key, never from an already-translated value. Survives across
// effect runs (module scope). Nodes are GC'd with the DOM (WeakMap/WeakSet).
const nodeSource = new WeakMap<Text, string>();
const attrSource = new WeakMap<Element, Record<string, string>>();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PLACEHOLDER = /\{\d+\}/;

interface CompiledTemplate { re: RegExp; tpl: string }

// Build anchored regexes for interpolation templates ("{0} كم" => /^(.+?)\ كم$/).
function compileTemplates(messages: Record<string, string>): CompiledTemplate[] {
  const out: CompiledTemplate[] = [];
  for (const [src, tpl] of Object.entries(messages)) {
    if (!PLACEHOLDER.test(src) || !tpl || tpl === src) continue;
    const parts = src.split(/\{\d+\}/).map(escapeRe);
    try {
      out.push({ re: new RegExp("^" + parts.join("(.+?)") + "$"), tpl });
    } catch { /* skip bad pattern */ }
  }
  return out;
}

function fillTemplate(tpl: string, groups: string[]): string {
  return tpl.replace(/\{(\d+)\}/g, (_, i) => groups[Number(i)] ?? "");
}

export function Localize() {
  const { messages } = useLocale();

  useEffect(() => {
    // Even with no translations (source language) we run once to restore any
    // originals left over from a previous language on the same DOM.
    const has = messages && Object.keys(messages).length > 0;
    const templates = has ? compileTemplates(messages) : [];

    const applyTemplate = (source: string): string | null => {
      if (source.length > 200) return null;
      for (const t of templates) {
        const mm = source.match(t.re);
        if (mm) return fillTemplate(t.tpl, mm.slice(1));
      }
      return null;
    };

    let applying = false;
    let scheduled = false;

    const translateTextNode = (node: Text) => {
      const v = node.nodeValue;
      if (!v) return;
      const trimmed = v.trim();
      if (!trimmed) return;
      // Establish the source key: the first non-empty value we ever saw for this node.
      let source = nodeSource.get(node);
      if (source === undefined) {
        source = trimmed;
        nodeSource.set(node, source);
      }
      const rep = has ? messages[source] : undefined;
      let target: string;
      if (rep && rep !== source) target = rep; // exact match
      else if (has) target = applyTemplate(source) ?? source; // interpolation template
      else target = source; // source language => restore original
      if (trimmed !== target) node.nodeValue = v.replace(trimmed, target);
    };

    const translateEl = (el: Element) => {
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (v == null) continue;
        const trimmed = v.trim();
        if (!trimmed) continue;
        let map = attrSource.get(el);
        if (!map) { map = {}; attrSource.set(el, map); }
        if (map[a] === undefined) map[a] = trimmed;
        const source = map[a];
        const rep = has ? messages[source] : undefined;
        let target: string;
        if (rep && rep !== source) target = rep;
        else if (has) target = applyTemplate(source) ?? source;
        else target = source;
        if (trimmed !== target) el.setAttribute(a, target);
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
