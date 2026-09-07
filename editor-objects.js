(function initBeautyLabEditorObjects(global) {
  "use strict";

  function create(config) {
    const { getEditor, getState, postLive, commitAtomic, showToast = () => {}, refreshSelection = () => {} } = config;
    const tools = global.BeautyLabObjectTools;
    const toolbar = document.getElementById("object-actions-toolbar");
    const framing = document.getElementById("image-frame-tools");
    if (!toolbar || !framing || !tools) throw new Error("Object editing controls are unavailable.");
    const originalFlags = new WeakMap();
    const layerModels = new WeakMap();
    const lockFlags = ["draggable", "droppable", "removable", "copyable", "editable", "resizable", "stylable"];
    const t = (value) => global.BeautyLabI18n?.t(value) || value;
    let copiedFormat = null;
    let lastImageKey = null;

    function icon(name) {
      const node = document.createElement("i");
      node.setAttribute("data-lucide", name);
      return node;
    }

    function refreshIcons(container) {
      global.lucide?.createIcons({ root: container, attrs: { "aria-hidden": "true" } });
    }

    function button(id, label, name) {
      const node = document.createElement("button");
      node.id = id;
      node.type = "button";
      node.className = "icon-button object-command";
      node.title = t(label);
      node.setAttribute("aria-label", t(label));
      node.append(icon(name));
      return node;
    }

    function setButton(buttonNode, label, name) {
      buttonNode.title = t(label);
      buttonNode.setAttribute("aria-label", t(label));
      if (buttonNode.dataset.icon !== name) {
        buttonNode.dataset.icon = name;
        buttonNode.replaceChildren(icon(name));
        refreshIcons(buttonNode);
      }
    }

    toolbar.classList.add("tool-group", "object-actions");
    toolbar.setAttribute("role", "group");
    toolbar.setAttribute("aria-label", t("对象操作"));
    const insertButton = button("insert-object-button", "插入对象", "square-plus");
    const lockButton = button("lock-object-button", "锁定对象", "lock-keyhole");
    const hiddenButton = button("hide-object-button", "隐藏对象", "eye-off");
    const copyButton = button("copy-format-button", "复制格式", "paintbrush");
    const pasteButton = button("paste-format-button", "应用格式", "paintbrush-vertical");
    insertButton.setAttribute("aria-haspopup", "menu");
    insertButton.setAttribute("aria-expanded", "false");
    insertButton.setAttribute("aria-controls", "object-insert-menu");
    toolbar.replaceChildren(insertButton, lockButton, hiddenButton, copyButton, pasteButton);

    const menu = document.createElement("div");
    menu.id = "object-insert-menu";
    menu.className = "object-insert-menu";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", t("插入对象"));
    const insertionChoices = [
      { kind: "text", label: "文字框", icon: "type" },
      { kind: "rectangle", label: "矩形", icon: "square" },
      { kind: "ellipse", label: "椭圆", icon: "circle" },
    ];
    insertionChoices.forEach((choice) => {
      const item = button(`insert-${choice.kind}-object`, choice.label, choice.icon);
      item.className = "object-insert-item";
      item.setAttribute("role", "menuitem");
      item.tabIndex = -1;
      const text = document.createElement("span");
      text.textContent = t(choice.label);
      item.append(text);
      item.addEventListener("click", () => { closeMenu(); insert(choice.kind); });
      menu.append(item);
    });
    document.body.append(menu);

    function closeMenu(returnFocus = false) {
      menu.hidden = true;
      insertButton.setAttribute("aria-expanded", "false");
      if (returnFocus) insertButton.focus({ preventScroll: true });
    }

    function positionMenu() {
      const rect = insertButton.getBoundingClientRect();
      menu.style.left = `${Math.max(8, Math.min(window.innerWidth - 188, rect.left))}px`;
      menu.style.top = `${Math.max(8, Math.min(window.innerHeight - 152, rect.bottom + 6))}px`;
    }

    insertButton.addEventListener("click", () => {
      if (!menu.hidden) { closeMenu(); return; }
      positionMenu();
      menu.hidden = false;
      insertButton.setAttribute("aria-expanded", "true");
      menu.querySelector("button")?.focus({ preventScroll: true });
    });
    document.addEventListener("pointerdown", (event) => {
      if (!menu.hidden && !menu.contains(event.target) && !insertButton.contains(event.target)) closeMenu();
    });
    document.addEventListener("scroll", () => { if (!menu.hidden) positionMenu(); }, true);
    window.addEventListener("resize", () => closeMenu());
    menu.addEventListener("keydown", (event) => {
      const items = Array.from(menu.querySelectorAll("button"));
      const current = items.indexOf(document.activeElement);
      if (event.key === "Escape") { event.preventDefault(); closeMenu(true); }
      if (event.key === "Tab") closeMenu();
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        items[(current + direction + items.length) % items.length].focus({ preventScroll: true });
      }
    });

    framing.classList.add("object-image-framing");
    const heading = document.createElement("strong");
    heading.className = "object-framing-heading";
    heading.append(icon("crop"), document.createTextNode(t("图片取景")));
    const fields = document.createElement("div");
    fields.className = "object-frame-fields";
    function field(label, control) {
      const wrapper = document.createElement("label");
      const text = document.createElement("span");
      text.textContent = t(label);
      wrapper.append(text, control);
      fields.append(wrapper);
      return wrapper;
    }
    function selectControl(id, choices) {
      const control = document.createElement("select");
      control.id = id;
      choices.forEach(([value, label, disabled]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = t(label);
        option.disabled = Boolean(disabled);
        control.append(option);
      });
      return control;
    }
    const fit = selectControl("object-image-fit", [["", "原始", true], ["contain", "适应"], ["cover", "填充"]]);
    const height = document.createElement("input");
    height.id = "object-image-height";
    height.type = "number";
    height.min = "1";
    height.max = "10000";
    height.step = "1";
    height.inputMode = "numeric";
    const position = selectControl("object-image-position", [
      ["", "自定义", true], ["left top", "左上"], ["center top", "上方"], ["right top", "右上"],
      ["left center", "左侧"], ["center center", "居中"], ["right center", "右侧"],
      ["left bottom", "左下"], ["center bottom", "下方"], ["right bottom", "右下"],
    ]);
    field("显示方式", fit);
    field("取景高度 (px)", height);
    field("取景位置", position).classList.add("object-frame-wide");
    framing.replaceChildren(heading, fields);
    [fit, height, position].forEach((control) => control.addEventListener("change", applyImageFrame));
    height.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); height.blur(); }
    });

    const tag = (component) => String(component?.get?.("tagName") || "").toLowerCase();
    const attributes = (component) => component?.getAttributes?.() || {};
    const ownLocked = (component) => Object.prototype.hasOwnProperty.call(attributes(component), tools.lockAttribute);

    function isLocked(component) {
      let current = component;
      while (current) {
        if (ownLocked(current)) return true;
        current = current.parent?.();
      }
      return false;
    }

    function context() {
      const state = getState() || {};
      const editor = getEditor();
      const live = Boolean(state.liveActive);
      const selection = live ? state.liveSelection : editor?.getSelected();
      const element = !live ? selection?.getEl?.() : null;
      const locked = live ? Boolean(selection?.locked) : isLocked(selection);
      const hidden = live ? Boolean(selection?.hidden) : Boolean(selection && (Object.prototype.hasOwnProperty.call(attributes(selection), "hidden") || element?.ownerDocument.defaultView.getComputedStyle(element).display === "none"));
      return { state, editor, live, selection, element, locked, hidden, editable: state.mode === "edit" && Boolean(state.hasDocument), hasSelection: Boolean(selection && !selection.is?.("wrapper")) };
    }

    function mutate(action) {
      commitAtomic(action);
      syncLocks();
      refreshSelection();
      refresh();
    }

    function send(action, payload = {}, selection = null) {
      const current = context();
      postLive("beautylab-live-object-action", { action, liveId: selection?.liveId || current.selection?.liveId, ...payload });
    }

    function insertionPoint(editor, selected) {
      const wrapper = editor.getWrapper();
      if (!selected || selected.is?.("wrapper")) return { parent: wrapper, at: wrapper.components().length };
      if (/^(div|section|article|main|aside|header|footer|li|td|th|figure)$/.test(tag(selected))) return { parent: selected, at: selected.components().length };
      let anchor = selected;
      let parent = selected.parent?.();
      while (parent && /^(p|span|a|button|label|select|option|optgroup|svg|picture|ul|ol|table|thead|tbody|tfoot|tr)$/.test(tag(parent))) { anchor = parent; parent = parent.parent?.(); }
      if (!parent) return { parent: wrapper, at: wrapper.components().length };
      return { parent, at: parent.components().indexOf(anchor) + 1 };
    }

    function insert(kind) {
      const current = context();
      if (!current.editable || current.locked) return;
      const payload = kind === "text" ? { text: t("新文字") } : { shape: kind };
      if (current.live) { send(kind === "text" ? "insert-text" : "insert-shape", payload); return; }
      const point = insertionPoint(current.editor, current.selection);
      if (isLocked(point.parent)) return;
      const spec = tools.insertionSpec(kind === "text" ? "text" : "shape", payload);
      const escaped = document.createElement("div");
      escaped.textContent = spec.content;
      if (kind !== "text") spec.attributes["aria-label"] = t(kind === "ellipse" ? "椭圆" : "矩形");
      mutate(() => {
        const added = point.parent.components().add({ tagName: spec.tagName, type: kind === "text" ? "text" : "default", content: escaped.innerHTML, attributes: spec.attributes, style: spec.styles }, { at: point.at });
        current.editor.select(added);
      });
    }

    function syncLocks() {
      const editor = getEditor();
      if (!editor || getState()?.liveActive) return;
      const walk = (component, inherited) => {
        const locked = inherited || ownLocked(component);
        const layerElement = component.viewLayer?.el;
        if (layerElement) {
          layerModels.set(layerElement, component);
          layerElement.toggleAttribute("data-object-locked", locked);
        }
        if (locked && !originalFlags.has(component)) originalFlags.set(component, Object.fromEntries(lockFlags.map((name) => [name, component.get(name)])));
        if (locked) component.set(Object.fromEntries(lockFlags.map((name) => [name, false])), { silent: true });
        else if (originalFlags.has(component)) {
          component.set(originalFlags.get(component), { silent: true });
          originalFlags.delete(component);
        }
        component.components?.().forEach((child) => walk(child, locked));
      };
      walk(editor.getWrapper(), false);
    }

    function toggleLock(selection = null) {
      const current = context();
      const target = selection || current.selection;
      if (!current.editable || !target) return;
      if (current.live) { send("toggle-lock", {}, target); return; }
      if (isLocked(target.parent?.())) return;
      mutate(() => {
        if (ownLocked(target)) target.removeAttributes(tools.lockAttribute);
        else target.addAttributes({ [tools.lockAttribute]: "" });
      });
    }

    function toggleHidden(selection = null) {
      const current = context();
      const target = selection || current.selection;
      if (!current.editable || !target) return;
      if (current.live) { send("toggle-hidden", {}, target); return; }
      if (isLocked(target)) return;
      const element = target.getEl?.();
      const style = target.getStyle();
      const hidden = Object.prototype.hasOwnProperty.call(attributes(target), "hidden") || element?.ownerDocument.defaultView.getComputedStyle(element).display === "none";
      mutate(() => {
        if (hidden) {
          let prior = null;
          try { prior = JSON.parse(attributes(target)[tools.hiddenStyleAttribute] || "null"); } catch (_) {}
          target.removeAttributes(["hidden", tools.hiddenStyleAttribute]);
          const nextStyle = { ...target.getStyle() };
          if (prior?.modelDisplay != null) nextStyle.display = prior.modelDisplay;
          else if (prior?.display?.value) nextStyle.display = `${prior.display.value}${prior.display.priority ? " !important" : ""}`;
          else delete nextStyle.display;
          target.setStyle(nextStyle);
          if (element?.ownerDocument.defaultView.getComputedStyle(element).display === "none") target.addStyle({ display: `${prior?.computedDisplay || "revert"} !important` });
        } else {
          const rawDisplay = String(style.display || "");
          const priorDisplay = rawDisplay ? { value: rawDisplay.replace(/\s*!important\s*$/, ""), priority: /!important\s*$/.test(rawDisplay) ? "important" : "" } : element ? tools.snapshotStyles(element, ["display"]).display : { value: "", priority: "" };
          target.addAttributes({ hidden: "", [tools.hiddenStyleAttribute]: JSON.stringify({ modelDisplay: style.display ?? null, display: priorDisplay, computedDisplay: element?.ownerDocument.defaultView.getComputedStyle(element).display || "" }) });
          target.addStyle({ display: "none !important" });
        }
      });
    }

    function copy() {
      const current = context();
      if (!current.editable || !current.hasSelection) return;
      if (current.live) { send("copy-format"); return; }
      if (!current.element) return;
      receiveFormat(tools.copyFormat(current.element));
    }

    function preservePriorities(component, values) {
      const prior = component.getStyle();
      const element = component.getEl?.();
      return Object.fromEntries(Object.entries(values).map(([property, value]) => {
        const important = /!important\s*$/.test(String(prior[property] || "")) || element?.style.getPropertyPriority(property) === "important";
        return [property, `${value}${important && value && !/!important\s*$/.test(value) ? " !important" : ""}`];
      }));
    }

    function paste() {
      const current = context();
      if (!current.editable || !current.hasSelection || current.locked || !copiedFormat) return;
      if (current.live) { send("paste-format", { format: copiedFormat }); return; }
      mutate(() => current.selection.addStyle(preservePriorities(current.selection, copiedFormat)));
    }

    function receiveFormat(format) {
      if (!format || typeof format !== "object") return;
      copiedFormat = Object.fromEntries(tools.formatProperties.filter((property) => typeof format[property] === "string").map((property) => [property, format[property]]));
      showToast(t("格式已复制"));
      refresh();
    }

    function applyImageFrame() {
      const current = context();
      if (!current.editable || !current.hasSelection || current.locked || !height.checkValidity() || !height.value) { height.reportValidity(); return; }
      const payload = { fit: fit.value, position: position.value, height: Number(height.value) };
      if (current.live) { send("image-frame", payload); return; }
      if (tag(current.selection) !== "img") return;
      mutate(() => current.selection.addStyle(preservePriorities(current.selection, tools.imageFrameStyles(payload))));
    }

    function normalizedPosition(value) {
      const lookup = { "0%": "left", "50%": "center", "100%": "right" };
      const vertical = { "0%": "top", "50%": "center", "100%": "bottom" };
      const parts = String(value || "").split(/\s+/);
      const candidate = `${lookup[parts[0]] || parts[0]} ${vertical[parts[1]] || parts[1]}`;
      return Array.from(position.options).some((option) => option.value === candidate) ? candidate : "";
    }

    function refresh() {
      const current = context();
      if (current.editor && !current.live) syncLocks();
      const imageSection = document.getElementById(current.live ? "live-image-section" : "image-tools");
      if (imageSection && imageSection.nextElementSibling !== framing) imageSection.after(framing);
      document.body.classList.toggle("object-has-locked-selection", current.locked);
      toolbar.hidden = !current.editable;
      if (!current.editable) closeMenu();
      insertButton.disabled = !current.editable || current.locked;
      lockButton.disabled = !current.editable || !current.hasSelection || (current.live ? current.locked && !current.selection?.ownLocked : isLocked(current.selection?.parent?.()));
      hiddenButton.disabled = !current.editable || !current.hasSelection || current.locked;
      copyButton.disabled = !current.editable || !current.hasSelection;
      pasteButton.disabled = !current.editable || !current.hasSelection || current.locked || !copiedFormat;
      setButton(lockButton, current.locked ? "解锁对象" : "锁定对象", current.locked ? "lock-keyhole-open" : "lock-keyhole");
      lockButton.setAttribute("aria-pressed", String(current.locked));
      setButton(hiddenButton, current.hidden ? "显示对象" : "隐藏对象", current.hidden ? "eye" : "eye-off");
      hiddenButton.setAttribute("aria-pressed", String(current.hidden));
      const isImage = current.live ? Boolean(current.selection?.isImage) : tag(current.selection) === "img";
      framing.hidden = !current.editable || !isImage;
      framing.inert = current.locked;
      framing.classList.toggle("object-locked-pane", current.locked);
      document.querySelectorAll("#styles,#text-tools,#select-tools,#image-tools,#canvas-tools,#live-compat-tools").forEach((panel) => {
        panel.inert = current.locked;
        panel.classList.toggle("object-locked-pane", current.locked);
      });
      if (current.locked) document.querySelectorAll("#duplicate-button,#move-up-button,#move-down-button,#delete-button,#bold-button,.align-button,#insert-image-button").forEach((control) => { control.disabled = true; });
      if (isImage) {
        const key = current.live ? current.selection.liveId : current.selection.cid;
        const changedImage = key !== lastImageKey;
        lastImageKey = key;
        const computed = current.live ? null : current.element?.ownerDocument.defaultView.getComputedStyle(current.element);
        const values = current.live ? current.selection.styles?.values || {} : null;
        const currentFit = current.live ? values["object-fit"] : computed?.objectFit;
        if (changedImage || document.activeElement !== fit) fit.value = currentFit === "cover" || currentFit === "contain" ? currentFit : "";
        if (changedImage || document.activeElement !== position) position.value = normalizedPosition(current.live ? values["object-position"] : computed?.objectPosition);
        if (changedImage || document.activeElement !== height) height.value = String(Math.max(1, Math.round(current.live ? current.selection.styles?.height || 1 : current.element?.getBoundingClientRect().height || 1)));
      } else lastImageKey = null;
    }

    lockButton.addEventListener("click", () => toggleLock());
    hiddenButton.addEventListener("click", () => toggleHidden());
    copyButton.addEventListener("click", copy);
    pasteButton.addEventListener("click", paste);
    document.getElementById("layers")?.addEventListener("click", (event) => {
      const visibility = event.target.closest("[data-toggle-visible]");
      if (!visibility || getState()?.liveActive) return;
      syncLocks();
      const component = layerModels.get(visibility.closest(".gjs-layer"));
      if (!component) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!component.is?.("wrapper")) toggleHidden(component);
    }, true);
    refreshIcons(toolbar);
    refreshIcons(menu);
    refreshIcons(framing);
    refresh();
    return Object.freeze({ refresh, receiveFormat, syncLocks, toggleLock, toggleHidden, isLocked });
  }

  global.BeautyLabEditorObjects = Object.freeze({ create });
})(window);
