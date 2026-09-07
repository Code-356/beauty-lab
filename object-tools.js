(function initBeautyLabObjectTools(global) {
  "use strict";

  const LOCK_ATTRIBUTE = "data-beautylab-locked";
  const HIDDEN_STYLE_ATTRIBUTE = "data-beautylab-hidden-display";
  const FORMAT_PROPERTIES = Object.freeze([
    "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing",
    "color", "text-align", "text-decoration-line", "text-decoration-color", "text-transform",
    "background-color", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
    "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
    "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "border-radius", "opacity",
  ]);
  let nextCopyId = 1;

  function snapshotStyles(element, properties) {
    return (properties || FORMAT_PROPERTIES).reduce((snapshot, property) => {
      snapshot[property] = {
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property),
      };
      return snapshot;
    }, {});
  }

  function applyStyleSnapshot(element, snapshot) {
    Object.entries(snapshot || {}).forEach(([property, entry]) => {
      if (entry.value) element.style.setProperty(property, entry.value, entry.priority || "");
      else element.style.removeProperty(property);
    });
  }

  function copyFormat(element) {
    const computed = element.ownerDocument.defaultView.getComputedStyle(element);
    return FORMAT_PROPERTIES.reduce((format, property) => {
      format[property] = computed.getPropertyValue(property).trim();
      return format;
    }, {});
  }

  function imageFrameStyles(payload = {}) {
    const styles = {};
    if (payload.fit === "cover" || payload.fit === "contain") styles["object-fit"] = payload.fit;
    const positions = ["left top", "center top", "right top", "left center", "center center", "right center", "left bottom", "center bottom", "right bottom"];
    if (positions.includes(payload.position)) styles["object-position"] = payload.position;
    if (payload.height !== undefined) {
      const height = Number(payload.height);
      if (Number.isFinite(height) && height >= 1 && height <= 10000) styles.height = `${height}px`;
    }
    return styles;
  }

  function insertionSpec(kind, payload = {}) {
    if (kind === "text") {
      return {
        tagName: "p", content: String(payload.text || "New text"),
        attributes: { "data-beautylab-object": "text" },
        styles: { "font-size": "24px", "line-height": "1.4", margin: "12px 0", "min-height": "34px" },
      };
    }
    const shape = payload.shape === "ellipse" ? "ellipse" : "rectangle";
    return {
      tagName: "div", content: "", attributes: { "data-beautylab-object": shape, role: "img", "aria-label": shape === "ellipse" ? "Ellipse" : "Rectangle" },
      styles: { width: "160px", height: "100px", "max-width": "100%", "background-color": "#71a894", "border-radius": shape === "ellipse" ? "50%" : "4px", margin: "12px 0", "flex-shrink": "0" },
    };
  }

  function isLocked(element) {
    return Boolean(element && element.closest && element.closest(`[${LOCK_ATTRIBUTE}]`));
  }

  function remapCloneIds(clone, documentNode = clone.ownerDocument) {
    const nodes = [clone, ...clone.querySelectorAll("*")];
    const idMap = new Map();
    nodes.forEach((element) => {
      if (!element.id) return;
      const previousId = element.id;
      let nextId;
      do { nextId = `beautylab-copy-${nextCopyId++}`; }
      while (documentNode.getElementById(nextId) || nodes.some((node) => node.id === nextId));
      if (!idMap.has(previousId)) idMap.set(previousId, nextId);
      element.id = nextId;
    });
    const tokenReferences = new Set(["for", "headers", "list", "form", "aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "aria-flowto", "aria-activedescendant", "aria-details", "aria-errormessage"]);
    const replaceUrls = (value) => value.replace(/url\(\s*(["']?)#([^\s)"']+)\1\s*\)/g, (match, quote, id) => idMap.has(id) ? `url(${quote}#${idMap.get(id)}${quote})` : match);
    nodes.forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        let value = attribute.value;
        if (tokenReferences.has(name)) value = value.replace(/\S+/g, (id) => idMap.get(id) || id);
        else if ((name === "href" || name === "xlink:href") && value.startsWith("#") && idMap.has(value.slice(1))) value = `#${idMap.get(value.slice(1))}`;
        value = replaceUrls(value);
        if (value !== attribute.value) element.setAttribute(attribute.name, value);
      });
      if (element.tagName.toLowerCase() === "style") element.textContent = remapCssText(element.textContent, idMap, documentNode);
    });
    if (idMap.size && !clone.id) {
      do { clone.id = `beautylab-copy-${nextCopyId++}`; }
      while (documentNode.getElementById(clone.id) || nodes.some((node) => node !== clone && node.id === clone.id));
    }
    idMap.scopeId = clone.id;
    return idMap;
  }

  function remapSelector(selector, idMap, documentNode) {
    let result = selector;
    idMap.forEach((newId, oldId) => {
      const escape = documentNode.defaultView?.CSS?.escape || global.CSS?.escape;
      if (!escape) return;
      const token = `#${escape(oldId)}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(`${token}(?![\\w-]|\\\\)`, "g"), `#${newId}`);
    });
    return result;
  }

  function remapRules(rules, idMap, documentNode, onlyChanged) {
    return Array.from(rules || []).map((rule) => {
      if (rule.selectorText && rule.style) {
        let selector = remapSelector(rule.selectorText, idMap, documentNode);
        const declarations = rule.style.cssText.replace(/url\(\s*(["']?)#([^\s)"']+)\1\s*\)/g, (match, quote, id) => idMap.has(id) ? `url(${quote}#${idMap.get(id)}${quote})` : match);
        const changedDeclarations = declarations !== rule.style.cssText;
        if (onlyChanged && selector === rule.selectorText && !changedDeclarations) return "";
        if (onlyChanged) {
          const scope = idMap.scopeId ? `#${idMap.scopeId},#${idMap.scopeId} *` : Array.from(idMap.values(), (id) => `#${id},#${id} *`).join(",");
          selector = splitSelectors(rule.selectorText).filter((part) => changedDeclarations || remapSelector(part, idMap, documentNode) !== part).map((part) => {
            const mapped = remapSelector(part, idMap, documentNode);
            const pseudoElement = mapped.search(/::[\w-]+(?:\([^)]*\))?\s*$/);
            const at = pseudoElement < 0 ? mapped.length : pseudoElement;
            return `${mapped.slice(0, at)}:where(${scope})${mapped.slice(at)}`;
          }).join(",");
        }
        return `${selector}{${declarations}}`;
      }
      if (rule.cssRules) {
        const nested = remapRules(rule.cssRules, idMap, documentNode, onlyChanged);
        return nested ? `${rule.cssText.slice(0, rule.cssText.indexOf("{"))}{${nested}}` : "";
      }
      return onlyChanged ? "" : rule.cssText;
    }).join("\n");
  }

  function splitSelectors(selector) {
    const selectors = [];
    let start = 0, depth = 0, quote = "";
    for (let index = 0; index < selector.length; index += 1) {
      const character = selector[index];
      if (character === "\\") { index += 1; continue; }
      if (quote) { if (character === quote) quote = ""; continue; }
      if (character === '"' || character === "'") { quote = character; continue; }
      if (character === "(" || character === "[") depth += 1;
      else if (character === ")" || character === "]") depth -= 1;
      else if (character === "," && depth === 0) { selectors.push(selector.slice(start, index).trim()); start = index + 1; }
    }
    selectors.push(selector.slice(start).trim());
    return selectors.filter(Boolean);
  }

  function remapCssText(css, idMap, documentNode) {
    const Sheet = documentNode.defaultView?.CSSStyleSheet || global.CSSStyleSheet;
    if (!Sheet) return css;
    try {
      const sheet = new Sheet();
      sheet.replaceSync(css);
      return remapRules(sheet.cssRules, idMap, documentNode, false);
    } catch (_) { return css; }
  }

  function cloneIdStyles(documentNode, idMap) {
    if (!idMap.size) return null;
    const css = Array.from(documentNode.styleSheets).map((sheet) => {
      try { return remapRules(sheet.cssRules, idMap, documentNode, true); }
      catch (_) { return ""; }
    }).filter(Boolean).join("\n");
    if (!css) return null;
    const style = documentNode.createElement("style");
    style.setAttribute("data-beautylab-duplicate-styles", "");
    style.textContent = css;
    return style;
  }

  global.BeautyLabObjectTools = Object.freeze({
    lockAttribute: LOCK_ATTRIBUTE, hiddenStyleAttribute: HIDDEN_STYLE_ATTRIBUTE, formatProperties: FORMAT_PROPERTIES,
    snapshotStyles, applyStyleSnapshot, copyFormat, imageFrameStyles, insertionSpec, isLocked, remapCloneIds, cloneIdStyles,
    bootstrapSource: () => `(${initBeautyLabObjectTools.toString()})(window);`,
  });
})(window);
