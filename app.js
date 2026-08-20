(function startFrameEdit() {
  "use strict";

  const PRODUCT_NAME = "Edward's HTML Beauty Lab";
  const PRODUCT_TITLE = `${PRODUCT_NAME} - 本地 HTML 美化工坊`;
  const ECO_MODE_KEY = "edward-beauty-lab-eco-mode";
  const i18n = window.BeautyLabI18n || {
    getLanguage: () => "zh",
    onChange: () => {},
    setLanguage: () => {},
    t: (value) => value,
  };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const ui = {
    appShell: $("#app"),
    workspace: $(".workspace"),
    openFileButton: $("#open-file-button"),
    pasteCodeButton: $("#paste-code-button"),
    previewButton: $("#preview-button"),
    saveButton: $("#save-button"),
    exportButton: $("#export-button"),
    printButton: $("#print-button"),
    userGuideButton: $("#user-guide-button"),
    fileInput: $("#html-file-input"),
    emptyState: $("#editor-empty-state"),
    emptyOpenFileButton: $("#empty-open-file-button"),
    emptyPasteCodeButton: $("#empty-paste-code-button"),
    undoButton: $("#undo-button"),
    redoButton: $("#redo-button"),
    insertImageButton: $("#insert-image-button"),
    insertImageFileInput: $("#insert-image-file-input"),
    duplicateButton: $("#duplicate-button"),
    moveUpButton: $("#move-up-button"),
    moveDownButton: $("#move-down-button"),
    deleteButton: $("#delete-button"),
    boldButton: $("#bold-button"),
    alignButtons: $$(".align-button"),
    viewportSelect: $("#viewport-select"),
    warningsButton: $("#warnings-button"),
    warningSummary: $("#warning-summary"),
    warningCount: $("#warning-count"),
    warningsDialog: $("#warnings-dialog"),
    warningsList: $("#warnings-list"),
    closeWarningsButton: $("#close-warnings-button"),
    continueExportButton: $("#continue-export-button"),
    pasteDialog: $("#paste-dialog"),
    pasteInput: $("#paste-input"),
    pasteError: $("#paste-error"),
    importPastedCode: $("#import-pasted-code"),
    previewDialog: $("#preview-dialog"),
    previewFrame: $("#preview-frame"),
    closePreviewButton: $("#close-preview-button"),
    refreshPreviewButton: $("#refresh-preview-button"),
    exportFromPreviewButton: $("#export-from-preview-button"),
    previewWarningLabel: $("#preview-warning-label"),
    printFrame: $("#print-frame"),
    documentNameButton: $("#document-name-button"),
    documentName: $("#document-name"),
    documentNameInput: $("#document-name-input"),
    documentState: $("#document-state"),
    dirtyDot: $("#dirty-dot"),
    selectedComponentName: $("#selected-component-name"),
    selectionPath: $("#selection-path span"),
    noSelection: $("#no-selection"),
    selectTools: $("#select-tools"),
    selectToolsTitle: $("#select-tools-title"),
    selectToolsDescription: $("#select-tools-description"),
    selectOptionsList: $("#select-options-list"),
    selectOptionsEmpty: $("#select-options-empty"),
    selectOptionsRuntimeNote: $("#select-options-runtime-note"),
    selectOptionCount: $("#select-option-count"),
    addSelectOptionButton: $("#add-select-option-button"),
    removeSelectOptionButton: $("#remove-select-option-button"),
    imageTools: $("#image-tools"),
    canvasTools: $("#canvas-tools"),
    rightSidebar: $(".right-sidebar"),
    replaceImageButton: $("#replace-image-button"),
    imageFileInput: $("#image-file-input"),
    imageWidthSlider: $("#image-width-slider"),
    imageWidthOutput: $("#image-width-output"),
    imageWidthPresets: $$('[data-image-width]'),
    toggleLayersButton: $("#toggle-layers-button"),
    dropOverlay: $("#drop-overlay"),
    toastRegion: $("#toast-region"),
    confirmDialog: $("#confirm-dialog"),
    confirmTitle: $("#confirm-title"),
    confirmMessage: $("#confirm-message"),
    confirmCancelButton: $("#confirm-cancel-button"),
    confirmAcceptButton: $("#confirm-accept-button"),
    changelogButton: $("#changelog-button"),
    changelogDialog: $("#changelog-dialog"),
    closeChangelogButton: $("#close-changelog-button"),
    languageButton: $("#language-button"),
    ecoButton: $("#eco-button"),
    moreMenuWrap: $("#more-menu-wrap"),
    moreMenuButton: $("#more-menu-button"),
    moreMenu: $("#more-menu"),
  };

  const state = {
    document: null,
    dirty: false,
    loading: false,
    pendingAction: null,
    lastExportUrl: null,
    dragDepth: 0,
    fileHandle: null,
    documentNameEditable: false,
    pendingImageInsertionComponent: null,
    modifiedSelectIds: new Set(),
    userGuideBlobUrl: null,
  };
  const htmlPickerTypes = [{
    description: "HTML 文件",
    accept: { "text/html": [".html", ".htm"] },
  }];
  const preparedCanvasDocuments = new WeakSet();
  const preparedCanvasElements = new WeakSet();
  let hoveredCanvasComponent = null;
  let selectHoverTimer = null;

  if (!window.FrameEditIO || !window.FrameEditSelectOptions) {
    document.body.innerHTML = "<main style='max-width:680px;margin:80px auto;padding:32px;font-family:sans-serif;line-height:1.7'><h1>编辑器资源未完整载入</h1><p>请先完整解压 ZIP，再打开 index.html；也可以直接使用单文件版 Edward-HTML-Beauty-Lab.html。</p><p>本工具无需 localhost、无需安装，也不需要联网。</p></main>";
    return;
  }

  let editor = null;
  let editorReadyPromise = null;
  let selectOptionsController = null;

  function createEditor() {
    if (editor) return editor;
    if (!window.grapesjs) throw new Error("编辑引擎未完整载入。");

    editor = window.grapesjs.init({
    container: "#gjs",
    height: "100%",
    width: "auto",
    telemetry: false,
    cssIcons: "",
    storageManager: false,
    noticeOnUnload: false,
    panels: { defaults: [] },
    layerManager: { appendTo: "#layers" },
    selectorManager: { componentFirst: true },
    styleManager: {
      appendTo: "#styles",
      sectors: [
        {
          name: "文字",
          open: true,
          properties: [
            { property: "font-family", name: "字体", type: "select", options: [
              { id: '"Microsoft YaHei UI", sans-serif', label: "微软雅黑" },
              { id: '"SimSun", serif', label: "宋体" },
              { id: '"KaiTi", serif', label: "楷体" },
              { id: '"Segoe UI", sans-serif', label: "Segoe UI" },
              { id: 'Georgia, serif', label: "Georgia" },
              { id: 'Consolas, monospace', label: "Consolas" },
            ] },
            { property: "font-size", name: "字号", type: "integer", units: ["px", "rem", "pt"], min: 6 },
            { property: "font-weight", name: "字重", type: "select", options: [
              { id: "400", label: "常规" }, { id: "500", label: "中等" }, { id: "600", label: "半粗" }, { id: "700", label: "粗体" },
            ] },
            { property: "line-height", name: "行高", type: "integer", units: ["", "px", "%"], min: 0 },
            { property: "letter-spacing", name: "字间距", type: "integer", units: ["px", "em"], min: 0 },
            { property: "color", name: "文字颜色", type: "color" },
            { property: "text-align", name: "对齐", type: "radio", options: [
              { id: "left", label: "左" }, { id: "center", label: "中" }, { id: "right", label: "右" }, { id: "justify", label: "两端" },
            ] },
          ],
        },
        {
          name: "填充与边框",
          open: true,
          properties: [
            { property: "background-color", name: "背景色", type: "color" },
            { property: "opacity", name: "透明度", type: "slider", defaults: 1, min: 0, max: 1, step: 0.05 },
            { property: "border-width", name: "边框宽度", type: "integer", units: ["px"], min: 0 },
            { property: "border-style", name: "边框样式", type: "select", options: [
              { id: "none", label: "无" }, { id: "solid", label: "实线" }, { id: "dashed", label: "虚线" }, { id: "dotted", label: "点线" },
            ] },
            { property: "border-color", name: "边框颜色", type: "color" },
            { property: "border-radius", name: "圆角", type: "integer", units: ["px", "%"], min: 0 },
          ],
        },
        {
          name: "尺寸",
          open: false,
          properties: [
            { property: "width", name: "宽度", type: "integer", units: ["px", "%", "vw", "auto"], min: 0 },
            { property: "height", name: "高度", type: "integer", units: ["px", "%", "vh", "auto"], min: 0 },
            { property: "min-width", name: "最小宽度", type: "integer", units: ["px", "%"], min: 0 },
            { property: "min-height", name: "最小高度", type: "integer", units: ["px", "%"], min: 0 },
            { property: "max-width", name: "最大宽度", type: "integer", units: ["px", "%", "none"], min: 0 },
          ],
        },
        {
          name: "间距",
          open: false,
          properties: [
            { property: "margin", name: "外边距", type: "composite", properties: [
              { property: "margin-top", name: "上", type: "integer", units: ["px", "%", "auto"] },
              { property: "margin-right", name: "右", type: "integer", units: ["px", "%", "auto"] },
              { property: "margin-bottom", name: "下", type: "integer", units: ["px", "%", "auto"] },
              { property: "margin-left", name: "左", type: "integer", units: ["px", "%", "auto"] },
            ] },
            { property: "padding", name: "内边距", type: "composite", properties: [
              { property: "padding-top", name: "上", type: "integer", units: ["px", "%"] },
              { property: "padding-right", name: "右", type: "integer", units: ["px", "%"] },
              { property: "padding-bottom", name: "下", type: "integer", units: ["px", "%"] },
              { property: "padding-left", name: "左", type: "integer", units: ["px", "%"] },
            ] },
          ],
        },
        {
          name: "布局（高级）",
          open: false,
          properties: [
            { property: "display", name: "显示方式", type: "select", options: [
              { id: "block", label: "块" }, { id: "inline-block", label: "行内块" }, { id: "flex", label: "弹性布局" }, { id: "grid", label: "网格" }, { id: "none", label: "隐藏" },
            ] },
            { property: "flex-direction", name: "排列方向", type: "radio", options: [
              { id: "row", label: "横向" }, { id: "column", label: "纵向" },
            ] },
            { property: "justify-content", name: "主轴对齐", type: "select", options: [
              { id: "flex-start", label: "起点" }, { id: "center", label: "居中" }, { id: "flex-end", label: "终点" }, { id: "space-between", label: "两端" },
            ] },
            { property: "align-items", name: "交叉轴对齐", type: "select", options: [
              { id: "stretch", label: "拉伸" }, { id: "flex-start", label: "起点" }, { id: "center", label: "居中" }, { id: "flex-end", label: "终点" },
            ] },
            { property: "gap", name: "元素间距", type: "integer", units: ["px", "rem"], min: 0 },
          ],
        },
      ],
    },
    canvas: {
      styles: [],
      scripts: [],
    },
    assetManager: {
      upload: false,
      embedAsBase64: true,
    },
    parser: {
      optionsHtml: {
        allowScripts: false,
        // Active handlers and javascript: URLs are removed by FrameEditIO before GrapesJS sees the markup.
        allowUnsafeAttr: true,
      },
    },
    });
    selectOptionsController = FrameEditSelectOptions.create({
      editor,
      panel: ui.selectTools,
      list: ui.selectOptionsList,
      empty: ui.selectOptionsEmpty,
      count: ui.selectOptionCount,
      title: ui.selectToolsTitle,
      description: ui.selectToolsDescription,
      runtimeNote: ui.selectOptionsRuntimeNote,
      addButton: ui.addSelectOptionButton,
      removeButton: ui.removeSelectOptionButton,
      hasScripts: () => Boolean(state.document?.scripts?.length),
      onOptionsChanged: (target) => {
        if (target?.kind !== "native") return;
        const classes = String(target.root?.getAttributes?.().class || "").split(/\s+/);
        const idClass = classes.find((className) => className.startsWith(FrameEditIO.selectIdClassPrefix));
        const id = idClass?.slice(FrameEditIO.selectIdClassPrefix.length);
        if (id) state.modifiedSelectIds.add(id);
      },
      refreshIcons,
      showToast,
    });
    bindEditorEvents();
    return editor;
  }

  function refreshIcons(root = document) {
    if (window.lucide) window.lucide.createIcons({ attrs: { "aria-hidden": "true" }, root });
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "warning" ? "triangle-alert" : type === "error" ? "circle-x" : "circle-check";
    toast.innerHTML = `<i data-lucide="${icon}"></i><span>${escapeHtml(message)}</span>`;
    ui.toastRegion.append(toast);
    refreshIcons(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  function loadEditorStylesheet(url) {
    if (!url) return Promise.resolve();
    const existing = document.querySelector('link[data-beauty-lab-editor-style]');
    if (existing?.dataset.loadState === "loaded" || existing?.sheet) return Promise.resolve();
    if (existing?.dataset.loadState === "loading") {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("编辑器样式载入失败。")), { once: true });
      });
    }
    existing?.remove();
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.dataset.beautyLabEditorStyle = "";
      link.dataset.loadState = "loading";
      link.addEventListener("load", () => {
        link.dataset.loadState = "loaded";
        resolve();
      }, { once: true });
      link.addEventListener("error", () => {
        link.dataset.loadState = "error";
        reject(new Error("编辑器样式载入失败。"));
      }, { once: true });
      const firstStylesheet = document.head.querySelector('link[rel="stylesheet"], style');
      document.head.insertBefore(link, firstStylesheet || null);
    });
  }

  function loadEditorScript(url) {
    if (window.grapesjs) return Promise.resolve();
    const existing = document.querySelector('script[data-beauty-lab-editor-script]');
    if (existing?.dataset.loadState === "loading") {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("编辑引擎载入失败。")), { once: true });
      });
    }
    existing?.remove();
    if (!url) return Promise.reject(new Error("找不到编辑引擎资源。"));
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.dataset.beautyLabEditorScript = "";
      script.dataset.loadState = "loading";
      script.addEventListener("load", () => {
        script.dataset.loadState = "loaded";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => {
        script.dataset.loadState = "error";
        reject(new Error("编辑引擎载入失败。"));
      }, { once: true });
      document.head.append(script);
    });
  }

  function waitForEditorReady(instance, timeout = 15000) {
    if (instance.getModel?.().get?.("ready")) return Promise.resolve(instance);
    return new Promise((resolve, reject) => {
      let timer = null;
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        if (timer) window.clearTimeout(timer);
        instance.off?.("load", handleReady);
        if (error) reject(error);
        else resolve(instance);
      };
      const handleReady = () => finish();
      timer = window.setTimeout(() => finish(new Error("编辑器初始化超时，请刷新页面后重试。")), timeout);
      if (typeof instance.onReady === "function") instance.onReady(handleReady);
      else instance.once("load", handleReady);
    });
  }

  function ensureEditorReady() {
    if (editorReadyPromise) return editorReadyPromise;
    editorReadyPromise = (async () => {
      const needsDownload = !window.grapesjs;
      if (needsDownload) {
        ui.appShell.classList.add("engine-loading");
        ui.documentState.textContent = "正在准备编辑器…";
        await Promise.all([
          loadEditorStylesheet(document.body.dataset.grapesStyle),
          loadEditorScript(document.body.dataset.grapesScript),
        ]);
      }

      const instance = createEditor();
      return waitForEditorReady(instance);
    })()
      .catch((error) => {
        editorReadyPromise = null;
        throw error;
      })
      .finally(() => {
        ui.appShell.classList.remove("engine-loading");
        if (!state.document) ui.documentState.textContent = "等待载入";
      });
    return editorReadyPromise;
  }

  function escapeHtml(value) {
    const span = document.createElement("span");
    span.textContent = String(value);
    return span.innerHTML;
  }

  function setDirty(dirty) {
    state.dirty = dirty;
    ui.dirtyDot.hidden = !dirty;
    if (!state.document) {
      ui.documentState.textContent = "等待载入";
      document.title = i18n.getLanguage() === "en" ? `${PRODUCT_NAME} - Local HTML Design Workshop` : PRODUCT_TITLE;
      return;
    }
    ui.documentState.textContent = dirty ? "有未保存修改" : "已载入";
    document.title = `${dirty ? "* " : ""}${state.document.fileName} - ${PRODUCT_NAME}`;
  }

  function readLocalSetting(key, fallback = "") {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeLocalSetting(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function applyEcoMode(enabled, persist = true) {
    ui.appShell.classList.toggle("eco-mode", enabled);
    ui.ecoButton.setAttribute("aria-pressed", String(enabled));
    const label = enabled ? "关闭 L4TF 节能模式" : "开启 L4TF 节能模式";
    ui.ecoButton.title = label;
    ui.ecoButton.setAttribute("aria-label", label);
    if (persist) writeLocalSetting(ECO_MODE_KEY, enabled ? "true" : "false");
  }

  function syncLanguageButton() {
    const switchToChinese = i18n.getLanguage() === "en";
    ui.languageButton.querySelector("span").textContent = switchToChinese ? "CN" : "EN";
    ui.userGuideButton.querySelector("span").textContent = switchToChinese ? "User Guide" : "用户指南";
    const label = switchToChinese ? "Switch to Chinese" : "切换到英文";
    ui.languageButton.title = label;
    ui.languageButton.setAttribute("aria-label", label);
  }

  function setMoreMenuOpen(open) {
    ui.moreMenu.hidden = !open;
    ui.moreMenuButton.setAttribute("aria-expanded", String(open));
  }

  function readEmbeddedUserGuide() {
    const payload = $("#beauty-lab-embedded-guide")?.textContent?.trim();
    if (!payload) return "";
    try {
      const parsed = JSON.parse(payload);
      return typeof parsed.html === "string" ? parsed.html : "";
    } catch {
      return "";
    }
  }

  function openUserGuide() {
    setMoreMenuOpen(false);
    const language = i18n.getLanguage() === "en" ? "en" : "zh";
    const embeddedGuide = readEmbeddedUserGuide();
    let guideUrl;

    if (embeddedGuide) {
      if (!state.userGuideBlobUrl) {
        state.userGuideBlobUrl = URL.createObjectURL(new Blob([embeddedGuide], { type: "text/html;charset=utf-8" }));
      }
      guideUrl = `${state.userGuideBlobUrl}#lang=${language}`;
    } else {
      guideUrl = new URL(ui.userGuideButton.dataset.guideUrl, window.location.href);
      guideUrl.hash = `lang=${language}`;
    }

    const link = document.createElement("a");
    link.href = String(guideUrl);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.append(link);
    link.click();
    link.remove();
  }

  function normalizeDocumentFileName(value) {
    let fileName = String(value || "")
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[. ]+$/g, "");
    if (!fileName) return "";
    if (!/\.html?$/i.test(fileName)) fileName += ".html";
    return fileName;
  }

  function syncDocumentNameControl() {
    const editable = Boolean(state.document && state.documentNameEditable);
    ui.documentNameButton.disabled = !editable;
    ui.documentNameButton.classList.toggle("is-editable", editable);
    const label = editable ? "点击修改导出文件名" : "文件名";
    ui.documentNameButton.title = i18n.t(label);
    ui.documentNameButton.setAttribute("aria-label", i18n.t(label));
  }

  function startDocumentNameEdit() {
    if (!state.document || !state.documentNameEditable) return;
    ui.documentNameInput.value = state.document.fileName;
    ui.documentNameButton.hidden = true;
    ui.documentNameInput.hidden = false;
    window.requestAnimationFrame(() => {
      ui.documentNameInput.focus();
      const baseLength = ui.documentNameInput.value.replace(/\.html?$/i, "").length;
      ui.documentNameInput.setSelectionRange(0, baseLength);
    });
  }

  function finishDocumentNameEdit(commit = true) {
    if (ui.documentNameInput.hidden) return;
    if (commit) {
      const fileName = normalizeDocumentFileName(ui.documentNameInput.value);
      if (!fileName) {
        showToast("文件名不能为空", "warning");
        ui.documentNameInput.focus();
        return;
      }
      if (fileName !== state.document.fileName) {
        state.document = { ...state.document, fileName };
        ui.documentName.textContent = fileName;
        setDirty(state.dirty);
        updateSaveButton();
        showToast(`导出文件名已改为 ${fileName}`);
      }
    }
    ui.documentNameInput.hidden = true;
    ui.documentNameButton.hidden = false;
    syncDocumentNameControl();
  }

  function updateSaveButton() {
    const available = Boolean(state.document);
    ui.saveButton.disabled = !available;
    const directSave = Boolean(state.fileHandle);
    const title = directSave
      ? `保存并覆盖 ${state.document.fileName} Ctrl+S`
      : typeof window.showSaveFilePicker === "function"
        ? "保存（首次需要选择文件）Ctrl+S"
        : "当前浏览器不支持直接保存，请使用导出 HTML";
    ui.saveButton.title = title;
    ui.saveButton.setAttribute("aria-label", title.replace(" Ctrl+S", ""));
  }

  function setDocumentAvailability(available) {
    ui.appShell.classList.toggle("no-document", !available);
    ui.emptyState.hidden = available;
    [ui.previewButton, ui.exportButton, ui.printButton, ui.warningsButton, ui.insertImageButton, ui.toggleLayersButton].forEach((button) => {
      button.disabled = !available;
    });
    updateSaveButton();
    ui.viewportSelect.disabled = !available;
    if (!available) state.documentNameEditable = false;
    syncDocumentNameControl();
    if (available) return;
    ui.documentNameInput.hidden = true;
    ui.documentNameButton.hidden = false;
    ui.documentName.textContent = "尚未打开 HTML";
    ui.warningSummary.textContent = "等待载入";
    ui.warningCount.textContent = "0";
    ui.previewWarningLabel.textContent = "请先载入 HTML";
  }

  function updateUndoRedo() {
    if (!editor) {
      ui.undoButton.disabled = true;
      ui.redoButton.disabled = true;
      return;
    }
    const undoManager = editor.UndoManager;
    ui.undoButton.disabled = !undoManager.hasUndo();
    ui.redoButton.disabled = !undoManager.hasRedo();
  }

  function editorHistorySnapshot() {
    return `${editor.getHtml()}\n<style>${editor.getCss({ avoidProtected: true })}</style>`;
  }

  function runHistoryAction(direction) {
    if (!editor) return;
    const undoManager = editor.UndoManager;
    const isAvailable = direction === "undo" ? "hasUndo" : "hasRedo";
    let attempts = 0;
    let before = editorHistorySnapshot();
    while (undoManager[isAvailable]() && attempts < 12) {
      undoManager[direction]();
      attempts += 1;
      const after = editorHistorySnapshot();
      if (after !== before) break;
      before = after;
    }
    updateUndoRedo();
  }

  function getSelected() {
    return editor?.getSelected?.() || null;
  }

  function componentLabel(component) {
    if (!component) return "样式";
    const tag = (component.get("tagName") || component.get("type") || "元素").toLowerCase();
    const labels = {
      body: "页面",
      section: "分区",
      main: "主体",
      div: "容器",
      h1: "一级标题",
      h2: "二级标题",
      h3: "三级标题",
      p: "段落",
      span: "文字",
      img: "图片",
      canvas: "Canvas 图表",
      svg: "SVG 图形",
      ul: "列表",
      ol: "编号列表",
      li: "列表项",
      select: "下拉框",
      option: "下拉选项",
      table: "表格",
    };
    return labels[tag] || tag.toUpperCase();
  }

  function componentPath(component) {
    const parts = [];
    let current = component;
    while (current && parts.length < 5) {
      const tag = (current.get("tagName") || current.get("type") || "element").toLowerCase();
      const attributes = current.getAttributes?.() || {};
      const className = typeof attributes.class === "string" ? `.${attributes.class.split(/\s+/)[0]}` : "";
      const id = attributes.id ? `#${attributes.id}` : "";
      parts.unshift(`${tag}${id}${className}`);
      current = current.parent?.();
    }
    return parts.join("  ›  ");
  }

  function isTextLike(component) {
    if (!component) return false;
    const tag = (component.get("tagName") || "").toLowerCase();
    const type = component.get("type");
    return type === "text" || ["p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "li", "a", "strong", "em", "blockquote"].includes(tag);
  }

  function componentTagName(component) {
    return (component?.get?.("tagName") || "").toLowerCase();
  }

  function imageWidthPercent(component) {
    const match = String(component?.getStyle?.().width || "").trim().match(/^(\d+(?:\.\d+)?)%$/);
    if (!match) return null;
    return Math.min(100, Math.max(10, Math.round(Number(match[1]))));
  }

  function updateImageControls(component) {
    const percent = imageWidthPercent(component);
    ui.imageWidthSlider.value = String(percent ?? 100);
    ui.imageWidthOutput.value = percent === null ? "自动" : `${percent}%`;
    ui.imageWidthOutput.textContent = percent === null ? "自动" : `${percent}%`;
    ui.imageWidthPresets.forEach((button) => {
      const active = Number(button.dataset.imageWidth) === percent;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function updateSelectionUI() {
    const selected = getSelected();
    const hasSelection = Boolean(selected);
    ui.noSelection.hidden = hasSelection;
    ui.rightSidebar.classList.toggle("no-active-selection", !hasSelection);
    ui.selectedComponentName.textContent = componentLabel(selected);
    ui.selectionPath.textContent = hasSelection
      ? componentPath(selected)
      : state.document
        ? "点击元素开始编辑"
        : "选择或粘贴 HTML 后开始编辑";

    [ui.duplicateButton, ui.moveUpButton, ui.moveDownButton, ui.deleteButton].forEach((button) => {
      button.disabled = !hasSelection;
    });
    const textSelected = isTextLike(selected);
    ui.boldButton.disabled = !textSelected;
    ui.alignButtons.forEach((button) => (button.disabled = !textSelected));

    const tag = selected ? (selected.get("tagName") || "").toLowerCase() : "";
    selectOptionsController?.update(selected);
    ui.imageTools.hidden = tag !== "img";
    if (tag === "img") updateImageControls(selected);
    ui.canvasTools.hidden = tag !== "canvas";
  }

  function updateWarnings() {
    const warnings = state.document?.warnings || [];
    ui.warningCount.textContent = String(warnings.length);
    const risky = warnings.filter((warning) => warning.level === "warning").length;
    ui.warningSummary.textContent = risky ? `${risky} 项需要检查` : "兼容性良好";
    ui.previewWarningLabel.textContent = risky ? `预览前请留意 ${risky} 项兼容性提示` : "未发现明显兼容性风险";
    ui.warningsList.innerHTML = warnings
      .map(
        (warning) => `
          <div class="warning-item">
            <span class="warning-item-icon ${warning.level === "info" ? "info" : ""}"><i data-lucide="${warning.icon}"></i></span>
            <span class="warning-item-copy"><strong>${escapeHtml(warning.title)}</strong><span>${escapeHtml(warning.detail)}</span></span>
          </div>`,
      )
      .join("");
    refreshIcons(ui.warningsList);
  }

  function applyBodyAttributes(attributes) {
    const wrapper = editor.DomComponents.getWrapper();
    const current = wrapper.getAttributes();
    Object.keys(current).forEach((name) => wrapper.removeAttributes(name));
    wrapper.addAttributes(attributes || {});
  }

  function injectRawCanvasCss(css) {
    const frameDocument = editor.Canvas.getDocument();
    if (!frameDocument) return;
    frameDocument.querySelector('style[data-frameedit-original-css]')?.remove();
    const style = frameDocument.createElement("style");
    style.setAttribute("data-frameedit-original-css", "");
    style.textContent = css || "";
    const generatedStyles = Array.from(frameDocument.head.querySelectorAll("style"));
    const firstGeneratedStyle = generatedStyles.find((node) => node !== style && node.textContent?.includes(":root"));
    if (firstGeneratedStyle) {
      frameDocument.head.insertBefore(style, firstGeneratedStyle);
    } else {
      frameDocument.head.append(style);
    }
  }

  function injectCanvasStylesheetLinks(links = [], baseHref = "") {
    const frameDocument = editor.Canvas.getDocument();
    if (!frameDocument) return;
    frameDocument.querySelectorAll('[data-beautylab-external-style], base[data-beautylab-base]').forEach((node) => node.remove());

    if (baseHref) {
      const base = frameDocument.createElement("base");
      base.setAttribute("data-beautylab-base", "");
      base.href = baseHref;
      frameDocument.head.prepend(base);
    }

    const anchor = frameDocument.querySelector('style[data-frameedit-original-css]') || frameDocument.head.firstChild;
    const fragment = frameDocument.createDocumentFragment();
    links.forEach((attributes) => {
      const link = frameDocument.createElement("link");
      ["href", "rel", "media", "crossorigin", "referrerpolicy", "integrity", "type"].forEach((name) => {
        if (attributes?.[name] != null) link.setAttribute(name, attributes[name]);
      });
      link.setAttribute("data-beautylab-external-style", "");
      fragment.append(link);
    });
    frameDocument.head.insertBefore(fragment, anchor);
  }

  function requestRuntimeSnapshot(parsed) {
    if (!parsed.scripts.length) return Promise.resolve(null);
    return new Promise((resolve) => {
      const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const frame = document.createElement("iframe");
      frame.className = "runtime-snapshot-frame";
      frame.setAttribute("sandbox", "allow-scripts");
      frame.setAttribute("aria-hidden", "true");
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        window.removeEventListener("message", receive);
        frame.remove();
        resolve(result);
      };
      const receive = (event) => {
        if (event.data?.type !== "beautylab-runtime-snapshot" || event.data?.token !== token) return;
        finish({
          body: String(event.data.body || ""),
          css: String(event.data.css || ""),
          error: String(event.data.error || ""),
        });
      };
      window.addEventListener("message", receive);
      document.body.append(frame);
      frame.srcdoc = FrameEditIO.createRuntimeSnapshotDocument(parsed, token);
      window.setTimeout(() => finish(null), 7000);
    });
  }

  async function loadDocument(html, fileName = "粘贴的页面.html", fileHandle = null, { editableFileName = false } = {}) {
    await ensureEditorReady();
    let parsed;
    try {
      parsed = FrameEditIO.parseHtml(html, fileName);
    } catch (error) {
      throw new Error(error.message || "HTML 解析失败。");
    }

    if (parsed.scripts.length) {
      const runtimeSnapshot = await requestRuntimeSnapshot(parsed);
      if (runtimeSnapshot?.body) {
        const snapshot = FrameEditIO.mergeRuntimeSnapshot(parsed, runtimeSnapshot);
        if (snapshot.snapshotApplied) {
          parsed = {
            ...parsed,
            bodyHtml: snapshot.bodyHtml,
            css: [parsed.css, snapshot.css && `/* Isolated runtime snapshot styles */\n${snapshot.css}`].filter(Boolean).join("\n\n"),
            warnings: [
              ...parsed.warnings,
              {
                level: "info",
                icon: "scan-eye",
                title: "已载入脚本运行后的可编辑页面",
                detail: "普通 DOM 文字、图片和样式可以继续修改；Canvas、Shadow DOM 及脚本反复重建的内容仍需在最终预览中检查。",
              },
            ],
          };
        }
      } else {
        parsed = {
          ...parsed,
          warnings: [
            ...parsed.warnings,
            {
              level: "warning",
              icon: "triangle-alert",
              title: "页面脚本未在限定时间内完成",
              detail: "编辑器已载入原始 DOM。请检查网络依赖，或在最终预览中确认需要较长时间初始化的内容。",
            },
          ],
        };
      }
    }

    state.loading = true;
    editor.UndoManager.stop();
    editor.select(null);
    editor.setComponents(parsed.bodyHtml);
    editor.setStyle(parsed.css);
    applyBodyAttributes(parsed.bodyAttributes);
    injectRawCanvasCss(parsed.css);
    injectCanvasStylesheetLinks(parsed.stylesheetLinks, parsed.baseHref);
    state.document = parsed;
    state.modifiedSelectIds.clear();
    state.fileHandle = fileHandle;
    state.documentNameEditable = editableFileName;
    ui.documentName.textContent = parsed.fileName;
    setDocumentAvailability(true);
    updateWarnings();
    editor.UndoManager.clear();
    updateUndoRedo();
    updateSelectionUI();
    window.setTimeout(() => {
      editor.UndoManager.clear();
      editor.UndoManager.start();
      editor.clearDirtyCount?.();
      updateUndoRedo();
      state.loading = false;
      setDirty(false);
      installCanvasSafety();
      editor.refresh();
    }, 500);
    showToast(`已载入 ${parsed.fileName}`);
  }

  function buildOutput() {
    if (!state.document) throw new Error("请先打开或粘贴 HTML。");
    const editedCss = editor.getCss({ avoidProtected: true });
    const parser = new DOMParser();
    const editedDocument = parser.parseFromString(`<!doctype html><html><body>${editor.getHtml()}</body></html>`, "text/html");
    const selectOverrides = Array.from(state.modifiedSelectIds).flatMap((id) => {
      const select = Array.from(editedDocument.querySelectorAll("select")).find(
        (candidate) => candidate.classList.contains(`${FrameEditIO.selectIdClassPrefix}${id}`),
      );
      return select ? [{ id, html: select.innerHTML, value: select.value }] : [];
    });
    return FrameEditIO.createOutputDocument(
      state.document,
      editor.getHtml(),
      `${state.document.css}\n\n/* Edward's HTML Beauty Lab visual overrides */\n${editedCss}`,
      { selectOverrides },
    );
  }

  function outputFileName() {
    const original = state.document?.fileName || "未命名页面.html";
    return original.replace(/\.html?$/i, "") + "-已编辑.html";
  }

  function downloadOutput() {
    let html;
    try {
      html = buildOutput();
    } catch (error) {
      showToast(error.message, "error");
      return;
    }
    if (state.lastExportUrl) URL.revokeObjectURL(state.lastExportUrl);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    state.lastExportUrl = url;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = outputFileName();
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setDirty(false);
    showToast(`已生成 ${outputFileName()}`);
  }

  function refreshPreview() {
    try {
      const output = buildOutput();
      ui.previewFrame.srcdoc = FrameEditIO.createPreviewDocument(output);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function openPreview() {
    refreshPreview();
    ui.previewDialog.showModal();
  }

  function openWarnings(forExport = false) {
    ui.continueExportButton.hidden = !forExport;
    ui.warningsDialog.showModal();
  }

  function printOutput() {
    try {
      const output = buildOutput();
      ui.printFrame.hidden = false;
      ui.printFrame.srcdoc = FrameEditIO.createPreviewDocument(output, { print: true });
      window.setTimeout(() => (ui.printFrame.hidden = true), 5000);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function withDirtyConfirmation(action, title = "放弃未导出的修改？", message = "继续操作会清空当前修改。") {
    if (!state.dirty) {
      action();
      return;
    }
    state.pendingAction = action;
    ui.confirmTitle.textContent = title;
    ui.confirmMessage.textContent = message;
    ui.confirmDialog.showModal();
  }

  async function loadFile(file, fileHandle = null) {
    if (!file) return;
    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
      showToast("请选择 .html 或 .htm 文件。", "warning");
      return;
    }
    try {
      const html = await file.text();
      await loadDocument(html, file.name, fileHandle);
    } catch (error) {
      showToast(error.message || "无法读取这个文件。", "error");
    }
  }

  async function openHtmlFile() {
    if (typeof window.showOpenFilePicker !== "function") {
      ui.fileInput.click();
      return;
    }
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: htmlPickerTypes,
        multiple: false,
      });
      const file = await fileHandle.getFile();
      await loadFile(file, fileHandle);
    } catch (error) {
      if (error?.name !== "AbortError") showToast(error.message || "无法打开这个文件。", "error");
    }
  }

  async function requestWritePermission(fileHandle) {
    if (typeof fileHandle?.queryPermission !== "function") return true;
    const options = { mode: "readwrite" };
    if (await fileHandle.queryPermission(options) === "granted") return true;
    if (typeof fileHandle.requestPermission !== "function") return false;
    return await fileHandle.requestPermission(options) === "granted";
  }

  async function saveCurrentDocument() {
    let html;
    try {
      html = buildOutput();
    } catch (error) {
      showToast(error.message, "error");
      return;
    }

    let fileHandle = state.fileHandle;
    try {
      if (!fileHandle) {
        if (typeof window.showSaveFilePicker !== "function") {
          showToast("当前浏览器不支持直接保存，请使用“导出 HTML”。", "warning");
          return;
        }
        fileHandle = await window.showSaveFilePicker({
          suggestedName: state.document.fileName || "未命名页面.html",
          types: htmlPickerTypes,
        });
      }
      if (!await requestWritePermission(fileHandle)) {
        showToast("未获得文件写入权限，文件没有被修改。", "warning");
        return;
      }

      let writable;
      try {
        writable = await fileHandle.createWritable();
        await writable.write(new Blob([html], { type: "text/html;charset=utf-8" }));
        await writable.close();
      } catch (error) {
        if (typeof writable?.abort === "function") {
          try {
            await writable.abort();
          } catch {
            // Preserve the original write error.
          }
        }
        throw error;
      }

      state.fileHandle = fileHandle;
      if (fileHandle.name) {
        state.document = { ...state.document, fileName: fileHandle.name };
        ui.documentName.textContent = fileHandle.name;
      }
      setDirty(false);
      ui.documentState.textContent = "已保存";
      updateSaveButton();
      showToast(`已保存并覆盖 ${state.document.fileName}`);
    } catch (error) {
      if (error?.name !== "AbortError") showToast(error.message || "保存失败，原文件未被修改。", "error");
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("图片读取失败。"));
      reader.readAsDataURL(file);
    });
  }

  function validateImageFile(file) {
    if (!file) throw new Error("请选择图片文件。");
    const supportedType = /^(image\/(png|jpeg|webp|gif|svg\+xml))$/i.test(file.type || "");
    const supportedName = /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name || "");
    if (!supportedType && !supportedName) throw new Error("请选择 PNG、JPEG、WebP、GIF 或 SVG 图片。");
  }

  async function replaceSelectedImage(file) {
    const selected = getSelected();
    if (!selected || componentTagName(selected) !== "img" || !file) return;
    try {
      validateImageFile(file);
      const dataUrl = await readFileAsDataUrl(file);
      selected.set({ src: dataUrl });
      selected.addAttributes({ alt: selected.getAttributes().alt || file.name });
      showToast("图片已替换并内嵌到 HTML");
    } catch (error) {
      showToast(error.message || "图片读取失败。", "error");
    }
  }

  const flowContainerTags = new Set([
    "article", "aside", "blockquote", "details", "dialog", "div", "fieldset", "figcaption", "figure",
    "footer", "form", "header", "li", "main", "nav", "section", "summary", "td", "th",
  ]);
  const restrictedImageParentTags = new Set([
    "canvas", "colgroup", "defs", "dl", "g", "ol", "optgroup", "option", "select", "svg", "symbol",
    "table", "tbody", "tfoot", "thead", "tr", "ul",
  ]);

  function resolveImageInsertionTarget(reference = getSelected()) {
    const wrapper = editor.DomComponents.getWrapper();
    if (!reference || reference === wrapper || reference.is?.("wrapper")) {
      return { parent: wrapper, at: wrapper.components().length };
    }

    if (flowContainerTags.has(componentTagName(reference))) {
      return { parent: reference, at: reference.components().length };
    }

    let anchor = reference;
    let parent = reference.parent?.();
    while (parent && restrictedImageParentTags.has(componentTagName(parent))) {
      anchor = parent;
      parent = parent.parent?.();
    }

    if (!parent) return { parent: wrapper, at: wrapper.components().length };
    const anchorIndex = parent.components().indexOf(anchor);
    return { parent, at: anchorIndex < 0 ? parent.components().length : anchorIndex + 1 };
  }

  function insertImageDataUrl(dataUrl, fileName = "插入的图片", reference = getSelected()) {
    if (!state.document) throw new Error("请先打开或粘贴 HTML。");
    if (!/^data:image\//i.test(String(dataUrl))) throw new Error("图片没有转换为可离线使用的数据。");
    const target = resolveImageInsertionTarget(reference);
    const image = target.parent.components().add({
      type: "image",
      src: dataUrl,
      attributes: { alt: fileName || "插入的图片" },
      style: { display: "block", height: "auto", "max-width": "100%" },
    }, { at: target.at });
    editor.select(image);
    updateImageControls(image);
    showToast(reference ? "图片已插入到选中位置并内嵌到 HTML" : "图片已插入到页面末尾并内嵌到 HTML");
    return image;
  }

  async function insertImageFile(file, reference = getSelected()) {
    validateImageFile(file);
    const dataUrl = await readFileAsDataUrl(file);
    return insertImageDataUrl(dataUrl, file.name, reference);
  }

  function setSelectedImageWidth(value) {
    const selected = getSelected();
    if (!selected || componentTagName(selected) !== "img") return;
    const percent = Math.min(100, Math.max(10, Math.round(Number(value) || 100)));
    selected.addStyle({ width: `${percent}%`, height: "auto", "max-width": "100%" });
    updateImageControls(selected);
  }

  function moveSelected(direction) {
    const selected = getSelected();
    const parent = selected?.parent?.();
    if (!selected || !parent) return;
    const collection = parent.components();
    const currentIndex = collection.indexOf(selected);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= collection.length) {
      showToast(direction < 0 ? "已经是同级中的第一个元素" : "已经是同级中的最后一个元素", "warning");
      return;
    }
    collection.remove(selected, { temporary: true });
    collection.add(selected, { at: targetIndex });
    editor.select(selected);
  }

  function toggleStyle(property, activeValue, inactiveValue = "") {
    const selected = getSelected();
    if (!selected) return;
    const element = selected.getEl?.();
    const computed = element?.ownerDocument?.defaultView?.getComputedStyle?.(element)?.getPropertyValue(property);
    const current = selected.getStyle()[property] || computed;
    selected.addStyle({ [property]: current === activeValue ? inactiveValue : activeValue });
  }

  function findComponentByElement(component, element) {
    if (!component || !element) return null;
    const componentId = component.getAttributes?.().id || component.getId?.();
    if (component.getEl?.() === element || (element.id && componentId === element.id)) return component;
    let match = null;
    component.components?.().forEach((child) => {
      if (!match) match = findComponentByElement(child, element);
    });
    return match;
  }

  function getCanvasComponent(target) {
    const frameDocument = editor.Canvas.getDocument();
    let element = target?.nodeType === 1 ? target : target?.parentElement;
    while (element && element !== frameDocument?.documentElement) {
      const mountedComponent = element.__gjsv?.model;
      if (mountedComponent) return mountedComponent;
      const component = findComponentByElement(editor.DomComponents.getWrapper(), element);
      if (component) return component;
      element = element.parentElement;
    }
    return null;
  }

  function installComponentSelection(component) {
    const element = component?.getEl?.();
    if (!element || preparedCanvasElements.has(element)) return;
    preparedCanvasElements.add(element);
    const selectComponent = (event) => {
      if (typeof event.button === "number" && event.button !== 0) return;
      window.setTimeout(() => {
        if (getSelected() !== component) editor.select(component);
      }, 0);
    };
    element.addEventListener("pointerdown", selectComponent, true);
    element.addEventListener("click", selectComponent, true);
  }

  function installMountedComponentSelection(component) {
    installComponentSelection(component);
    component?.components?.().forEach(installMountedComponentSelection);
  }

  function handleCanvasComponentHover(component) {
    installComponentSelection(component);
    hoveredCanvasComponent = component;
    window.clearTimeout(selectHoverTimer);
    const tag = (component?.get?.("tagName") || "").toLowerCase();
    if (tag !== "select") return;
    selectHoverTimer = window.setTimeout(() => {
      const frame = editor.Canvas.getFrameEl();
      if (hoveredCanvasComponent === component && document.activeElement === frame) editor.select(component);
    }, 80);
  }

  function handleCanvasComponentUnhover(component) {
    if (hoveredCanvasComponent !== component) return;
    hoveredCanvasComponent = null;
    window.clearTimeout(selectHoverTimer);
  }

  function installCanvasSafety() {
    const frameDocument = editor.Canvas.getDocument();
    const frameRoot = frameDocument?.body;
    if (!frameRoot) return;
    installMountedComponentSelection(editor.DomComponents.getWrapper());
    if (preparedCanvasDocuments.has(frameRoot)) return;
    preparedCanvasDocuments.add(frameRoot);
    const selectCanvasTarget = (event) => {
      if (event.button !== 0) return;
      const component = getCanvasComponent(event.target);
      if (!component) return;
      window.setTimeout(() => {
        if (getSelected() !== component) editor.select(component);
      }, 0);
    };
    frameDocument.addEventListener("pointerdown", selectCanvasTarget, true);
    frameDocument.addEventListener("click", selectCanvasTarget, true);
    frameDocument.addEventListener("click", (event) => {
      const anchor = event.target.closest?.("a");
      if (anchor) event.preventDefault();
    });
    frameDocument.addEventListener("dblclick", (event) => {
      const component = getCanvasComponent(event.target);
      if (!component) return;
      editor.select(component);
      if (event.target?.tagName === "IMG") {
        window.setTimeout(() => ui.imageFileInput.click(), 0);
        return;
      }
      if (isTextLike(component) && component.getEl()?.contentEditable !== "true") {
        component.view?.onActive?.(event);
      }
    }, true);
  }

  function bindEditorEvents() {
    editor.on("load", () => {
      state.loading = true;
      editor.UndoManager.stop();
      editor.select(null);
      editor.setComponents("");
      editor.setStyle("");
      editor.UndoManager.clear();
      editor.UndoManager.start();
      editor.clearDirtyCount?.();
      state.fileHandle = null;
      state.loading = false;
      setDocumentAvailability(false);
      setDirty(false);
      updateUndoRedo();
      updateSelectionUI();
      installCanvasSafety();
    });
    editor.on("canvas:frame:load", installCanvasSafety);
    editor.on("component:mount", installComponentSelection);
    editor.on("component:hovered", handleCanvasComponentHover);
    editor.on("component:unhovered", handleCanvasComponentUnhover);
    editor.on("component:selected", updateSelectionUI);
    editor.on("component:deselected", updateSelectionUI);
    editor.on("component:styleUpdate", (component) => {
      if (component === getSelected() && componentTagName(component) === "img") updateImageControls(component);
    });
    editor.on("change:changesCount", () => {
      updateUndoRedo();
      if (!state.loading && state.document) setDirty(true);
    });
  }

  ui.openFileButton.addEventListener("click", () => withDirtyConfirmation(openHtmlFile, "打开其他 HTML？", "当前未保存的修改将被清空。"));
  ui.emptyOpenFileButton.addEventListener("click", () => ui.openFileButton.click());
  ui.fileInput.addEventListener("change", () => {
    const [file] = ui.fileInput.files;
    loadFile(file);
    ui.fileInput.value = "";
  });
  ui.pasteCodeButton.addEventListener("click", () => withDirtyConfirmation(() => {
    ui.pasteInput.value = "";
    ui.pasteError.hidden = true;
    ui.pasteDialog.showModal();
    window.setTimeout(() => ui.pasteInput.focus(), 0);
  }, "粘贴新的 HTML？", "载入新代码会清空当前未保存的修改。"));
  ui.emptyPasteCodeButton.addEventListener("click", () => ui.pasteCodeButton.click());
  ui.importPastedCode.addEventListener("click", async () => {
    ui.importPastedCode.disabled = true;
    try {
      await loadDocument(ui.pasteInput.value, "粘贴的页面.html", null, { editableFileName: true });
      ui.pasteDialog.close();
    } catch (error) {
      ui.pasteError.textContent = error.message;
      ui.pasteError.hidden = false;
    } finally {
      ui.importPastedCode.disabled = false;
    }
  });

  ui.previewButton.addEventListener("click", openPreview);
  ui.documentNameButton.addEventListener("click", startDocumentNameEdit);
  ui.documentNameInput.addEventListener("blur", () => finishDocumentNameEdit(true));
  ui.documentNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finishDocumentNameEdit(true);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      finishDocumentNameEdit(false);
      ui.documentNameButton.focus();
    }
  });
  ui.saveButton.addEventListener("click", saveCurrentDocument);
  ui.exportButton.addEventListener("click", () => openWarnings(true));
  ui.printButton.addEventListener("click", () => {
    setMoreMenuOpen(false);
    printOutput();
  });
  ui.userGuideButton.addEventListener("click", openUserGuide);
  ui.closePreviewButton.addEventListener("click", () => {
    ui.previewFrame.srcdoc = "";
    ui.previewDialog.close();
  });
  ui.refreshPreviewButton.addEventListener("click", refreshPreview);
  ui.exportFromPreviewButton.addEventListener("click", downloadOutput);
  ui.undoButton.addEventListener("click", () => runHistoryAction("undo"));
  ui.redoButton.addEventListener("click", () => runHistoryAction("redo"));
  ui.duplicateButton.addEventListener("click", () => {
    const selected = getSelected();
    if (!selected) return;
    const clone = selected.clone();
    selected.parent()?.append(clone, { at: selected.index() + 1 });
    editor.select(clone);
  });
  ui.deleteButton.addEventListener("click", () => {
    const selected = getSelected();
    if (selected && !selected.is("wrapper")) selected.remove();
  });
  ui.moveUpButton.addEventListener("click", () => moveSelected(-1));
  ui.moveDownButton.addEventListener("click", () => moveSelected(1));
  ui.boldButton.addEventListener("click", () => toggleStyle("font-weight", "700", "400"));
  ui.alignButtons.forEach((button) => button.addEventListener("click", () => {
    getSelected()?.addStyle({ "text-align": button.dataset.align });
  }));

  ui.insertImageButton.addEventListener("click", () => {
    ui.insertImageButton.blur();
    state.pendingImageInsertionComponent = getSelected();
    ui.insertImageFileInput.click();
  });
  ui.insertImageFileInput.addEventListener("change", async () => {
    const [file] = ui.insertImageFileInput.files;
    const reference = state.pendingImageInsertionComponent;
    state.pendingImageInsertionComponent = null;
    ui.insertImageFileInput.value = "";
    if (!file) return;
    try {
      await insertImageFile(file, reference);
    } catch (error) {
      showToast(error.message || "图片插入失败。", "error");
    }
  });
  ui.replaceImageButton.addEventListener("click", () => ui.imageFileInput.click());
  ui.imageFileInput.addEventListener("change", () => {
    replaceSelectedImage(ui.imageFileInput.files[0]);
    ui.imageFileInput.value = "";
  });
  ui.imageWidthSlider.addEventListener("input", () => setSelectedImageWidth(ui.imageWidthSlider.value));
  ui.imageWidthPresets.forEach((button) => button.addEventListener("click", () => {
    setSelectedImageWidth(button.dataset.imageWidth);
  }));
  ui.viewportSelect.addEventListener("change", () => {
    const frameWrapper = editor.Canvas.getFrameEl()?.parentElement;
    if (!frameWrapper) return;
    if (ui.viewportSelect.value === "16:9") {
      frameWrapper.style.aspectRatio = "16 / 9";
      frameWrapper.style.height = "auto";
      frameWrapper.style.maxHeight = "100%";
      frameWrapper.style.margin = "auto";
    } else {
      frameWrapper.style.aspectRatio = "";
      frameWrapper.style.height = "100%";
      frameWrapper.style.maxHeight = "";
      frameWrapper.style.margin = "";
    }
    editor.refresh();
  });
  ui.toggleLayersButton.addEventListener("click", () => {
    ui.workspace.classList.toggle("left-collapsed");
    const collapsed = ui.workspace.classList.contains("left-collapsed");
    ui.toggleLayersButton.title = collapsed ? "展开图层" : "收起图层";
    ui.toggleLayersButton.setAttribute("aria-label", ui.toggleLayersButton.title);
    ui.toggleLayersButton.setAttribute("aria-pressed", String(collapsed));
    const icon = ui.toggleLayersButton.querySelector("svg");
    if (icon) icon.outerHTML = `<i data-lucide="${collapsed ? "panel-left-open" : "panel-left-close"}"></i>`;
    refreshIcons(ui.toggleLayersButton);
    window.setTimeout(() => editor.refresh(), 180);
  });

  ui.warningsButton.addEventListener("click", () => openWarnings(false));
  ui.closeWarningsButton.addEventListener("click", () => ui.warningsDialog.close());
  ui.continueExportButton.addEventListener("click", () => {
    ui.warningsDialog.close();
    downloadOutput();
  });
  ui.confirmCancelButton.addEventListener("click", () => {
    state.pendingAction = null;
    ui.confirmDialog.close();
  });
  ui.confirmAcceptButton.addEventListener("click", () => {
    const action = state.pendingAction;
    state.pendingAction = null;
    ui.confirmDialog.close();
    action?.();
  });

  ui.moreMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setMoreMenuOpen(ui.moreMenu.hidden);
  });
  ui.moreMenu.addEventListener("click", (event) => {
    if (event.target.closest(".top-overflow-item:not(:disabled)")) setMoreMenuOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!ui.moreMenu.hidden && !ui.moreMenuWrap.contains(event.target)) setMoreMenuOpen(false);
  });
  window.addEventListener("resize", () => setMoreMenuOpen(false));

  ui.changelogButton.addEventListener("click", () => {
    setMoreMenuOpen(false);
    ui.changelogDialog.showModal();
  });
  ui.closeChangelogButton.addEventListener("click", () => ui.changelogDialog.close());
  ui.languageButton.addEventListener("click", () => {
    i18n.setLanguage(i18n.getLanguage() === "en" ? "zh" : "en");
  });
  i18n.onChange(() => {
    syncLanguageButton();
    syncDocumentNameControl();
    setDirty(state.dirty);
    updateSaveButton();
  });
  ui.ecoButton.addEventListener("click", () => {
    applyEcoMode(!ui.appShell.classList.contains("eco-mode"));
  });

  window.addEventListener("dragenter", (event) => {
    if (!Array.from(event.dataTransfer?.types || []).includes("Files")) return;
    state.dragDepth += 1;
    ui.dropOverlay.hidden = false;
  });
  window.addEventListener("dragover", (event) => {
    if (Array.from(event.dataTransfer?.types || []).includes("Files")) event.preventDefault();
  });
  window.addEventListener("dragleave", () => {
    state.dragDepth = Math.max(0, state.dragDepth - 1);
    if (!state.dragDepth) ui.dropOverlay.hidden = true;
  });
  window.addEventListener("drop", (event) => {
    event.preventDefault();
    state.dragDepth = 0;
    ui.dropOverlay.hidden = true;
    const file = Array.from(event.dataTransfer?.files || []).find((candidate) => /\.html?$/i.test(candidate.name));
    if (!file) {
      showToast("拖入的文件中没有 HTML。", "warning");
      return;
    }
    withDirtyConfirmation(() => loadFile(file), "打开拖入的 HTML？", "当前未保存的修改将被清空。");
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !ui.moreMenu.hidden) {
      event.preventDefault();
      setMoreMenuOpen(false);
      ui.moreMenuButton.focus();
      return;
    }
    if ($$("dialog[open]").length) return;
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === "s") {
      event.preventDefault();
      ui.saveButton.click();
      return;
    }
    if (modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      runHistoryAction(event.shiftKey ? "redo" : "undo");
    }
    if (modifier && event.key.toLowerCase() === "d") {
      event.preventDefault();
      ui.duplicateButton.click();
    }
    if ((event.key === "Delete" || event.key === "Backspace") && getSelected() && document.activeElement === document.body) {
      event.preventDefault();
      ui.deleteButton.click();
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
  window.addEventListener("unload", () => {
    if (state.userGuideBlobUrl) URL.revokeObjectURL(state.userGuideBlobUrl);
  });

  window.FrameEditApp = Object.freeze({
    buildOutput,
    get editor() {
      return editor;
    },
    ensureEditorReady,
    insertImageDataUrl,
    loadFile,
    loadDocument,
    saveCurrentDocument,
    setSelectedImageWidth,
    state,
  });
  applyEcoMode(readLocalSetting(ECO_MODE_KEY) === "true", false);
  i18n.setLanguage(i18n.getLanguage());
  refreshIcons();
  if (window.grapesjs) {
    ensureEditorReady().catch((error) => showToast(error.message || "编辑器初始化失败。", "error"));
  }
})();
