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
  const RUNTIME_ID_ATTRIBUTE = "data-beautylab-runtime-id";

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

  function assignRuntimeIds(documentNode) {
    const used = new Set(Array.from(documentNode.querySelectorAll(`[${RUNTIME_ID_ATTRIBUTE}]`), (element) => element.getAttribute(RUNTIME_ID_ATTRIBUTE)));
    let nextId = 1;
    Array.from(documentNode.body?.querySelectorAll("*") || []).forEach((element) => {
      if (element.id || element.hasAttribute(RUNTIME_ID_ATTRIBUTE) || element.matches("script, style, template[data-frameedit-script-id]")) return;
      let id;
      do id = `runtime-${nextId++}`;
      while (used.has(id));
      used.add(id);
      element.setAttribute(RUNTIME_ID_ATTRIBUTE, id);
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
    const stylesheetLinks = Array.from(documentNode.querySelectorAll('link[rel~="stylesheet" i][href]'))
      .map((link) => attributesToRecord(link));
    const baseHref = documentNode.querySelector("base[href]")?.getAttribute("href") || "";
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
    assignRuntimeIds(documentNode);
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
      stylesheetLinks,
      baseHref,
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
        level: "info",
        icon: "play",
        title: `检测到 ${counts.scripts + counts.inlineHandlers + counts.javascriptLinks} 项脚本行为`,
        detail: "页面脚本会在隔离环境中运行，运行后的 DOM 和样式将转换为可编辑副本；原脚本仍会在预览和导出文件中运行。",
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
        icon: "download",
        title: `检测到 ${counts.externalResources} 个网络资源`,
        detail: "导入和预览会尝试加载网络脚本、样式、字体和图片；断网使用前仍应将这些资源内嵌到 HTML。",
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
    const options = arguments[3] || {};
    const parser = new DOMParser();
    const skeleton = `${state.originalDoctype || "<!doctype html>"}<html><head></head><body></body></html>`;
    const documentNode = parser.parseFromString(skeleton, "text/html");
    applyAttributes(documentNode.documentElement, state.htmlAttributes);
    applyAttributes(documentNode.body, state.bodyAttributes);
    documentNode.head.innerHTML = state.headHtml || "";
    documentNode.body.innerHTML = bodyHtml || "";
    documentNode.querySelectorAll("script[data-beautylab-preview-bridge], script[data-beautylab-snapshot-reporter], script[data-beautylab-runtime-restore]").forEach((node) => node.remove());

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
    const selectOverrides = options.selectOverrides || [];
    if (selectOverrides.length) {
      const safeOverrides = JSON.stringify(selectOverrides).replaceAll("<", "\\u003c");
      const overrideScript = `<script data-beautylab-select-overrides>\n(function () {\n  var overrides = ${safeOverrides};\n  overrides.forEach(function (config) {\n    var className = ${JSON.stringify(SELECT_ID_CLASS_PREFIX)} + config.id;\n    var select = Array.prototype.find.call(document.querySelectorAll('select'), function (candidate) { return candidate.classList.contains(className); });\n    if (!select) return;\n    select.innerHTML = config.html;\n    if (config.value != null) select.value = config.value;\n    select.dispatchEvent(new Event('change', { bubbles: true }));\n  });\n})();\n<\/script>`;
      output = output.replace("</body>", `${overrideScript}\n</body>`);
    }
    if (options.runtimeRestore?.records?.length) {
      const safeState = JSON.stringify(options.runtimeRestore).replaceAll("<", "\\u003c");
      const restoreScript = `<script data-beautylab-runtime-restore>\n(function () {\n  var state = ${safeState};\n  function find(record) {\n    if (record.id) return document.getElementById(record.id);\n    if (!record.runtimeId) return null;\n    var nodes = document.querySelectorAll('[${RUNTIME_ID_ATTRIBUTE}]');\n    for (var i = 0; i < nodes.length; i += 1) {\n      if (nodes[i].getAttribute('${RUNTIME_ID_ATTRIBUTE}') === record.runtimeId) return nodes[i];\n    }\n    return null;\n  }\n  function restoreAttributes(element, record) {\n    ['class', 'style'].forEach(function (name) {\n      var value = record.attributes[name];\n      if (value == null) element.removeAttribute(name);\n      else element.setAttribute(name, value);\n    });\n    Array.from(element.attributes).forEach(function (attribute) {\n      var name = attribute.name.toLowerCase();\n      if (name.indexOf('aria-') === 0 || (name.indexOf('data-') === 0 && name !== '${RUNTIME_ID_ATTRIBUTE}')) element.removeAttribute(attribute.name);\n    });\n    Object.keys(record.attributes || {}).forEach(function (name) {\n      if (name === 'class' || name === 'style' || record.attributes[name] == null) return;\n      element.setAttribute(name, record.attributes[name]);\n    });\n    element.toggleAttribute('hidden', Boolean(record.hidden));\n    if ('open' in element) element.open = Boolean(record.open);\n    else element.toggleAttribute('open', Boolean(record.open));\n  }\n  function apply() {\n    if (state.bodyAttributes) {\n      Array.from(document.body.attributes).forEach(function (attribute) {\n        if (attribute.name !== '${RUNTIME_ID_ATTRIBUTE}') document.body.removeAttribute(attribute.name);\n      });\n      Object.keys(state.bodyAttributes).forEach(function (name) { document.body.setAttribute(name, state.bodyAttributes[name]); });\n    }\n    (state.records || []).forEach(function (record) {\n      var element = find(record);\n      if (!element) return;\n      restoreAttributes(element, record);\n      if (record.text != null && !element.children.length) element.textContent = record.text;\n      if (record.value != null && 'value' in element) element.value = record.value;\n      if (record.checked != null && 'checked' in element) element.checked = Boolean(record.checked);\n      if (Array.isArray(record.selectedValues) && element.options) {\n        Array.from(element.options).forEach(function (option) { option.selected = record.selectedValues.indexOf(option.value) !== -1; });\n      }\n    });\n    if (state.interaction) {\n      try { window.scrollTo(Number(state.interaction.scrollX) || 0, Number(state.interaction.scrollY) || 0); } catch (_) {}\n    }\n  }\n  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });\n  else apply();\n  window.addEventListener('load', apply, { once: true });\n  setTimeout(apply, 120);\n  setTimeout(apply, 700);\n})();\n<\/script>`;
      output = output.replace("</body>", `${restoreScript}\n</body>`);
    }
    return output;
  }

  function mergeRuntimeSnapshot(state, runtimeSnapshot) {
    const parser = new DOMParser();
    const snapshot = typeof runtimeSnapshot === "string" ? { body: runtimeSnapshot, css: "" } : (runtimeSnapshot || {});
    const runtimeDocument = parser.parseFromString(`<!doctype html><html><body>${snapshot.body || ""}</body></html>`, "text/html");
    runtimeDocument.querySelectorAll("script").forEach((script) => {
      const id = script.getAttribute("data-frameedit-script-id");
      if (!id) {
        script.remove();
        return;
      }
      const placeholder = runtimeDocument.createElement("template");
      placeholder.setAttribute("data-frameedit-script-id", id);
      script.replaceWith(placeholder);
    });
    runtimeDocument.querySelectorAll("script[data-beautylab-preview-bridge], script[data-beautylab-snapshot-reporter]").forEach((node) => node.remove());
    disableActiveContent(runtimeDocument);
    assignSelectIds(runtimeDocument);
    assignRuntimeIds(runtimeDocument);
    const runtimeInlineCss = normalizeInlineStyles(runtimeDocument, "beautylab-runtime-style-");
    const runtimeCss = [snapshot.css, runtimeInlineCss].filter((value) => String(value || "").trim()).join("\n\n");
    const bodyHtml = runtimeDocument.body.innerHTML;

    return {
      bodyHtml: bodyHtml || state.bodyHtml,
      css: runtimeCss,
      bodyAttributes: snapshot.bodyAttributes || state.bodyAttributes,
      runtimeState: snapshot.runtimeState || null,
      mergedRegions: runtimeDocument.body.querySelectorAll("*").length,
      mergedSelects: runtimeDocument.body.querySelectorAll("select").length,
      snapshotApplied: Boolean(bodyHtml.trim()),
    };
  }

  function markOriginalScripts(documentNode, scriptIds = []) {
    const candidates = Array.from(documentNode.querySelectorAll("script")).filter((script) => !script.matches("[data-beautylab-select-overrides], [data-beautylab-runtime-restore], [data-beautylab-preview-bridge], [data-beautylab-snapshot-reporter]"));
    candidates.forEach((script, index) => {
      if (scriptIds[index]) script.setAttribute("data-frameedit-script-id", scriptIds[index]);
    });
  }

  function createPreviewBridgeScript(token, { autoCapture = false } = {}) {
    return `(function () {
      var TOKEN = ${JSON.stringify(token)};
      var RUNTIME_ATTRIBUTE = ${JSON.stringify(RUNTIME_ID_ATTRIBUTE)};
      var autoCapture = ${autoCapture ? "true" : "false"};
      var activitySent = false;
      function ensureRuntimeIds() {
        var used = new Set(Array.from(document.querySelectorAll('[' + RUNTIME_ATTRIBUTE + ']'), function (element) { return element.getAttribute(RUNTIME_ATTRIBUTE); }));
        var nextId = 1;
        Array.from(document.body.querySelectorAll('*')).forEach(function (element) {
          if (element.id || element.hasAttribute(RUNTIME_ATTRIBUTE) || element.matches('script, style, template[data-frameedit-script-id]')) return;
          var id;
          do { id = 'runtime-' + nextId++; } while (used.has(id));
          used.add(id);
          element.setAttribute(RUNTIME_ATTRIBUTE, id);
        });
      }
      function syncFormState() {
        Array.from(document.querySelectorAll('input')).forEach(function (input) {
          if (input.type === 'checkbox' || input.type === 'radio') input.toggleAttribute('checked', input.checked);
          else if (input.type !== 'file') input.setAttribute('value', input.value);
        });
        Array.from(document.querySelectorAll('textarea')).forEach(function (textarea) { textarea.textContent = textarea.value; });
        Array.from(document.querySelectorAll('option')).forEach(function (option) { option.toggleAttribute('selected', option.selected); });
        Array.from(document.querySelectorAll('details, dialog')).forEach(function (element) { element.toggleAttribute('open', Boolean(element.open)); });
      }
      function collectRuntimeCss() {
        var chunks = [];
        Array.from(document.styleSheets).forEach(function (sheet) {
          var owner = sheet.ownerNode;
          if (owner && owner.matches && owner.matches('style[data-frameedit-styles]')) return;
          try {
            var css = Array.from(sheet.cssRules || []).map(function (rule) { return rule.cssText; }).join('\\n');
            if (css && chunks.indexOf(css) === -1) chunks.push(css);
          } catch (_) {}
        });
        return chunks.join('\\n\\n');
      }
      function keyFor(element) {
        return element.id ? { id: element.id } : { runtimeId: element.getAttribute(RUNTIME_ATTRIBUTE) || '' };
      }
      function collectRuntimeState() {
        var records = [];
        Array.from(document.body.querySelectorAll('*')).forEach(function (element) {
          if (element.matches('script, style, template')) return;
          var key = keyFor(element);
          if (!key.id && !key.runtimeId) return;
          var attributes = { class: element.getAttribute('class'), style: element.getAttribute('style') };
          Array.from(element.attributes).forEach(function (attribute) {
            var name = attribute.name.toLowerCase();
            if (name.indexOf('aria-') === 0 || (name.indexOf('data-') === 0 && name !== RUNTIME_ATTRIBUTE && name.indexOf('data-beautylab-') !== 0 && name.indexOf('data-frameedit-') !== 0)) attributes[name] = attribute.value;
          });
          var record = Object.assign(key, {
            attributes: attributes,
            hidden: element.hidden,
            open: 'open' in element ? Boolean(element.open) : element.hasAttribute('open')
          });
          if (!element.children.length && !element.matches('input, textarea, select, option, canvas, svg')) record.text = element.textContent;
          if ('value' in element && !element.matches('input[type=file]')) record.value = String(element.value == null ? '' : element.value);
          if ('checked' in element) record.checked = Boolean(element.checked);
          if (element.options) record.selectedValues = Array.from(element.selectedOptions || [], function (option) { return option.value; });
          records.push(record);
        });
        return {
          bodyAttributes: Object.fromEntries(Array.from(document.body.attributes, function (attribute) { return [attribute.name, attribute.value]; })),
          records: records,
          interaction: {
            scrollX: window.scrollX || 0,
            scrollY: window.scrollY || 0,
            active: document.activeElement && document.activeElement !== document.body ? keyFor(document.activeElement) : null
          }
        };
      }
      function capture() {
        ensureRuntimeIds();
        syncFormState();
        var runtimeState = collectRuntimeState();
        var body = document.body.cloneNode(true);
        Array.from(body.querySelectorAll('script')).forEach(function (script) {
          var id = script.getAttribute('data-frameedit-script-id');
          if (!id) { script.remove(); return; }
          var placeholder = document.createElement('template');
          placeholder.setAttribute('data-frameedit-script-id', id);
          script.replaceWith(placeholder);
        });
        body.querySelectorAll('script[data-beautylab-preview-bridge], script[data-beautylab-runtime-restore], script[data-beautylab-select-overrides]').forEach(function (node) { node.remove(); });
        return {
          body: body.innerHTML,
          css: collectRuntimeCss(),
          bodyAttributes: runtimeState.bodyAttributes,
          runtimeState: runtimeState,
          interaction: runtimeState.interaction,
          error: ''
        };
      }
      function post(type, extra) {
        parent.postMessage(Object.assign({ type: type, token: TOKEN }, extra || {}), '*');
      }
      function noteActivity(event) {
        if (activitySent && event.type === 'click') return;
        activitySent = true;
        post('beautylab-preview-interaction', { interactionType: event.type });
      }
      ['click', 'input', 'change', 'submit', 'toggle'].forEach(function (type) { document.addEventListener(type, noteActivity, true); });
      window.addEventListener('message', function (event) {
        var message = event.data || {};
        if (event.source !== parent || message.type !== 'beautylab-preview-capture-request' || message.token !== TOKEN) return;
        var result;
        try { result = capture(); }
        catch (error) { result = { body: '', css: '', bodyAttributes: {}, runtimeState: null, interaction: null, error: String((error && error.message) || error || 'Preview capture failed') }; }
        post('beautylab-preview-capture-result', Object.assign({ requestId: message.requestId }, result));
      });
      function ready() { ensureRuntimeIds(); post('beautylab-preview-ready'); }
      if (document.readyState === 'complete') ready();
      else window.addEventListener('load', ready, { once: true });
      setTimeout(ready, 1200);
      if (autoCapture) {
        var sendAutomatic = function () {
          var result;
          try { result = capture(); }
          catch (error) { result = { body: '', css: '', bodyAttributes: {}, runtimeState: null, error: String((error && error.message) || error || 'Runtime snapshot failed') }; }
          post('beautylab-runtime-snapshot', result);
        };
        if (document.readyState === 'complete') setTimeout(sendAutomatic, 600);
        else window.addEventListener('load', function () { setTimeout(sendAutomatic, 600); }, { once: true });
        setTimeout(sendAutomatic, 4500);
      }
    })();`;
  }

  function createInteractivePreviewDocument(outputHtml, token, options = {}) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(createPreviewDocument(outputHtml), "text/html");
    markOriginalScripts(documentNode, options.scriptIds || []);
    const bridge = documentNode.createElement("script");
    bridge.setAttribute("data-beautylab-preview-bridge", "");
    bridge.textContent = createPreviewBridgeScript(token, options);
    documentNode.body.append(bridge);
    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  function createRuntimeRestoreState(bodyHtml, bodyAttributes = {}, interaction = null) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(`<!doctype html><html><body>${bodyHtml || ""}</body></html>`, "text/html");
    assignRuntimeIds(documentNode);
    const records = Array.from(documentNode.body.querySelectorAll("*")).flatMap((element) => {
      if (element.matches("script, style, template")) return [];
      const id = element.id;
      const runtimeId = element.getAttribute(RUNTIME_ID_ATTRIBUTE) || "";
      if (!id && !runtimeId) return [];
      const attributes = { class: element.getAttribute("class"), style: element.getAttribute("style") };
      Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        if (name.startsWith("aria-") || (name.startsWith("data-") && name !== RUNTIME_ID_ATTRIBUTE && !name.startsWith("data-beautylab-") && !name.startsWith("data-frameedit-"))) attributes[name] = attribute.value;
      });
      const record = {
        ...(id ? { id } : { runtimeId }),
        attributes,
        hidden: element.hidden,
        open: "open" in element ? Boolean(element.open) : element.hasAttribute("open"),
      };
      if (!element.children.length && !element.matches("input, textarea, select, option, canvas, svg")) record.text = element.textContent;
      if (element.matches("input:not([type=file]), textarea, select")) record.value = element.value || element.getAttribute("value") || "";
      if (element.matches("input[type=checkbox], input[type=radio]")) record.checked = element.hasAttribute("checked");
      if (element.matches("select")) record.selectedValues = Array.from(element.options).filter((option) => option.selected).map((option) => option.value);
      return [record];
    });
    return { bodyAttributes: { ...(bodyAttributes || {}) }, records, interaction: interaction || null };
  }

  function createRuntimeSnapshotDocument(state, token) {
    const output = createOutputDocument(state, state.bodyHtml, state.css);
    return createInteractivePreviewDocument(output, token, {
      autoCapture: true,
      scriptIds: state.scripts.map((entry) => entry.id),
    });
  }

  function createPreviewDocument(outputHtml, options = {}) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(outputHtml, "text/html");
    documentNode.querySelectorAll('meta[http-equiv="Content-Security-Policy" i]').forEach((node) => node.remove());

    const csp = documentNode.createElement("meta");
    csp.setAttribute("http-equiv", "Content-Security-Policy");
    csp.setAttribute(
      "content",
      "default-src 'none'; img-src data: blob: http: https:; media-src data: blob: http: https:; font-src data: blob: http: https:; style-src 'unsafe-inline' data: blob: http: https:; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' data: blob: http: https:; connect-src data: blob: http: https: ws: wss:; frame-src data: blob: http: https:; worker-src data: blob:; object-src 'none'; base-uri 'self' data: http: https:; form-action 'none'",
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
    createInteractivePreviewDocument,
    createPreviewDocument,
    createRuntimeSnapshotDocument,
    createRuntimeRestoreState,
    mergeRuntimeSnapshot,
    normalizeFileName,
    parseHtml,
    runtimeIdAttribute: RUNTIME_ID_ATTRIBUTE,
    selectIdClassPrefix: SELECT_ID_CLASS_PREFIX,
  });
})(window);
