(function initBeautyLabLiveCompat(global) {
  "use strict";

  const BRIDGE_ATTRIBUTE = "data-beautylab-live-bridge";

  // Must run before author scripts, including window capture listeners.
  function installTextInputGuard() {
    const held = new Set();
    const guard = window.BeautyLabTextInputGuard = { finish: null };
    ["keydown", "keypress", "keyup"].forEach(function (type) {
      window.addEventListener(type, function (event) {
        const key = event.code || event.key;
        const target = event.target;
        const editing = document.documentElement.hasAttribute("data-beautylab-live-edit") &&
          target?.matches?.('[data-beautylab-live-ui="inline-text-editor"]');
        if (!editing && !held.has(key)) return;
        event.stopImmediatePropagation();
        if (type === "keydown") held.add(key);
        if (type === "keyup") held.delete(key);
        if (editing && type === "keydown" && !event.isComposing && event.keyCode !== 229) {
          if (event.key === "Escape" || (event.key === "Enter" && !event.shiftKey)) {
            event.preventDefault();
            guard.finish?.(event.key !== "Escape");
          }
        }
      }, true);
    });
    window.addEventListener("blur", () => held.clear());
  }

  function liveCompatBridge(token) {
    "use strict";

    var TOKEN = token;
    var LIVE_ID = "data-beautylab-live-id";
    var SELECTED_CLASS = "beautylab-live-selected";
    var HOVER_CLASS = "beautylab-live-hover";
    var mode = "edit";
    var selected = null;
    var hovered = null;
    var nextId = 1;
    var history = [];
    var historyPointer = -1;
    var directEditor = null;
    var directEditContext = null;
    var layerTreeTimer = null;
    var viewportUpdateFrame = null;
    var imageResizeContext = null;
    var modifiedActivation = null;
    var replayingModifiedActivation = false;
    var objectTools = window.BeautyLabObjectTools;
    var copiedFormat = null;

    function runtimeEdits(method) {
      var edits = window.BeautyLabRuntimeEdits;
      if (edits && typeof edits[method] === "function") edits[method]();
    }

    function locked(element) {
      return objectTools ? objectTools.isLocked(element) : false;
    }

    function editable(element) {
      return mode === "edit" && element && !locked(element);
    }

    function post(type, extra) {
      parent.postMessage(Object.assign({ type: type, token: TOKEN }, extra || {}), "*");
    }

    function syncViewportWidth() {
      document.documentElement.style.setProperty("--beautylab-live-viewport-width", Math.max(1, window.innerWidth || 1) + "px");
    }

    function editorStyle() {
      var style = document.createElement("style");
      style.setAttribute("data-beautylab-live-style", "");
      style.textContent =
        "html,body{width:var(--beautylab-live-viewport-width,100vw)!important;min-width:var(--beautylab-live-viewport-width,100vw)!important;}html{min-height:100vh;}" +
        "." + SELECTED_CLASS + "{outline:2px solid #dc5b4c!important;outline-offset:2px!important;}" +
        "." + HOVER_CLASS + "{outline:1px dashed rgba(220,91,76,.82)!important;outline-offset:2px!important;}" +
        ".beautylab-live-inline-editor{position:fixed!important;z-index:2147483647!important;min-width:120px!important;min-height:34px!important;padding:5px 7px!important;resize:both!important;border:2px solid #dc5b4c!important;border-radius:3px!important;outline:0!important;box-shadow:0 6px 20px rgba(20,22,19,.26)!important;letter-spacing:0!important;cursor:text!important;}" +
        "html[data-beautylab-live-edit] *{cursor:default;}" +
        "html[data-beautylab-live-edit] a,html[data-beautylab-live-edit] button,html[data-beautylab-live-edit] [role=button]{cursor:pointer;}";
      (document.head || document.documentElement).appendChild(style);
    }

    function parentContentWidth(element) {
      if (!element || !element.parentElement) return 0;
      var parentRect = element.parentElement.getBoundingClientRect();
      var parentStyle = window.getComputedStyle(element.parentElement);
      return Math.max(0, parentRect.width
        - (parseFloat(parentStyle.paddingLeft) || 0)
        - (parseFloat(parentStyle.paddingRight) || 0)
        - (parseFloat(parentStyle.borderLeftWidth) || 0)
        - (parseFloat(parentStyle.borderRightWidth) || 0));
    }

    function imageSizeSnapshot(element) {
      return ["width", "height", "max-width"].reduce(function (snapshot, property) {
        snapshot[property] = {
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property),
        };
        return snapshot;
      }, {});
    }

    function applyImageSizeSnapshot(element, snapshot) {
      if (!element || !snapshot) return;
      Object.keys(snapshot).forEach(function (property) {
        var entry = snapshot[property] || {};
        if (entry.value) element.style.setProperty(property, entry.value, entry.priority || "");
        else element.style.removeProperty(property);
      });
      scheduleViewportSelection();
    }

    function imageSizeSignature(snapshot) {
      return JSON.stringify(snapshot || {});
    }

    function resizeImage(payload) {
      var target = findByLiveId(payload.liveId);
      if (!target || target.tagName !== "IMG" || !editable(target)) return;
      if (payload.phase === "start") {
        finishDirectTextEdit(true);
        runtimeEdits("begin");
        imageResizeContext = { element: target, before: imageSizeSnapshot(target) };
        return;
      }
      var context = imageResizeContext;
      if (!context || context.element !== target) return;
      if (payload.phase === "cancel") {
        imageResizeContext = null;
        applyImageSizeSnapshot(target, context.before);
        runtimeEdits("cancel");
        refreshSelection();
        return;
      }
      var percent = Math.max(1, Math.min(100, Number(payload.widthPercent) || 1));
      target.style.setProperty("width", (Math.round(percent * 10) / 10) + "%");
      target.style.setProperty("height", "auto");
      target.style.setProperty("max-width", "100%");
      scheduleViewportSelection();
      if (payload.phase !== "end") return;
      imageResizeContext = null;
      var after = imageSizeSnapshot(target);
      if (imageSizeSignature(context.before) === imageSizeSignature(after)) {
        runtimeEdits("cancel");
        refreshSelection();
        return;
      }
      commitOperation({
        undo: function () { applyImageSizeSnapshot(target, context.before); },
        redo: function () { applyImageSizeSnapshot(target, after); },
      }, "image-resize");
    }

    function ensureId(element) {
      if (!element || element.nodeType !== 1) return "";
      var id = element.getAttribute(LIVE_ID);
      if (!id) {
        id = "live-" + nextId++;
        element.setAttribute(LIVE_ID, id);
      }
      return id;
    }

    function findByLiveId(liveId) {
      if (!liveId) return selected;
      return Array.from(document.querySelectorAll("[" + LIVE_ID + "]")).find(function (element) {
        return element.getAttribute(LIVE_ID) === liveId;
      }) || null;
    }

    function cleanClasses(element) {
      if (!element || !element.classList) return;
      element.classList.remove(SELECTED_CLASS, HOVER_CLASS);
      if (!element.getAttribute("class")) element.removeAttribute("class");
    }

    function meaningfulTarget(node) {
      var element = node && node.nodeType === 1 ? node : node && node.parentElement;
      if (!element) return null;
      if (element.closest("[data-beautylab-live-ui]")) return null;
      if (element.closest("script,style,template,noscript")) return null;
      var nativeSelect = element.closest("select");
      if (nativeSelect) return nativeSelect;
      var customSelect = customSelectTarget(element);
      if (customSelect) return customSelect.root;
      if (element.closest("svg")) {
        var interactive = element.closest("button,a,[role=button],summary,label");
        if (interactive) element = interactive;
        else if (element.closest("text,tspan")) element = element.closest("text,tspan");
        else element = element.closest("svg");
      }
      if (!element || element === document.documentElement || element === document.body) return null;
      return element;
    }

    function nodePath(node, root) {
      var parts = [];
      var current = node;
      while (current && current !== root) {
        var parentNode = current.parentNode;
        if (!parentNode) return "";
        parts.unshift(Array.prototype.indexOf.call(parentNode.childNodes, current));
        current = parentNode;
      }
      return current === root ? parts.join(".") : "";
    }

    function nodeFromPath(root, path) {
      if (!root) return null;
      if (path === "") return root;
      return String(path).split(".").reduce(function (node, part) {
        return node && node.childNodes ? node.childNodes[Number(part)] : null;
      }, root);
    }

    function collectTextEntries(root) {
      if (!root || root.matches("img,picture,canvas,select,option,object,embed,iframe")) return [];
      var entries = [];
      var tag = root.tagName.toLowerCase();
      if (root.matches("input:not([type=file]),textarea")) {
        entries.push({ key: "property:value", kind: "value", value: String(root.value || ""), tag: tag });
        if (root.hasAttribute("placeholder")) {
          entries.push({ key: "attribute:placeholder", kind: "placeholder", value: root.getAttribute("placeholder") || "", tag: tag });
        }
        return entries;
      }

      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode()) && entries.length < 30) {
        if (!node.nodeValue || !node.nodeValue.trim()) continue;
        var owner = node.parentElement;
        if (!owner || owner.closest("script,style,template,noscript,select,option")) continue;
        entries.push({
          key: "node:" + nodePath(node, root),
          kind: "text",
          value: node.nodeValue,
          tag: owner.tagName ? owner.tagName.toLowerCase() : tag,
        });
      }
      return entries;
    }

    function selectionPath(element) {
      var parts = [];
      var current = element;
      while (current && current !== document.body && parts.length < 5) {
        var tag = current.tagName ? current.tagName.toLowerCase() : "element";
        var id = current.id ? "#" + current.id : "";
        var className = Array.from(current.classList || []).find(function (name) {
          return name !== SELECTED_CLASS && name !== HOVER_CLASS;
        });
        parts.unshift(tag + id + (className ? "." + className : ""));
        current = current.parentElement;
      }
      return parts.join("  >  ");
    }

    function layerLabel(element) {
      var directText = Array.from(element.childNodes).filter(function (node) { return node.nodeType === 3; }).map(function (node) { return node.nodeValue || ""; }).join(" ");
      var text = String(directText || element.getAttribute("aria-label") || (element.children.length ? "" : element.textContent) || "").replace(/\s+/g, " ").trim();
      if (text) return text.slice(0, 72);
      if (element.id) return "#" + element.id;
      var className = Array.from(element.classList || []).find(function (name) {
        return name !== SELECTED_CLASS && name !== HOVER_CLASS;
      });
      if (className) return "." + className;
      if (element.tagName === "IMG") return element.getAttribute("alt") || "Image";
      return element.tagName.toLowerCase();
    }

    function collectLayerTree() {
      var rows = [];
      var blocked = "script,style,template,noscript,link,meta,[data-beautylab-live-ui],.html2canvas-container";
      var walk = function (element, depth) {
        if (!element || rows.length >= 600 || element.matches(blocked)) return;
        var tag = element.tagName.toLowerCase();
        var children = tag === "svg" || tag === "canvas" || tag === "iframe"
          ? []
          : Array.from(element.children).filter(function (child) { return !child.matches(blocked); });
        rows.push({
          liveId: ensureId(element),
          tag: tag,
          label: layerLabel(element),
          depth: Math.min(10, depth),
          hasChildren: children.length > 0,
          locked: locked(element),
          ownLocked: Boolean(objectTools && element.hasAttribute(objectTools.lockAttribute)),
          hidden: element.hidden || window.getComputedStyle(element).display === "none",
        });
        children.forEach(function (child) { walk(child, depth + 1); });
      };
      Array.from(document.body.children).forEach(function (element) { walk(element, 0); });
      return rows;
    }

    function sendLayerTree() {
      post("beautylab-live-tree", { layers: collectLayerTree() });
    }

    function scheduleLayerTree() {
      window.clearTimeout(layerTreeTimer);
      layerTreeTimer = window.setTimeout(sendLayerTree, 90);
    }

    function styleRecord(element) {
      var view = element.ownerDocument.defaultView;
      var computed = view.getComputedStyle(element);
      var rect = element.getBoundingClientRect();
      var availableWidth = parentContentWidth(element);
      var styleValue = function (property) {
        return element.style.getPropertyValue(property) || computed.getPropertyValue(property) || "";
      };
      var values = {};
      [
        "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "color", "text-align",
        "background-color", "opacity", "border-width", "border-style", "border-color", "border-radius",
        "width", "height", "min-width", "min-height", "max-width",
        "margin-top", "margin-right", "margin-bottom", "margin-left",
        "padding-top", "padding-right", "padding-bottom", "padding-left",
        "display", "flex-direction", "justify-content", "align-items", "gap", "object-fit", "object-position",
      ].forEach(function (property) { values[property] = styleValue(property).trim(); });
      return {
        values: values,
        fontFamily: computed.fontFamily || "",
        fontSize: parseFloat(computed.fontSize) || 16,
        fontWeight: computed.fontWeight || "400",
        lineHeight: computed.lineHeight || "normal",
        color: computed.color || "rgb(0, 0, 0)",
        textAlign: computed.textAlign || "left",
        backgroundColor: computed.backgroundColor || "rgba(0, 0, 0, 0)",
        borderColor: computed.borderColor || "rgb(0, 0, 0)",
        borderWidth: parseFloat(computed.borderWidth) || 0,
        borderRadius: parseFloat(computed.borderRadius) || 0,
        opacity: computed.opacity || "1",
        width: Math.round(rect.width * 10) / 10,
        widthPercent: availableWidth ? Math.max(1, Math.min(100, Math.round((rect.width / availableWidth) * 100))) : 100,
        parentContentWidth: Math.round(availableWidth * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        padding: computed.padding || "0px",
        margin: computed.margin || "0px",
        display: computed.display || "block",
      };
    }

    function customOptionInput(option) {
      if (!option || option.nodeType !== 1) return null;
      if (option.matches("input[type=checkbox],input[type=radio]")) return option;
      return option.querySelector("input[type=checkbox],input[type=radio]");
    }

    function customOptionElements(content) {
      if (!content) return [];
      var seen = [];
      Array.from(content.querySelectorAll("input[type=checkbox],input[type=radio]")).forEach(function (input) {
        var option = input.closest("label");
        if (!option || !content.contains(option)) option = input.parentElement || input;
        if (seen.indexOf(option) === -1) seen.push(option);
      });
      return seen;
    }

    function customSelectTarget(element) {
      if (!element || !element.closest) return null;
      var hinted = element.closest(".dropdown-group,.dropdown-content,[data-dropdown],[data-select-options],[role=listbox],[class*='dropdown'],[class*='filter-options']");
      if (hinted) {
        var hintedRoot = hinted.closest(".dropdown-group") || hinted;
        var hintedContent = hintedRoot.querySelector(".dropdown-content") || hintedRoot;
        if (customOptionElements(hintedContent).length) return { kind: "custom", root: hintedRoot, content: hintedContent };
      }
      var optionLabel = element.closest("label");
      var startsInsideChoice = element.matches("input[type=checkbox],input[type=radio]")
        || Boolean(optionLabel && customOptionInput(optionLabel));
      var ownsChoices = customOptionElements(element).length >= 2;
      if (!startsInsideChoice && !ownsChoices) return null;
      var candidate = startsInsideChoice ? (optionLabel || element).parentElement : element;
      var depth = 0;
      while (candidate && candidate !== document.body && depth < 5) {
        var tag = candidate.tagName;
        var options = customOptionElements(candidate);
        if (options.length >= 2 && tag !== "MAIN" && tag !== "FORM") return { kind: "custom", root: candidate, content: candidate };
        if (!startsInsideChoice) break;
        candidate = candidate.parentElement;
        depth += 1;
      }
      return null;
    }

    function selectTarget(element) {
      if (!element) return null;
      var nativeSelect = element.matches("select") ? element : element.closest("select");
      if (nativeSelect) return { kind: "native", root: nativeSelect, content: nativeSelect };
      return customSelectTarget(element);
    }

    function customOptionLabel(option) {
      if (!option) return "";
      var clone = option.cloneNode(true);
      clone.querySelectorAll("input,button,svg,script,style").forEach(function (node) { node.remove(); });
      return String(clone.textContent || "").replace(/\s+/g, " ").trim();
    }

    function selectionRecord(element) {
      if (!element || !element.isConnected) return null;
      var tag = element.tagName.toLowerCase();
      var rect = element.getBoundingClientRect();
      var select = selectTarget(element);
      var selectOptions = [];
      if (select && select.kind === "native") {
        selectOptions = Array.from(select.root.options).map(function (option, index) {
          return { index: index, label: option.textContent || "", value: option.value || "", selected: option.selected, inputType: "select" };
        });
      } else if (select) {
        selectOptions = customOptionElements(select.content).map(function (option, index) {
          var input = customOptionInput(option);
          return {
            index: index,
            label: customOptionLabel(option),
            value: input ? (input.value || "") : "",
            selected: Boolean(input && input.checked),
            inputType: input ? String(input.type || "checkbox").toLowerCase() : "checkbox",
          };
        });
      }
      return {
        liveId: ensureId(element),
        tag: tag,
        path: selectionPath(element),
        rect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          viewportWidth: document.documentElement.clientWidth,
          viewportHeight: document.documentElement.clientHeight,
        },
        canMoveUp: Boolean(element.previousElementSibling),
        canMoveDown: Boolean(element.nextElementSibling),
        textEntries: collectTextEntries(element),
        styles: styleRecord(element),
        isImage: tag === "img",
        imageSrc: tag === "img" ? (element.getAttribute("src") || "") : "",
        imageAlt: tag === "img" ? (element.getAttribute("alt") || "") : "",
        locked: locked(element),
        ownLocked: Boolean(objectTools && element.hasAttribute(objectTools.lockAttribute)),
        hidden: element.hidden || window.getComputedStyle(element).display === "none",
        isCanvas: tag === "canvas",
        selectKind: select ? select.kind : "",
        selectOptions: selectOptions,
      };
    }

    function sendSelection() {
      post("beautylab-live-selection", { selection: selectionRecord(selected) });
    }

    function scheduleViewportSelection() {
      if (!selected || viewportUpdateFrame != null) return;
      viewportUpdateFrame = window.requestAnimationFrame(function () {
        viewportUpdateFrame = null;
        sendSelection();
      });
    }

    function sendHistory() {
      post("beautylab-live-history", {
        canUndo: historyPointer >= 0,
        canRedo: historyPointer + 1 < history.length,
      });
    }

    function select(element) {
      if (selected && selected !== element) {
        cleanClasses(selected);
      }
      selected = element && element.isConnected ? element : null;
      if (selected && mode === "edit") {
        ensureId(selected);
        selected.classList.remove(HOVER_CLASS);
        selected.classList.add(SELECTED_CLASS);
      }
      sendSelection();
    }

    function refreshSelection() {
      if (selected && !selected.isConnected) selected = null;
      if (selected && mode === "edit") selected.classList.add(SELECTED_CLASS);
      sendSelection();
    }

    function markChanged(reason) {
      post("beautylab-live-change", { reason: reason || "edit" });
      sendHistory();
      scheduleLayerTree();
      refreshSelection();
    }

    function commitOperation(operation, reason) {
      history.splice(historyPointer + 1);
      history.push(operation);
      historyPointer = history.length - 1;
      runtimeEdits("commit");
      markChanged(reason);
    }

    function undo() {
      if (historyPointer < 0) return;
      try {
        history[historyPointer].undo();
        runtimeEdits("undo");
        historyPointer -= 1;
        markChanged("undo");
      } catch (error) {
        post("beautylab-live-error", { message: String(error && error.message || error) });
      }
    }

    function redo() {
      if (historyPointer + 1 >= history.length) return;
      try {
        historyPointer += 1;
        history[historyPointer].redo();
        runtimeEdits("redo");
        markChanged("redo");
      } catch (error) {
        post("beautylab-live-error", { message: String(error && error.message || error) });
      }
    }

    function dispatchValueEvents(element) {
      try { element.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) {}
      try { element.dispatchEvent(new Event("change", { bubbles: true })); } catch (_) {}
    }

    function applyText(key, value, liveId) {
      var targetElement = findByLiveId(liveId);
      if (!editable(targetElement)) return;
      var next = String(value == null ? "" : value);
      if (key === "property:value" && "value" in targetElement) {
        var beforeValue = String(targetElement.value == null ? "" : targetElement.value);
        var applyValue = function (current) {
          targetElement.value = current;
          if (targetElement.tagName === "TEXTAREA") targetElement.textContent = current;
          else targetElement.setAttribute("value", current);
          dispatchValueEvents(targetElement);
        };
        applyValue(next);
        commitOperation({ undo: function () { applyValue(beforeValue); }, redo: function () { applyValue(next); } }, "text");
        return;
      }
      if (key === "attribute:placeholder") {
        var beforePlaceholder = targetElement.getAttribute("placeholder");
        targetElement.setAttribute("placeholder", next);
        commitOperation({
          undo: function () { if (beforePlaceholder == null) targetElement.removeAttribute("placeholder"); else targetElement.setAttribute("placeholder", beforePlaceholder); },
          redo: function () { targetElement.setAttribute("placeholder", next); },
        }, "text");
        return;
      }
      if (String(key).indexOf("node:") !== 0) return;
      var targetNode = nodeFromPath(targetElement, String(key).slice(5));
      if (!targetNode || targetNode.nodeType !== 3) return;
      var beforeText = targetNode.nodeValue || "";
      targetNode.nodeValue = next;
      commitOperation({ undo: function () { targetNode.nodeValue = beforeText; }, redo: function () { targetNode.nodeValue = next; } }, "text");
    }

    function textNodeAtPoint(event, target) {
      var node = null;
      try {
        if (document.caretPositionFromPoint) {
          var position = document.caretPositionFromPoint(event.clientX, event.clientY);
          node = position && position.offsetNode;
        } else if (document.caretRangeFromPoint) {
          var range = document.caretRangeFromPoint(event.clientX, event.clientY);
          node = range && range.startContainer;
        }
      } catch (_) {}
      if (node && node.nodeType === 3 && target.contains(node.parentElement) && String(node.nodeValue || "").trim()) return node;
      var entry = collectTextEntries(target).find(function (candidate) { return candidate.kind === "text"; });
      return entry ? nodeFromPath(target, entry.key.slice(5)) : null;
    }

    function directEditDescriptor(event, target) {
      if (target.matches("input:not([type=file]),textarea")) {
        var beforeValue = String(target.value || "");
        return {
          before: beforeValue,
          owner: target,
          apply: function (value) {
            target.value = value;
            if (target.tagName === "TEXTAREA") target.textContent = value;
            else target.setAttribute("value", value);
            dispatchValueEvents(target);
          },
        };
      }
      var targetNode = textNodeAtPoint(event, target);
      if (!targetNode || targetNode.nodeType !== 3) return null;
      return {
        before: targetNode.nodeValue || "",
        owner: targetNode.parentElement || target,
        apply: function (value) { targetNode.nodeValue = value; },
      };
    }

    function finishDirectTextEdit(commit) {
      if (!directEditor || !directEditContext) return;
      var editor = directEditor;
      var context = directEditContext;
      var next = editor.value;
      directEditor = null;
      directEditContext = null;
      editor.remove();
      if (!commit) {
        context.apply(context.before);
        runtimeEdits("cancel");
        refreshSelection();
        return;
      }
      if (next === context.before) {
        runtimeEdits("cancel");
        refreshSelection();
        return;
      }
      context.apply(next);
      commitOperation({
        undo: function () { context.apply(context.before); },
        redo: function () { context.apply(next); },
      }, "text");
    }

    function startDirectTextEdit(event) {
      if (mode !== "edit") return;
      var target = meaningfulTarget(event.target);
      if (!target || locked(target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      finishDirectTextEdit(true);
      runtimeEdits("begin");
      select(target);
      var context = directEditDescriptor(event, target);
      if (!context) { runtimeEdits("cancel"); return; }
      var owner = context.owner || target;
      var rect = owner.getBoundingClientRect();
      if (!rect.width || !rect.height) rect = target.getBoundingClientRect();
      var computed = window.getComputedStyle(owner);
      var editor = document.createElement("textarea");
      editor.setAttribute("data-beautylab-live-ui", "inline-text-editor");
      editor.className = "beautylab-live-inline-editor";
      editor.value = context.before;
      editor.rows = 1;
      editor.setAttribute("aria-label", "Edit text directly");
      var width = Math.max(140, Math.min(window.innerWidth - 16, rect.width + 24));
      var height = Math.max(38, Math.min(window.innerHeight - 16, rect.height + 14));
      var left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left - 8));
      var top = Math.max(8, Math.min(window.innerHeight - height - 8, rect.top - 7));
      var background = computed.backgroundColor;
      if (!background || background === "rgba(0, 0, 0, 0)" || background === "transparent") background = "#ffffff";
      editor.style.left = left + "px";
      editor.style.top = top + "px";
      editor.style.width = width + "px";
      editor.style.height = height + "px";
      editor.style.fontFamily = computed.fontFamily;
      editor.style.fontSize = computed.fontSize;
      editor.style.fontWeight = computed.fontWeight;
      editor.style.lineHeight = computed.lineHeight;
      editor.style.textAlign = computed.textAlign;
      editor.style.color = computed.color;
      editor.style.background = background;
      document.documentElement.appendChild(editor);
      directEditor = editor;
      directEditContext = context;
      editor.addEventListener("blur", function () {
        window.setTimeout(function () { if (directEditor === editor) finishDirectTextEdit(true); }, 0);
      });
      editor.focus();
      editor.select();
      post("beautylab-live-direct-edit", { active: true });
    }

    function applyStyle(property, value, liveId) {
      var targetElement = findByLiveId(liveId);
      if (!editable(targetElement) || !property) return;
      var before = targetElement.style.getPropertyValue(property);
      var beforePriority = targetElement.style.getPropertyPriority(property);
      var next = String(value == null ? "" : value);
      if (before === next) return;
      var apply = function (current, priority) {
        if (current) targetElement.style.setProperty(property, current, priority || "");
        else targetElement.style.removeProperty(property);
      };
      apply(next, beforePriority);
      commitOperation({ undo: function () { apply(before, beforePriority); }, redo: function () { apply(next, beforePriority); } }, "style");
    }

    function selectSnapshot(target) {
      Array.from(target.querySelectorAll("input[type=checkbox],input[type=radio]")).forEach(function (input) {
        input.toggleAttribute("checked", input.checked);
      });
      Array.from(target.querySelectorAll("option")).forEach(function (option) {
        option.toggleAttribute("selected", option.selected);
      });
      var capture = function (node) {
        if (node.nodeType !== 1) return { node: node, value: node.nodeValue };
        return {
          node: node,
          attributes: Array.from(node.attributes).map(function (attribute) { return [attribute.name, attribute.value]; }),
          children: Array.from(node.childNodes).map(capture),
          value: /^(INPUT|TEXTAREA)$/.test(node.tagName) ? node.value : null,
          checked: node.tagName === "INPUT" ? node.checked : null,
          selected: node.tagName === "SELECT" ? Array.from(node.options).map(function (option) { return option.selected; }) : null,
        };
      };
      return capture(target);
    }

    function restoreSelect(target, snapshot) {
      // Reuse captured nodes so undo retains original listeners and form state.
      var restore = function (state) {
        var node = state.node;
        if (node.nodeType !== 1) { node.nodeValue = state.value; return; }
        Array.from(node.attributes).forEach(function (attribute) { node.removeAttribute(attribute.name); });
        state.attributes.forEach(function (attribute) { node.setAttribute(attribute[0], attribute[1]); });
        node.replaceChildren.apply(node, state.children.map(function (child) { return child.node; }));
        state.children.forEach(restore);
        if (state.value !== null) node.value = state.value;
        if (state.checked !== null) node.checked = state.checked;
        if (state.selected) Array.from(node.options).forEach(function (option, index) { option.selected = Boolean(state.selected[index]); });
      };
      restore(snapshot);
      dispatchValueEvents(target);
    }

    function customOptionTextNode(option) {
      if (!option) return null;
      var walker = document.createTreeWalker(option, NodeFilter.SHOW_TEXT);
      var candidates = [];
      var node;
      while ((node = walker.nextNode())) {
        if (!String(node.nodeValue || "").trim()) continue;
        var owner = node.parentElement;
        if (!owner || owner.closest("script,style,button")) continue;
        candidates.push(node);
      }
      return candidates[candidates.length - 1] || null;
    }

    function setCustomOptionLabel(option, value) {
      var node = customOptionTextNode(option);
      var next = String(value == null ? "" : value);
      if (!node) {
        option.appendChild(document.createTextNode(" " + next));
        return;
      }
      var current = node.nodeValue || "";
      var leading = (current.match(/^\s*/) || [""])[0];
      var trailing = (current.match(/\s*$/) || [""])[0];
      node.nodeValue = leading + next + trailing;
    }

    function cleanDuplicatedIds(root) {
      if (!root || root.nodeType !== 1) return;
      if (objectTools) objectTools.remapCloneIds(root, document);
    }

    function applySelectAction(action, payload) {
      var target = findByLiveId(payload.liveId);
      var select = selectTarget(target);
      if (!editable(target) || !select) return;
      var before = selectSnapshot(target);
      var options = select.kind === "native" ? Array.from(select.root.options) : customOptionElements(select.content);
      var requestedIndex = Number(payload.index);
      var index = options.length ? Math.max(0, Math.min(options.length - 1, Number.isFinite(requestedIndex) ? requestedIndex : 0)) : 0;
      var option = options[index];
      if (select.kind === "native") {
        if (action === "add") {
          var nativeOption = document.createElement("option");
          nativeOption.textContent = payload.label || "New option";
          nativeOption.value = payload.value || "option-" + (options.length + 1);
          select.root.appendChild(nativeOption);
        } else if (action === "remove" && option) {
          option.remove();
        } else if (action === "label" && option) {
          option.textContent = String(payload.value == null ? "" : payload.value);
        } else if (action === "value" && option) {
          option.value = String(payload.value == null ? "" : payload.value);
        } else if (action === "selected" && option) {
          var clearNativeDefault = option.selected;
          options.forEach(function (candidate) { candidate.selected = false; candidate.removeAttribute("selected"); });
          if (clearNativeDefault) select.root.selectedIndex = -1;
          else { option.selected = true; option.setAttribute("selected", ""); }
        } else if ((action === "up" || action === "down") && option) {
          var nativeSibling = action === "up" ? option.previousElementSibling : option.nextElementSibling;
          if (!nativeSibling) return;
          if (action === "up") option.parentNode.insertBefore(option, nativeSibling);
          else option.parentNode.insertBefore(nativeSibling, option);
        } else if (action === "duplicate" && option) {
          var nativeClone = option.cloneNode(true);
          clearLiveMarkers(nativeClone);
          cleanDuplicatedIds(nativeClone);
          nativeClone.selected = false;
          nativeClone.removeAttribute("selected");
          option.parentNode.insertBefore(nativeClone, option.nextSibling);
        } else return;
      } else {
        if (action === "add") {
          var customOption;
          if (options.length) {
            customOption = options[options.length - 1].cloneNode(true);
            clearLiveMarkers(customOption);
            cleanDuplicatedIds(customOption);
            var clonedInput = customOptionInput(customOption);
            if (clonedInput) {
              clonedInput.checked = false;
              clonedInput.removeAttribute("checked");
              clonedInput.value = payload.value || "option-" + (options.length + 1);
            }
            setCustomOptionLabel(customOption, payload.label || "New option");
          } else {
            customOption = document.createElement("label");
            customOption.className = "checkbox-label";
            customOption.innerHTML = '<input type="checkbox" value="' + String(payload.value || "option-1").replace(/"/g, "&quot;") + '"> ';
            customOption.appendChild(document.createTextNode(payload.label || "New option"));
          }
          select.content.appendChild(customOption);
        } else if (action === "remove" && option) {
          option.remove();
        } else if (action === "label" && option) {
          setCustomOptionLabel(option, payload.value);
        } else if (action === "value" && option) {
          var valueInput = customOptionInput(option);
          if (valueInput) valueInput.value = String(payload.value == null ? "" : payload.value);
        } else if (action === "selected" && option) {
          var defaultInput = customOptionInput(option);
          if (!defaultInput) return;
          var nextChecked = !defaultInput.checked;
          if (defaultInput.type === "radio") options.forEach(function (candidate) {
            var input = customOptionInput(candidate);
            if (input) { input.checked = false; input.removeAttribute("checked"); }
          });
          defaultInput.checked = nextChecked;
          defaultInput.toggleAttribute("checked", nextChecked);
          dispatchValueEvents(defaultInput);
        } else if ((action === "up" || action === "down") && option) {
          var customSibling = action === "up" ? option.previousElementSibling : option.nextElementSibling;
          if (!customSibling) return;
          if (action === "up") option.parentNode.insertBefore(option, customSibling);
          else option.parentNode.insertBefore(customSibling, option);
        } else if (action === "duplicate" && option) {
          var customClone = option.cloneNode(true);
          clearLiveMarkers(customClone);
          cleanDuplicatedIds(customClone);
          var duplicateInput = customOptionInput(customClone);
          if (duplicateInput) { duplicateInput.checked = false; duplicateInput.removeAttribute("checked"); }
          option.parentNode.insertBefore(customClone, option.nextSibling);
        } else return;
      }
      var after = selectSnapshot(target);
      dispatchValueEvents(select.root);
      commitOperation({ undo: function () { restoreSelect(target, before); }, redo: function () { restoreSelect(target, after); } }, "select");
    }

    function clearLiveMarkers(root) {
      if (!root || root.nodeType !== 1) return;
      root.removeAttribute(LIVE_ID);
      root.removeAttribute("data-beautylab-runtime-id");
      cleanClasses(root);
      Array.from(root.querySelectorAll("[" + LIVE_ID + "]")).forEach(function (element) { element.removeAttribute(LIVE_ID); });
      Array.from(root.querySelectorAll("[data-beautylab-runtime-id]")).forEach(function (element) { element.removeAttribute("data-beautylab-runtime-id"); });
      Array.from(root.querySelectorAll("." + SELECTED_CLASS + ",." + HOVER_CLASS)).forEach(cleanClasses);
    }

    function structuralAction(action) {
      if (!editable(selected) || !selected.parentNode || locked(selected.parentElement)) return;
      var node = selected;
      var parentNode = node.parentNode;
      if (action === "duplicate") {
        var clone = node.cloneNode(true);
        clearLiveMarkers(clone);
        var idMap = objectTools ? objectTools.remapCloneIds(clone, document) : null;
        var cloneStyles = idMap ? objectTools.cloneIdStyles(document, idMap) : null;
        parentNode.insertBefore(clone, node.nextSibling);
        if (cloneStyles) parentNode.insertBefore(cloneStyles, clone.nextSibling);
        commitOperation({
          undo: function () { if (clone.parentNode) clone.parentNode.removeChild(clone); if (cloneStyles) cloneStyles.remove(); select(node); },
          redo: function () { parentNode.insertBefore(clone, node.nextSibling); if (cloneStyles) parentNode.insertBefore(cloneStyles, clone.nextSibling); select(clone); },
        }, "duplicate");
        select(clone);
        return;
      }
      if (action === "delete") {
        var nextSibling = node.nextSibling;
        node.remove();
        selected = null;
        commitOperation({
          undo: function () { parentNode.insertBefore(node, nextSibling && nextSibling.parentNode === parentNode ? nextSibling : null); select(node); },
          redo: function () { if (node.parentNode) node.remove(); selected = null; },
        }, "delete");
        return;
      }
      var sibling = action === "move-up" ? node.previousElementSibling : node.nextElementSibling;
      if (!sibling) return;
      var beforeNext = node.nextElementSibling;
      if (action === "move-up") parentNode.insertBefore(node, sibling);
      else parentNode.insertBefore(sibling, node);
      commitOperation({
        undo: function () { parentNode.insertBefore(node, beforeNext && beforeNext.parentNode === parentNode ? beforeNext : null); },
        redo: function () { if (action === "move-up") parentNode.insertBefore(node, sibling); else parentNode.insertBefore(sibling, node); },
      }, action);
    }

    function insertImage(payload) {
      if (mode !== "edit" || locked(selected)) return;
      var image = document.createElement("img");
      image.src = String(payload.src || "");
      image.alt = String(payload.alt || "Inserted image");
      image.style.maxWidth = "100%";
      image.style.height = "auto";
      image.style.display = "block";
      var containerTags = /^(DIV|SECTION|ARTICLE|MAIN|ASIDE|HEADER|FOOTER|LI|TD|TH|FIGURE)$/;
      var parentNode;
      var nextSibling;
      if (selected && containerTags.test(selected.tagName)) {
        parentNode = selected;
        nextSibling = null;
      } else if (selected && selected.parentNode) {
        parentNode = selected.parentNode;
        nextSibling = selected.nextSibling;
      } else {
        parentNode = document.body;
        nextSibling = null;
      }
      parentNode.insertBefore(image, nextSibling);
      commitOperation({
        undo: function () { if (image.parentNode) image.remove(); },
        redo: function () { parentNode.insertBefore(image, nextSibling && nextSibling.parentNode === parentNode ? nextSibling : null); },
      }, "image");
      select(image);
    }

    function applyImage(payload) {
      var imageElement = findByLiveId(payload.liveId);
      if (!editable(imageElement) || imageElement.tagName !== "IMG") return;
      var beforeSrc = imageElement.getAttribute("src") || "";
      var beforeAlt = imageElement.getAttribute("alt");
      var nextSrc = String(payload.src || "");
      var nextAlt = String(payload.alt || beforeAlt || "Image");
      imageElement.setAttribute("src", nextSrc);
      imageElement.setAttribute("alt", nextAlt);
      commitOperation({
        undo: function () { imageElement.setAttribute("src", beforeSrc); if (beforeAlt == null) imageElement.removeAttribute("alt"); else imageElement.setAttribute("alt", beforeAlt); },
        redo: function () { imageElement.setAttribute("src", nextSrc); imageElement.setAttribute("alt", nextAlt); },
      }, "image");
    }

    function insertObject(kind, payload) {
      if (!objectTools || mode !== "edit" || locked(selected)) return;
      var spec = objectTools.insertionSpec(kind, payload);
      var node = document.createElement(spec.tagName);
      node.textContent = spec.content;
      Object.keys(spec.attributes).forEach(function (name) { node.setAttribute(name, spec.attributes[name]); });
      Object.keys(spec.styles).forEach(function (property) { node.style.setProperty(property, spec.styles[property]); });
      var container = selected && /^(DIV|SECTION|ARTICLE|MAIN|ASIDE|HEADER|FOOTER|LI|TD|TH|FIGURE)$/.test(selected.tagName) ? selected : null;
      var parentNode = container || (selected && selected.parentElement) || document.body;
      var nextSibling = container ? null : selected && selected.nextSibling;
      if (locked(parentNode)) return;
      parentNode.insertBefore(node, nextSibling || null);
      commitOperation({
        undo: function () { node.remove(); select(parentNode === document.body ? null : parentNode); },
        redo: function () { parentNode.insertBefore(node, nextSibling && nextSibling.parentNode === parentNode ? nextSibling : null); select(node); },
      }, "insert-" + kind);
      select(node);
    }

    function applyObjectStyles(target, styles, reason) {
      if (!objectTools || !editable(target)) return;
      var properties = Object.keys(styles);
      if (!properties.length) return;
      var before = objectTools.snapshotStyles(target, properties);
      properties.forEach(function (property) {
        var value = styles[property];
        if (value) target.style.setProperty(property, value, before[property].priority || "");
        else target.style.removeProperty(property);
      });
      var after = objectTools.snapshotStyles(target, properties);
      if (JSON.stringify(before) === JSON.stringify(after)) return;
      commitOperation({
        undo: function () { objectTools.applyStyleSnapshot(target, before); },
        redo: function () { objectTools.applyStyleSnapshot(target, after); },
      }, reason);
    }

    function toggleObjectLock(target) {
      if (!target || mode !== "edit" || !objectTools) return;
      var attribute = objectTools.lockAttribute;
      if (locked(target.parentElement)) return;
      var before = target.getAttribute(attribute);
      var apply = function (value) {
        if (value === null) target.removeAttribute(attribute);
        else target.setAttribute(attribute, value);
      };
      var next = before === null ? "" : null;
      apply(next);
      commitOperation({ undo: function () { apply(before); }, redo: function () { apply(next); } }, "lock");
    }

    function toggleObjectHidden(target) {
      if (!editable(target) || !objectTools) return;
      var marker = objectTools.hiddenStyleAttribute;
      var snapshot = function () {
        return { hidden: target.getAttribute("hidden"), marker: target.getAttribute(marker), display: objectTools.snapshotStyles(target, ["display"]) };
      };
      var restore = function (state) {
        if (state.hidden === null) target.removeAttribute("hidden");
        else target.setAttribute("hidden", state.hidden);
        if (state.marker === null) target.removeAttribute(marker);
        else target.setAttribute(marker, state.marker);
        objectTools.applyStyleSnapshot(target, state.display);
      };
      var before = snapshot();
      var hidden = target.hidden || window.getComputedStyle(target).display === "none";
      if (hidden) {
        target.removeAttribute("hidden");
        var original = null;
        try { original = JSON.parse(target.getAttribute(marker) || "null"); } catch (_) {}
        if (original && original.display) objectTools.applyStyleSnapshot(target, { display: original.display });
        else target.style.removeProperty("display");
        target.removeAttribute(marker);
        if (window.getComputedStyle(target).display === "none") target.style.setProperty("display", original && original.computedDisplay || "revert", "important");
      } else {
        target.setAttribute(marker, JSON.stringify({ display: before.display.display, computedDisplay: window.getComputedStyle(target).display }));
        target.setAttribute("hidden", "");
        target.style.setProperty("display", "none", "important");
      }
      var after = snapshot();
      commitOperation({ undo: function () { restore(before); }, redo: function () { restore(after); } }, "visibility");
    }

    function objectAction(payload) {
      if (!objectTools || mode !== "edit") return;
      var action = payload.action;
      var target = findByLiveId(payload.liveId);
      if (action === "insert-text") insertObject("text", payload);
      else if (action === "insert-shape") insertObject("shape", payload);
      else if (action === "toggle-lock") toggleObjectLock(target);
      else if (action === "toggle-hidden") toggleObjectHidden(target);
      else if (action === "copy-format" && target) {
        copiedFormat = objectTools.copyFormat(target);
        post("beautylab-live-format", { format: copiedFormat });
      } else if (action === "paste-format" && target) {
        var format = payload.format || copiedFormat;
        if (!format) return;
        var styles = {};
        objectTools.formatProperties.forEach(function (property) {
          if (typeof format[property] === "string") styles[property] = format[property];
        });
        applyObjectStyles(target, styles, "format");
      } else if (action === "image-frame" && target && target.tagName === "IMG") {
        applyObjectStyles(target, objectTools.imageFrameStyles(payload), "image-frame");
      }
    }

    function setMode(nextMode) {
      var next = nextMode === "preview" ? "preview" : "edit";
      if (next === "preview") {
        finishDirectTextEdit(true);
        if (imageResizeContext) {
          var context = imageResizeContext;
          imageResizeContext = null;
          applyImageSizeSnapshot(context.element, context.before);
          runtimeEdits("cancel");
        }
      }
      mode = next;
      document.documentElement.toggleAttribute("data-beautylab-live-edit", mode === "edit");
      if (hovered) cleanClasses(hovered);
      hovered = null;
      if (selected) {
        selected.classList.toggle(SELECTED_CLASS, mode === "edit");
        if (!selected.getAttribute("class")) selected.removeAttribute("class");
      }
      if (mode === "edit") refreshSelection();
      post("beautylab-live-mode", { mode: mode });
    }

    function interactiveActivationTarget(node) {
      var element = node && node.nodeType === 1 ? node : node && node.parentElement;
      if (!element || !element.closest || element.closest("[data-beautylab-live-ui]")) return null;
      return element.closest("button,a[href],summary,[role=button],[onclick],[onpointerdown],[onmousedown]");
    }

    function isActiveModifiedInteraction(event) {
      if (!modifiedActivation || modifiedActivation.until < Date.now()) return false;
      if (event.type !== "submit") return false;
      var form = event.target && event.target.tagName === "FORM" ? event.target : null;
      return Boolean(form && form.contains(modifiedActivation.element));
    }

    function matchesModifiedActivation(event) {
      if (!modifiedActivation || modifiedActivation.until < Date.now()) return false;
      return interactiveActivationTarget(event.target) === modifiedActivation.element;
    }

    function stopModifiedNativeEvent(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function runModifiedActivation(event, activationTarget) {
      if (directEditor) finishDirectTextEdit(true);
      stopModifiedNativeEvent(event);
      if (event.type === "pointerdown") modifiedActivation = null;
      if (modifiedActivation && modifiedActivation.element === activationTarget && modifiedActivation.invoked) return;
      modifiedActivation = { element: activationTarget, until: Date.now() + 1200, invoked: true };
      post("beautylab-live-preview-activity", { interactionType: "modified-click" });
      replayingModifiedActivation = true;
      try { activationTarget.click(); }
      finally { replayingModifiedActivation = false; }
      window.setTimeout(function () {
        scheduleLayerTree();
        refreshSelection();
      }, 0);
    }

    function blockAndSelect(event) {
      if (mode !== "edit") {
        if (event.type === "click" || event.type === "input" || event.type === "change") {
          post("beautylab-live-preview-activity", { interactionType: event.type });
        }
        return;
      }
      if (replayingModifiedActivation) {
        var replayTarget = interactiveActivationTarget(event.target);
        if (event.type === "click" && replayTarget && replayTarget.tagName === "A") event.preventDefault();
        return;
      }
      if (matchesModifiedActivation(event) && event.type !== "pointerdown") {
        stopModifiedNativeEvent(event);
        return;
      }
      var activationTarget = (event.ctrlKey || event.metaKey) ? interactiveActivationTarget(event.target) : null;
      if (activationTarget) {
        runModifiedActivation(event, activationTarget);
        return;
      }
      if (isActiveModifiedInteraction(event)) {
        event.preventDefault();
        post("beautylab-live-preview-activity", { interactionType: "modified-submit" });
        return;
      }
      if (event.type === "pointerdown") modifiedActivation = null;
      var target = meaningfulTarget(event.target);
      if (!target) return;
      if (directEditor) finishDirectTextEdit(true);
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type === "pointerdown") {
        select(target);
      } else if (event.type === "mousedown") {
        select(target);
      } else if (event.type === "click") {
        select(target);
      }
    }

    function hoverTarget(event) {
      if (mode !== "edit") return;
      var target = meaningfulTarget(event.target);
      if (!target || target === selected || target === hovered) return;
      if (hovered) cleanClasses(hovered);
      hovered = target;
      hovered.classList.add(HOVER_CLASS);
    }

    function clearHover(event) {
      if (!hovered) return;
      var related = event.relatedTarget;
      if (related && hovered.contains(related)) return;
      cleanClasses(hovered);
      hovered = null;
    }

    document.addEventListener("pointerover", hoverTarget, true);
    document.addEventListener("pointerout", clearHover, true);
    document.addEventListener("dblclick", startDirectTextEdit, true);
    ["pointerdown", "mousedown", "mouseup", "click", "contextmenu", "submit"].forEach(function (type) {
      document.addEventListener(type, blockAndSelect, true);
    });
    ["input", "change", "toggle"].forEach(function (type) {
      document.addEventListener(type, function (event) {
        if (mode === "preview") post("beautylab-live-preview-activity", { interactionType: event.type });
      }, true);
    });

    window.addEventListener("message", function (event) {
      var message = event.data || {};
      if (event.source !== parent || message.token !== TOKEN) return;
      try {
        var mutationCommand = ["beautylab-live-apply-text", "beautylab-live-apply-style", "beautylab-live-select-action", "beautylab-live-insert-image", "beautylab-live-replace-image"].indexOf(message.type) !== -1
          || (message.type === "beautylab-live-action" && message.action !== "undo" && message.action !== "redo")
          || (message.type === "beautylab-live-object-action" && message.action !== "copy-format");
        if (mutationCommand) {
          finishDirectTextEdit(true);
          runtimeEdits("begin");
        }
        if (message.type === "beautylab-live-set-mode") setMode(message.mode);
        else if (message.type === "beautylab-live-apply-text") applyText(message.key, message.value, message.liveId);
        else if (message.type === "beautylab-live-apply-style") applyStyle(message.property, message.value, message.liveId);
        else if (message.type === "beautylab-live-select-action") applySelectAction(message.action, message);
        else if (message.type === "beautylab-live-object-action") objectAction(message);
        else if (message.type === "beautylab-live-select-layer") {
          finishDirectTextEdit(true);
          var layerElement = findByLiveId(message.liveId);
          if (layerElement) {
            select(layerElement);
            try { layerElement.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (_) {}
          }
        }
        else if (message.type === "beautylab-live-action") {
          finishDirectTextEdit(true);
          if (message.action === "undo") undo();
          else if (message.action === "redo") redo();
          else structuralAction(message.action);
        } else if (message.type === "beautylab-live-insert-image") insertImage(message);
        else if (message.type === "beautylab-live-replace-image") applyImage(message);
        else if (message.type === "beautylab-live-resize-image") resizeImage(message);
        else if (message.type === "beautylab-live-request-selection") {
          syncViewportWidth();
          refreshSelection();
        }
        if (mutationCommand) runtimeEdits("cancel");
      } catch (error) {
        if (mutationCommand) runtimeEdits("cancel");
        post("beautylab-live-error", { message: String(error && error.message || error) });
      }
    });

    window.addEventListener("scroll", scheduleViewportSelection, true);
    window.addEventListener("resize", function () {
      syncViewportWidth();
      scheduleViewportSelection();
    });

    new MutationObserver(function () {
      if (selected && !selected.isConnected) {
        selected = null;
        sendSelection();
      }
      scheduleLayerTree();
      scheduleViewportSelection();
    }).observe(document.documentElement, { childList: true, subtree: true });

    if (window.BeautyLabTextInputGuard) window.BeautyLabTextInputGuard.finish = finishDirectTextEdit;
    window.BeautyLabCommitDirectText = function () { finishDirectTextEdit(true); };
    syncViewportWidth();
    editorStyle();
    setMode("edit");
    sendHistory();
    sendLayerTree();
    post("beautylab-live-ready");
    window.addEventListener("load", function () { syncViewportWidth(); post("beautylab-live-ready"); sendLayerTree(); }, { once: true });
    setTimeout(function () { post("beautylab-live-ready"); sendLayerTree(); }, 1200);
  }

  function createDocument(outputHtml, token, options = {}) {
    if (!global.FrameEditIO) throw new Error("Beauty Lab document engine is unavailable.");
    const previewHtml = global.FrameEditIO.createInteractivePreviewDocument(outputHtml, token, {
      scriptIds: options.scriptIds || [],
      trackActivity: false,
    });
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(previewHtml, "text/html");
    const keyboardGuard = documentNode.createElement("script");
    keyboardGuard.setAttribute(BRIDGE_ATTRIBUTE, "");
    keyboardGuard.textContent = `(${installTextInputGuard.toString()})();`;
    documentNode.head.prepend(keyboardGuard);
    const bridge = documentNode.createElement("script");
    bridge.setAttribute(BRIDGE_ATTRIBUTE, "");
    bridge.textContent = `${global.BeautyLabObjectTools ? global.BeautyLabObjectTools.bootstrapSource() : ""}\n(${liveCompatBridge.toString()})(${JSON.stringify(token)});`;
    documentNode.body.appendChild(bridge);
    return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
  }

  global.BeautyLabLiveCompat = Object.freeze({
    bridgeAttribute: BRIDGE_ATTRIBUTE,
    createDocument,
  });
})(window);
