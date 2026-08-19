(function initFrameEditIO(global) {
  "use strict";

  const ACTIVE_URL_ATTRIBUTES = [
    ["iframe", "src"],
    ["iframe", "srcdoc"],
    ["object", "data"],
    ["embed", "src"],
  ];
  const INLINE_STYLE_CLASS_PREFIX = "beautylab-inline-style-";
  const SELECT_ID_CLASS_PREFIX = "beautylab-select-id-";

  function attributesToRecord(element) {
    return Object.fromEntries(Array.from(element.attributes, (attribute) => [attribute.name, attribute.value]));
  }

  function applyAttributes(element, attributes) {
    Object.entries(attributes || {}).forEach(([name, value]) => element.setAttribute(name, value));
  }

  function escapeAttribute(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function attributesToString(attributes) {
    return Object.entries(attributes || {})
      .map(([name, value]) => (value === "" ? name : `${name}="${escapeAttribute(value)}"`))
      .join(" ");
  }

  function normalizeFileName(name) {
    const safeName = String(name || "未命名页面.html").replace(/[\\/:*?"<>|]+/g, "-").trim();
    return /\.html?$/i.test(safeName) ? safeName : `${safeName}.html`;
  }

  function normalizeInlineStyles(documentNode, classPrefix = INLINE_STYLE_CLASS_PREFIX) {
    const rules = [];
    Array.from(documentNode.querySelectorAll("[style]")).forEach((element, index) => {
      const declaration = element.getAttribute("style")?.trim();
      if (!declaration) {
        element.removeAttribute("style");
        return;
      }
      let key = `${classPrefix}${index}`;
      while (documentNode.getElementsByClassName(key).length) key += "-x";
      element.classList.add(key);
      element.removeAttribute("style");
      rules.push(`.${key} { ${declaration} }`);
    });
    return rules.join("\n");
  }

  function assignSelectIds(documentNode) {
    Array.from(documentNode.querySelectorAll("select")).forEach((select, index) => {
      const hasIdClass = Array.from(select.classList).some((className) => className.startsWith(SELECT_ID_CLASS_PREFIX));
      if (!hasIdClass) select.classList.add(`${SELECT_ID_CLASS_PREFIX}select-${index}`);
    });
  }

  function disableActiveContent(documentNode) {
    let inlineHandlerCount = 0;
    let javascriptLinkCount = 0;
    Array.from(documentNode.querySelectorAll("*")).forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        if (name.startsWith("on")) {
          element.setAttribute(`data-frameedit-handler-${name}`, attribute.value);
          element.removeAttribute(attribute.name);
          inlineHandlerCount += 1;
        }
      });

      ["href", "xlink:href", "formaction"].forEach((name) => {
        const value = element.getAttribute(name);
        if (value && /^\s*javascript:/i.test(value)) {
          element.setAttribute(`data-frameedit-js-${name.replace(":", "-")}`, value);
          element.removeAttribute(name);
          javascriptLinkCount += 1;
        }
      });
    });

    let activeEmbedCount = 0;
    ACTIVE_URL_ATTRIBUTES.forEach(([selector, attribute]) => {
      Array.from(documentNode.querySelectorAll(`${selector}[${attribute}]`)).forEach((element) => {
        const value = element.getAttribute(attribute);
        if (value == null) return;
        element.setAttribute(`data-frameedit-active-${attribute}`, value);
        element.removeAttribute(attribute);
        activeEmbedCount += 1;
      });
    });
    return { inlineHandlerCount, javascriptLinkCount, activeEmbedCount };
  }

  function parseHtml(source, fileName) {
    if (typeof source !== "string" || !source.trim()) {
      throw new Error("没有检测到 HTML 内容。");
    }

    const parser = new DOMParser();
    const documentNode = parser.parseFromString(source, "text/html");
    if (!documentNode.documentElement || !documentNode.body) {
      throw new Error("无法解析这段 HTML，请确认复制了完整代码。");
    }

    const originalDoctype = /^\s*(<!doctype[^>]*>)/i.exec(source)?.[1] || "<!doctype html>";
    const externalResources = Array.from(
      documentNode.querySelectorAll('[src^="http:"], [src^="https:"], [href^="http:"], [href^="https:"]'),
    ).length;
    const canvasCount = documentNode.querySelectorAll("canvas").length;
    const svgCount = documentNode.querySelectorAll("svg").length;
    const frameworkMarkers = documentNode.querySelectorAll("script").length > 0 &&
      /\b(React|Vue|angular|createApp|hydrateRoot)\b/.test(source);
    const scripts = [];
    const styleNodes = Array.from(documentNode.querySelectorAll("style"));
    const sourceCss = styleNodes.map((style) => style.textContent || "").join("\n\n");
    styleNodes.forEach((style) => style.remove());

    Array.from(documentNode.querySelectorAll("script")).forEach((script, index) => {
      const id = `script-${index}`;
      scripts.push({ id, html: script.outerHTML });
      const placeholder = documentNode.createElement("template");
      placeholder.setAttribute("data-frameedit-script-id", id);
      script.replaceWith(placeholder);
    });

    const { inlineHandlerCount, javascriptLinkCount, activeEmbedCount } = disableActiveContent(documentNode);
    assignSelectIds(documentNode);
    const inlineCss = normalizeInlineStyles(documentNode);
    const css = [sourceCss, inlineCss && `/* Preserved inline styles */\n${inlineCss}`].filter(Boolean).join("\n\n");

    const headClone = documentNode.head.cloneNode(true);
    const title = documentNode.title || normalizeFileName(fileName).replace(/\.html?$/i, "");

    return {
      fileName: normalizeFileName(fileName),
      title,
      originalDoctype,
      htmlAttributes: attributesToRecord(documentNode.documentElement),
      bodyAttributes: attributesToRecord(documentNode.body),
      headHtml: headClone.innerHTML,
      bodyHtml: documentNode.body.innerHTML,
      css,
      scripts,
      warnings: buildWarnings({
        scripts: scripts.length,
        inlineHandlers: inlineHandlerCount,
        javascriptLinks: javascriptLinkCount,
        activeEmbeds: activeEmbedCount,
        externalResources,
        canvas: canvasCount,
        svg: svgCount,
        frameworkMarkers,
      }),
      counts: {
        scripts: scripts.length,
        inlineHandlers: inlineHandlerCount,
        javascriptLinks: javascriptLinkCount,
        activeEmbeds: activeEmbedCount,
        externalResources,
        canvas: canvasCount,
        svg: svgCount,
      },
    };
  }

  function buildWarnings(counts) {
    const warnings = [];
    if (counts.scripts || counts.inlineHandlers || counts.javascriptLinks) {
      warnings.push({
        level: "warning",
        icon: "shield-alert",
        title: `编辑时已禁用 ${counts.scripts + counts.inlineHandlers + counts.javascriptLinks} 项脚本行为`,
        detail: "原脚本和内联事件会在预览及导出文件中恢复。依赖原始 DOM 结构的脚本需要重点检查。",
      });
    }
    if (counts.activeEmbeds) {
      warnings.push({
        level: "warning",
        icon: "panel-top-dashed",
        title: `已暂停 ${counts.activeEmbeds} 个嵌入页面或对象`,
        detail: "iframe、object 和 embed 在编辑时不会载入，预览及导出时恢复。",
      });
    }
    if (counts.canvas) {
      warnings.push({
        level: "warning",
        icon: "chart-no-axes-combined",
        title: `检测到 ${counts.canvas} 个 Canvas 元素`,
        detail: "Canvas 内的文字和图表数据无法反向编辑，只能调整元素整体尺寸并在预览中检查脚本渲染结果。",
      });
    }
    if (counts.svg) {
      warnings.push({
        level: "info",
        icon: "shapes",
        title: `检测到 ${counts.svg} 个 SVG 图形`,
        detail: "简单 SVG 可以整体调整；复杂路径建议保留原结构，不要拆分图层。",
      });
    }
    if (counts.externalResources) {
      warnings.push({
        level: "warning",
        icon: "wifi-off",
        title: `检测到 ${counts.externalResources} 个网络资源`,
        detail: "编辑画布和安全预览会阻止网络访问。请把图片、字体和脚本改为内嵌资源，确保断网演示正常。",
      });
    }
    if (counts.frameworkMarkers) {
      warnings.push({
        level: "warning",
        icon: "blocks",
        title: "页面可能包含运行时框架代码",
        detail: "React、Vue 或脚本动态生成的内容无法保证无损回写；请以最终预览为准。",
      });
    }
    if (!warnings.length) {
      warnings.push({
        level: "info",
        icon: "shield-check",
        title: "未发现明显的兼容性风险",
        detail: "页面不包含脚本、外部资源或 Canvas。仍建议在导出前检查一次最终预览。",
      });
    }
    return warnings;
  }

  function restoreDisabledAttributes(documentNode) {
    Array.from(documentNode.querySelectorAll("*")).forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        if (attribute.name.startsWith("data-frameedit-handler-on")) {
          const eventName = attribute.name.replace("data-frameedit-handler-", "");
          element.setAttribute(eventName, attribute.value);
          element.removeAttribute(attribute.name);
        }
        if (attribute.name.startsWith("data-frameedit-js-")) {
          const originalName = attribute.name.replace("data-frameedit-js-", "").replace("xlink-href", "xlink:href");
          element.setAttribute(originalName, attribute.value);
          element.removeAttribute(attribute.name);
        }
        if (attribute.name.startsWith("data-frameedit-active-")) {
          const originalName = attribute.name.replace("data-frameedit-active-", "");
          element.setAttribute(originalName, attribute.value);
          element.removeAttribute(attribute.name);
        }
      });
    });
  }

  function createOutputDocument(state, bodyHtml, css) {
    const parser = new DOMParser();
    const skeleton = `${state.originalDoctype || "<!doctype html>"}<html><head></head><body></body></html>`;
    const documentNode = parser.parseFromString(skeleton, "text/html");
    applyAttributes(documentNode.documentElement, state.htmlAttributes);
    applyAttributes(documentNode.body, state.bodyAttributes);
    documentNode.head.innerHTML = state.headHtml || "";
    documentNode.body.innerHTML = bodyHtml || "";

    documentNode.head.querySelector('style[data-frameedit-styles]')?.remove();
    if (css && css.trim()) {
      const style = documentNode.createElement("style");
      style.setAttribute("data-frameedit-styles", "");
      style.textContent = css;
      documentNode.head.append(style);
    }

    if (!documentNode.querySelector("meta[charset]")) {
      const charset = documentNode.createElement("meta");
      charset.setAttribute("charset", "UTF-8");
      documentNode.head.prepend(charset);
    }

    restoreDisabledAttributes(documentNode);
    const scriptMarkers = [];
    Array.from(documentNode.querySelectorAll("template[data-frameedit-script-id]")).forEach((placeholder, index) => {
      const id = placeholder.getAttribute("data-frameedit-script-id");
      const marker = `FRAMEEDIT_SCRIPT_${index}_${id}`;
      scriptMarkers.push({ marker, script: state.scripts.find((entry) => entry.id === id)?.html || "" });
      placeholder.replaceWith(documentNode.createComment(marker));
    });

    const doctype = state.originalDoctype || "<!doctype html>";
    let output = `${doctype}\n${documentNode.documentElement.outerHTML}`;
    scriptMarkers.forEach(({ marker, script }) => {
      output = output.replace(`<!--${marker}-->`, script);
    });
    const restoredScriptIds = new Set(scriptMarkers.map(({ marker }) => marker.split("_").slice(3).join("_")));
    const missingScripts = state.scripts.filter((entry) => !restoredScriptIds.has(entry.id));
    if (missingScripts.length) {
      output = output.replace("</body>", `${missingScripts.map((entry) => entry.html).join("\n")}\n</body>`);
    }
    const selectOverrides = arguments[3]?.selectOverrides || [];
    if (selectOverrides.length) {
      const safeOverrides = JSON.stringify(selectOverrides).replaceAll("<", "\\u003c");
      const overrideScript = `<script data-beautylab-select-overrides>\n(function () {\n  var overrides = ${safeOverrides};\n  overrides.forEach(function (config) {\n    var className = ${JSON.stringify(SELECT_ID_CLASS_PREFIX)} + config.id;\n    var select = Array.prototype.find.call(document.querySelectorAll('select'), function (candidate) { return candidate.classList.contains(className); });\n    if (!select) return;\n    select.innerHTML = config.html;\n    if (config.value != null) select.value = config.value;\n    select.dispatchEvent(new Event('change', { bubbles: true }));\n  });\n})();\n<\/script>`;
      output = output.replace("</body>", `${overrideScript}\n</body>`);
    }
    return output;
  }

  function mergeRuntimeSnapshot(state, runtimeBodyHtml) {
    const parser = new DOMParser();
    const baseDocument = parser.parseFromString(`<!doctype html><html><body>${state.bodyHtml || ""}</body></html>`, "text/html");
    const runtimeDocument = parser.parseFromString(`<!doctype html><html><body>${runtimeBodyHtml || ""}</body></html>`, "text/html");
    runtimeDocument.querySelectorAll("script, template[data-frameedit-script-id]").forEach((node) => node.remove());
    disableActiveContent(runtimeDocument);
    const runtimeCss = normalizeInlineStyles(runtimeDocument, "beautylab-runtime-style-");
    let mergedRegions = 0;
    let mergedSelects = 0;

    Array.from(baseDocument.body.querySelectorAll("[id]")).forEach((baseElement) => {
      const runtimeElement = runtimeDocument.getElementById(baseElement.id);
      if (!runtimeElement) return;
      if (baseElement.tagName === "SELECT") {
        if (runtimeElement.querySelector("option")) {
          baseElement.innerHTML = runtimeElement.innerHTML;
          mergedSelects += 1;
        }
        return;
      }
      const baseHasContent = Boolean(baseElement.textContent.trim() || baseElement.children.length);
      const runtimeHasContent = Boolean(runtimeElement.textContent.trim() || runtimeElement.children.length);
      if (!baseHasContent && runtimeHasContent) {
        baseElement.innerHTML = runtimeElement.innerHTML;
        baseElement.setAttribute("data-beautylab-runtime-snapshot", "");
        mergedRegions += 1;
      }
    });

    return {
      bodyHtml: baseDocument.body.innerHTML,
      css: runtimeCss,
      mergedRegions,
      mergedSelects,
    };
  }

  function createRuntimeSnapshotDocument(state, token) {
    const output = createOutputDocument(state, state.bodyHtml, state.css);
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(createPreviewDocument(output), "text/html");
    const reporter = documentNode.createElement("script");
    reporter.setAttribute("data-beautylab-snapshot-reporter", "");
    reporter.textContent = `(function(){var reporter=document.currentScript;setTimeout(function(){if(reporter)reporter.remove();parent.postMessage({type:"beautylab-runtime-snapshot",token:${JSON.stringify(token)},body:document.body.innerHTML},"*");},180);}());`;
    documentNode.body.append(reporter);
    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  function createPreviewDocument(outputHtml, options = {}) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(outputHtml, "text/html");
    documentNode.querySelectorAll('meta[http-equiv="Content-Security-Policy" i]').forEach((node) => node.remove());

    const csp = documentNode.createElement("meta");
    csp.setAttribute("http-equiv", "Content-Security-Policy");
    csp.setAttribute(
      "content",
      "default-src 'none'; img-src data: blob:; media-src data: blob:; font-src data:; style-src 'unsafe-inline' data:; script-src 'unsafe-inline' data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
    );
    documentNode.head.prepend(csp);

    if (options.print) {
      const printStyle = documentNode.createElement("style");
      printStyle.textContent = "@page{size:landscape;margin:0}html,body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.slide{break-after:page;page-break-after:always}.slide:last-child{break-after:auto;page-break-after:auto}";
      documentNode.head.append(printStyle);
      const printScript = documentNode.createElement("script");
      printScript.textContent = "window.addEventListener('load',function(){setTimeout(function(){window.print()},500)})";
      documentNode.body.append(printScript);
    }

    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  global.FrameEditIO = Object.freeze({
    attributesToString,
    createOutputDocument,
    createPreviewDocument,
    createRuntimeSnapshotDocument,
    mergeRuntimeSnapshot,
    normalizeFileName,
    parseHtml,
    selectIdClassPrefix: SELECT_ID_CLASS_PREFIX,
  });
})(window);
