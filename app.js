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
    modeSwitch: $("#mode-switch"),
    editModeButton: $("#edit-mode-button"),
    previewModeButton: $("#preview-mode-button"),
    liveCompatButton: $("#live-compat-button"),
    liveCompatMenuState: $("#live-compat-menu-state"),
    saveButton: $("#save-button"),
    exportButton: $("#export-button"),
    pngExportButton: $("#png-export-button"),
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
    interactivePreview: $("#interactive-preview"),
    previewFrame: $("#preview-frame"),
    refreshPreviewButton: $("#refresh-preview-button"),
    previewStatusText: $("#preview-status-text"),
    retryPreviewSyncButton: $("#retry-preview-sync-button"),
    discardPreviewButton: $("#discard-preview-button"),
    liveCompatStage: $("#live-compat-stage"),
    liveCompatFrameWrap: $("#live-compat-frame-wrap"),
    liveCompatFrame: $("#live-compat-frame"),
    liveCompatStatusText: $("#live-compat-status-text"),
    liveSelectionToolbar: $("#live-selection-toolbar"),
    liveImageResizeHandle: $("#live-image-resize-handle"),
    liveSelectionActions: $$('[data-live-selection-action]'),
    printFrame: $("#print-frame"),
    documentNameButton: $("#document-name-button"),
    documentName: $("#document-name"),
    documentNameInput: $("#document-name-input"),
    documentState: $("#document-state"),
    dirtyDot: $("#dirty-dot"),
    selectedComponentName: $("#selected-component-name"),
    selectionPath: $("#selection-path span"),
    noSelection: $("#no-selection"),
    textTools: $("#text-tools"),
    textContentList: $("#text-content-list"),
    textContentCount: $("#text-content-count"),
    textContentNote: $("#text-content-note"),
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
    liveCompatTools: $("#live-compat-tools"),
    liveSelectionTag: $("#live-selection-tag"),
    liveTextSection: $("#live-text-section"),
    liveTextCount: $("#live-text-count"),
    liveTextList: $("#live-text-list"),
    liveSelectSection: $("#live-select-section"),
    liveSelectTitle: $("#live-select-title"),
    liveSelectDescription: $("#live-select-description"),
    liveSelectCount: $("#live-select-count"),
    liveSelectList: $("#live-select-list"),
    liveSelectEmpty: $("#live-select-empty"),
    liveSelectRuntimeNote: $("#live-select-runtime-note"),
    liveAddOptionButton: $("#live-add-option-button"),
    liveRemoveOptionButton: $("#live-remove-option-button"),
    liveImageSection: $("#live-image-section"),
    liveCanvasSection: $("#live-canvas-section"),
    liveReplaceImageButton: $("#live-replace-image-button"),
    liveImageWidthSlider: $("#live-image-width-slider"),
    liveImageWidthOutput: $("#live-image-width-output"),
    liveImageWidthPresets: $$('[data-live-image-width]'),
    liveStyleFields: $$('[data-live-style]'),
    liveStyleButtons: $$('[data-live-style-button]'),
    liveColorValues: $$('[data-live-color-value]'),
    layersHint: $("#layers-hint"),
    layersPanel: $("#layers"),
    liveLayers: $("#live-layers"),
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
    mode: "edit",
    previewToken: "",
    previewInteracted: false,
    previewReady: false,
    previewSyncing: false,
    previewEntrySnapshot: null,
    previewHistory: [],
    previewHistoryIndex: -1,
    applyingPreviewHistory: false,
    editingEngine: "standard",
    hasAuthorEdits: false,
    liveCompatToken: "",
    liveCompatReady: false,
    liveCompatSelection: null,
    liveCompatSnapshot: null,
    liveCompatEntrySnapshot: null,
    liveCompatInteracted: false,
    liveCompatHistory: { canUndo: false, canRedo: false },
    liveCompatResources: null,
    liveCompatLayers: [],
    revision: 0,
    documentEpoch: 0,
    liveSourceHtml: null,
    recoveredEdits: null,
    exportMode: "interactive",
  };
  const htmlPickerTypes = [{
    description: "HTML 文件",
    accept: { "text/html": [".html", ".htm"] },
  }];
  const preparedCanvasDocuments = new WeakSet();
  const preparedCanvasElements = new WeakMap();
  const pendingTextCommits = new Set();
  let hoveredCanvasComponent = null;
  let selectHoverTimer = null;
  let liveImageResize = null;

  if (!window.FrameEditIO || !window.FrameEditSelectOptions || !window.BeautyLabLiveCompat) {
    document.body.innerHTML = "<main style='max-width:680px;margin:80px auto;padding:32px;font-family:sans-serif;line-height:1.7'><h1>编辑器资源未完整载入</h1><p>请先完整解压 ZIP，再打开 index.html；也可以直接使用单文件版 Edward-HTML-Beauty-Lab.html。</p><p>本工具无需 localhost、无需安装，也不需要联网。</p></main>";
    return;
  }

  let editor = null;
  let editorReadyPromise = null;
  let selectOptionsController = null;
  let draftController = null;
  let objectController = null;
  const canvasView = BeautyLabCanvasView.create({
    getEditor: () => editor,
    getState: () => state,
    onChange: () => {
      if (state.document && !state.loading) draftController?.schedule();
      if (state.editingEngine !== "live") return;
      renderLiveSelectionToolbar(state.liveCompatSelection);
      renderLiveImageResizeHandle(state.liveCompatSelection);
      postLiveCompat("beautylab-live-request-selection");
    },
  });
  const pngController = BeautyLabPng.create({
    getEpoch: () => state.documentEpoch,
    getFileName: () => state.document?.fileName || "Untitled.html",
    getTarget: () => {
      if (!state.document || state.loading) return null;
      if (state.editingEngine === "live") return state.liveCompatReady ? { frame: ui.liveCompatFrame, token: state.liveCompatToken } : null;
      if (state.mode === "preview") return state.previewReady ? { frame: ui.previewFrame, token: state.previewToken } : null;
      return { frame: editor.Canvas.getFrameEl(), token: "standard", direct: true };
    },
    flush: flushPendingTextEdits,
    notify: showToast,
    closeMenu: () => setMoreMenuOpen(false),
    t: value => i18n.t(value),
  });
  draftController = BeautyLabDraftUI.create({
    showToast,
    capture: async () => {
      if (!state.document || state.loading) return null;
      const epoch = state.documentEpoch;
      flushPendingTextEdits();
      let previewHtml = null;
      if (state.editingEngine === "live") await captureLiveCompatSnapshot({ quiet: true });
      else if (state.mode === "preview" && state.previewInteracted) {
        const result = await requestPreviewCapture();
        if (epoch !== state.documentEpoch) return null;
        if (!result.body?.trim()) throw new Error("预览同步未返回有效内容，请重试。");
        const merged = FrameEditIO.mergeRuntimeSnapshot(state.document, result);
        if (!merged.snapshotApplied) throw new Error("预览同步未返回有效内容，请重试。");
        previewHtml = outputWithView(FrameEditIO.createOutputDocument({ ...state.document, bodyAttributes: merged.bodyAttributes, stylesheets: merged.stylesheets || state.document.stylesheets }, merged.bodyHtml, editor.getCss({ avoidProtected: true })));
      }
      if (epoch !== state.documentEpoch) return null;
      return { html: previewHtml || buildOutput({ mode: "interactive" }), fileName: state.document.fileName, viewSettings: canvasView.getSettings(), dirty: state.dirty || state.previewInteracted };
    },
    restore: async (payload, { id }) => {
      await loadDocument(payload.html, payload.fileName, null, { editableFileName: true, draftId: id, viewSettings: payload.viewSettings });
      setDirty(true);
    },
    onStatus: (status) => {
      const label = $("#draft-status");
      if (label) label.textContent = i18n.t(status === "saving" ? "正在保存草稿" : status === "saved" ? "草稿已保存" : status === "error" ? "草稿保存失败" : "");
    },
  });

  objectController = BeautyLabEditorObjects.create({
    getEditor: () => editor,
    getState: () => ({ mode: state.mode, liveActive: state.editingEngine === "live", liveSelection: state.liveCompatSelection, hasDocument: Boolean(state.document) }),
    postLive: postLiveCompat,
    commitAtomic: (action) => {
      const before = captureEditorState();
      state.loading = true;
      try { editor.UndoManager.skip(action); }
      finally { state.loading = false; }
      state.hasAuthorEdits = true;
      setDirty(true);
      pushPreviewHistory(before, captureEditorState());
      updateUndoRedo();
    },
    showToast,
    refreshSelection: updateSelectionUI,
  });

  const imageResizableOptions = Object.freeze({
    ratioDefault: 1,
    minDim: 24,
    tl: true,
    tc: false,
    tr: true,
    cl: false,
    cr: false,
    bl: true,
    bc: false,
    br: true,
  });

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
    avoidInlineStyle: false,
    forceClass: false,
    protectedCss: "",
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
    if (dirty && !state.loading) {
      state.revision += 1;
      draftController?.schedule();
    }
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
    document.body.classList.toggle("eco-mode", enabled);
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
    updateLiveCompatMenu();
  }

  function updateLiveCompatMenu() {
    const enabled = state.editingEngine === "live";
    ui.liveCompatButton.setAttribute("aria-checked", String(enabled));
    ui.liveCompatMenuState.textContent = i18n.t(enabled ? "已开启" : "已关闭");
    const label = enabled ? "关闭联网兼容模式" : "开启联网兼容模式";
    ui.liveCompatButton.title = i18n.t(label);
    ui.liveCompatButton.setAttribute("aria-label", i18n.t(label));
  }

  function setMoreMenuOpen(open) {
    ui.moreMenu.hidden = !open;
    ui.moreMenuButton.setAttribute("aria-expanded", String(open));
  }

  let embeddedUserGuidePromise = null;

  function readEmbeddedUserGuide() {
    if (embeddedUserGuidePromise) return embeddedUserGuidePromise;
    const payload = $("#beauty-lab-embedded-guide")?.textContent?.trim();
    if (!payload) return Promise.resolve("");
    embeddedUserGuidePromise = (async () => {
      const parsed = JSON.parse(payload);
      if (typeof parsed.html === "string") return parsed.html;
      if (parsed.encoding !== "gzip-base64" || typeof parsed.data !== "string") return "";
      if (typeof window.DecompressionStream !== "function") {
        throw new Error("当前浏览器版本过旧，无法解压内嵌指南。请升级 Edge 或 Chrome。");
      }
      const binary = window.atob(parsed.data);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      return new Response(stream).text();
    })().catch((error) => {
      embeddedUserGuidePromise = null;
      throw error;
    });
    return embeddedUserGuidePromise;
  }

  async function openUserGuide() {
    setMoreMenuOpen(false);
    const language = i18n.getLanguage() === "en" ? "en" : "zh";
    let embeddedGuide = "";
    try {
      embeddedGuide = await readEmbeddedUserGuide();
    } catch (error) {
      showToast(error.message || "无法打开内嵌用户指南。", "error");
    }
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
    [ui.editModeButton, ui.previewModeButton, ui.exportButton, ui.pngExportButton, ui.printButton, ui.warningsButton, ui.insertImageButton, ui.toggleLayersButton, ui.liveCompatButton].forEach((button) => {
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
    ui.previewStatusText.textContent = "请先载入 HTML";
  }

  function updateUndoRedo() {
    if (state.editingEngine === "live") {
      ui.undoButton.disabled = !state.liveCompatHistory.canUndo;
      ui.redoButton.disabled = !state.liveCompatHistory.canRedo;
      return;
    }
    if (!editor) {
      ui.undoButton.disabled = true;
      ui.redoButton.disabled = true;
      return;
    }
    const undoManager = editor.UndoManager;
    const current = captureEditorState();
    const previewUndo = state.previewHistory[state.previewHistoryIndex];
    const previewRedo = state.previewHistory[state.previewHistoryIndex + 1];
    const canPreviewUndo = Boolean(previewUndo && editableStateSignature(current) === previewUndo.afterSignature && undoManager.getPointer() === previewUndo.nativePointer);
    const canPreviewRedo = Boolean(previewRedo && editableStateSignature(current) === previewRedo.beforeSignature && undoManager.getPointer() === previewRedo.nativePointer);
    ui.undoButton.disabled = !undoManager.hasUndo() && !canPreviewUndo;
    ui.redoButton.disabled = !undoManager.hasRedo() && !canPreviewRedo;
  }

  function editorHistorySnapshot() {
    return `${editor.getHtml()}\n<style>${editor.getCss({ avoidProtected: true })}</style>`;
  }

  function captureEditorState() {
    if (!editor || !state.document) return null;
    return {
      html: editor.getHtml(),
      css: editor.getCss({ avoidProtected: true }),
      bodyAttributes: { ...editor.DomComponents.getWrapper().getAttributes() },
      runtimeCss: state.document.runtimeCss || "",
      runtimeRestore: state.document.runtimeRestore ? JSON.parse(JSON.stringify(state.document.runtimeRestore)) : null,
      runtimeStylesheets: state.document.runtimeStylesheets || null,
      hasAuthorEdits: state.hasAuthorEdits,
      modifiedSelectIds: Array.from(state.modifiedSelectIds),
      dirty: state.dirty,
    };
  }

  function editableStateSignature(snapshot) {
    if (!snapshot) return "";
    return JSON.stringify({
      html: snapshot.html,
      css: snapshot.css,
      bodyAttributes: snapshot.bodyAttributes,
      runtimeCss: snapshot.runtimeCss,
      runtimeRestore: snapshot.runtimeRestore,
      runtimeStylesheets: snapshot.runtimeStylesheets,
      modifiedSelectIds: snapshot.modifiedSelectIds,
    });
  }

  function applyEditorState(snapshot) {
    if (!snapshot || !editor || !state.document) return;
    state.loading = true;
    state.applyingPreviewHistory = true;
    editor.UndoManager.skip(() => {
      editor.select(null);
      editor.setComponents(snapshot.html);
      editor.setStyle(snapshot.css);
      applyBodyAttributes(snapshot.bodyAttributes);
    });
    state.document = {
      ...state.document,
      bodyAttributes: { ...snapshot.bodyAttributes },
      runtimeCss: snapshot.runtimeCss || "",
      runtimeRestore: snapshot.runtimeRestore ? JSON.parse(JSON.stringify(snapshot.runtimeRestore)) : null,
      runtimeStylesheets: snapshot.runtimeStylesheets || null,
    };
    state.hasAuthorEdits = snapshot.hasAuthorEdits !== false;
    state.modifiedSelectIds = new Set(snapshot.modifiedSelectIds || []);
    refreshCanvasStyles();
    setDirty(Boolean(snapshot.dirty));
    updateSelectionUI();
    editor.clearDirtyCount?.();
    editor.refresh();
    window.setTimeout(() => {
      editor.clearDirtyCount?.();
      setDirty(Boolean(snapshot.dirty));
      state.loading = false;
      state.applyingPreviewHistory = false;
      installCanvasSafety();
      updateUndoRedo();
    }, 400);
  }

  function runHistoryAction(direction) {
    if (!editor) return;
    const undoManager = editor.UndoManager;
    const current = captureEditorState();
    if (direction === "undo") {
      const entry = state.previewHistory[state.previewHistoryIndex];
      if (entry && editableStateSignature(current) === entry.afterSignature && undoManager.getPointer() === entry.nativePointer) {
        state.previewHistoryIndex -= 1;
        applyEditorState(entry.before);
        showToast("已撤销整次预览同步");
        return;
      }
    } else {
      const entry = state.previewHistory[state.previewHistoryIndex + 1];
      if (entry && editableStateSignature(current) === entry.beforeSignature && undoManager.getPointer() === entry.nativePointer) {
        state.previewHistoryIndex += 1;
        applyEditorState(entry.after);
        showToast("已恢复整次预览同步");
        return;
      }
    }
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
      button: "按钮",
      label: "标签",
      summary: "折叠标题",
      figcaption: "图注",
      td: "表格单元格",
      th: "表头单元格",
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

  function componentTagName(component) {
    return (component?.get?.("tagName") || "").toLowerCase();
  }

  const textExcludedTags = new Set([
    "script", "style", "template", "noscript",
    "img", "picture", "canvas", "svg", "path", "object", "embed", "iframe",
    "select", "option",
  ]);
  const valueTextInputTypes = new Set([
    "button", "submit", "reset", "text", "search", "email", "tel", "url", "number",
    "password", "date", "datetime-local", "month", "time", "week",
  ]);

  function decodeTextContent(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = String(value ?? "");
    return textarea.value;
  }

  function encodeTextContent(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function textNodeValue(component) {
    const element = component?.getEl?.();
    if (element?.nodeType === 3) return element.nodeValue || "";
    return decodeTextContent(component?.get?.("content") || "");
  }

  function appendEditableTextEntries(component, entries) {
    if (!component) return;
    const tag = componentTagName(component);
    const type = component.get?.("type");
    const element = component.getEl?.();
    if (textExcludedTags.has(tag)) return;
    if (type === "textnode" || element?.nodeType === 3) {
      if (textNodeValue(component).trim()) entries.push({ kind: "textnode", component });
      return;
    }

    const children = component.components?.();
    let childCount = 0;
    const entryCountBeforeChildren = entries.length;
    children?.forEach?.((child) => {
      childCount += 1;
      appendEditableTextEntries(child, entries);
    });
    if (entries.length === entryCountBeforeChildren && element?.nodeType === 1 && element.children.length === 0 && element.textContent?.trim()) {
      entries.push({ kind: "element-text", component });
    } else if (!childCount && type === "text") {
      const content = String(component.get?.("content") || "");
      if (decodeTextContent(content).trim()) entries.push({ kind: "content", component });
    }
  }

  function editableTextEntries(component) {
    if (!component || component.is?.("wrapper")) return [];
    const tag = componentTagName(component);
    if (textExcludedTags.has(tag)) return [];
    const entries = [];
    appendEditableTextEntries(component, entries);
    const attributes = component.getAttributes?.() || {};

    if (tag === "input") {
      const type = String(attributes.type || "text").toLowerCase();
      if (valueTextInputTypes.has(type)) {
        const elementValue = component.getEl?.()?.value;
        if (attributes.value !== undefined || elementValue) {
          entries.push({ kind: "attribute", component, name: "value", label: "当前值" });
        }
      }
      if (attributes.placeholder !== undefined) {
        entries.push({ kind: "attribute", component, name: "placeholder", label: "占位文字" });
      }
    } else if (tag === "textarea" && attributes.placeholder !== undefined) {
      entries.push({ kind: "attribute", component, name: "placeholder", label: "占位文字" });
    }
    return entries;
  }

  function editableTextValue(entry) {
    if (entry.kind === "textnode") return textNodeValue(entry.component);
    if (entry.kind === "content") return decodeTextContent(entry.component.get?.("content") || "");
    if (entry.kind === "element-text") return entry.component.getEl?.()?.textContent || "";
    const attributes = entry.component.getAttributes?.() || {};
    if (entry.name === "value") return entry.component.getEl?.()?.value ?? attributes.value ?? "";
    return attributes[entry.name] ?? "";
  }

  function setEditableTextValue(entry, value) {
    if (entry.kind === "attribute") {
      entry.component.addAttributes?.({ [entry.name]: String(value ?? "") });
      const element = entry.component.getEl?.();
      if (entry.name === "value" && element) element.value = String(value ?? "");
      return;
    }

    const encoded = encodeTextContent(value);
    if (entry.kind === "element-text") {
      entry.component.set?.("content", encoded);
      entry.component.view?.render?.();
      return;
    }
    if (entry.kind === "content") {
      entry.component.set?.("content", encoded);
      entry.component.view?.render?.();
      return;
    }

    const raw = String(entry.component.get?.("content") || "");
    const leading = raw.match(/^\s*/)?.[0] || "";
    const trailing = raw.match(/\s*$/)?.[0] || "";
    entry.component.set?.("content", `${leading}${encoded}${trailing}`);
    entry.component.view?.render?.();
  }

  function textEntryLabel(entry, index, total, component) {
    if (entry.label) return i18n.t(entry.label);
    if (total === 1 && componentTagName(component) === "button") return i18n.t("按钮文字");
    return i18n.t(`文字 ${index + 1}`);
  }

  function renderTextTools(component) {
    const entries = editableTextEntries(component);
    ui.textTools.hidden = entries.length === 0;
    ui.textContentCount.textContent = i18n.t(`${entries.length} 处`);
    ui.textContentNote.hidden = entries.length < 2;
    ui.textContentList.replaceChildren();
    entries.forEach((entry, index) => {
      const field = document.createElement("div");
      field.className = "text-content-field";
      const id = `text-content-input-${index}`;
      const label = document.createElement("label");
      label.htmlFor = id;
      const labelName = document.createElement("span");
      labelName.textContent = textEntryLabel(entry, index, entries.length, component);
      const sourceComponent = entry.kind === "textnode" ? entry.component.parent?.() : entry.component;
      const sourceTag = componentTagName(sourceComponent || entry.component);
      const source = document.createElement("span");
      source.textContent = sourceTag ? `<${sourceTag}>` : "";
      label.append(labelName, source);

      const input = document.createElement("textarea");
      input.id = id;
      input.className = "text-content-input";
      input.rows = editableTextValue(entry).length > 70 || editableTextValue(entry).includes("\n") ? 3 : 1;
      input.value = editableTextValue(entry);
      input.dataset.textEntryIndex = String(index);
      let commitTimer = null;
      let committedValue = input.value;
      const commit = (announce = false) => {
        window.clearTimeout(commitTimer);
        commitTimer = null;
        pendingTextCommits.delete(commit);
        if (input.value === committedValue) return;
        const before = captureEditorState();
        setEditableTextValue(entry, input.value);
        committedValue = editableTextValue(entry);
        input.value = committedValue;
        const after = captureEditorState();
        if (before && after && editableStateSignature(before) !== editableStateSignature(after)) {
          pushPreviewHistory(before, after);
          updateUndoRedo();
        }
        if (announce) showToast("文字修改已应用");
      };
      input.addEventListener("keydown", (event) => {
        if (!event.isComposing && event.keyCode !== 229 && (event.ctrlKey || event.metaKey) && event.key === "Enter") input.blur();
      });
      input.addEventListener("input", () => {
        window.clearTimeout(commitTimer);
        pendingTextCommits.add(commit);
        commitTimer = window.setTimeout(() => commit(false), 180);
      });
      input.addEventListener("blur", () => commit(true));
      field.append(label, input);
      ui.textContentList.append(field);
    });
    return entries;
  }

  function flushPendingTextEdits() {
    Array.from(pendingTextCommits).forEach((commit) => commit(false));
  }

  function isTextLike(component) {
    return editableTextEntries(component).length > 0;
  }

  function closestTextBearingComponent(component) {
    let current = component;
    while (current && !current.is?.("wrapper")) {
      if (isTextLike(current)) return current;
      current = current.parent?.();
    }
    return null;
  }

  function focusTextContentEditor(component) {
    renderTextTools(component);
    window.setTimeout(() => {
      const input = ui.textContentList.querySelector(".text-content-input");
      if (!input) return;
      ui.textTools.scrollIntoView({ block: "nearest" });
      input.focus();
      input.select();
    }, 0);
  }

  function imageWidthPercent(component) {
    const match = String(component?.getStyle?.().width || "").trim().match(/^(\d+(?:\.\d+)?)%$/);
    if (match) return Math.min(100, Math.max(1, Math.round(Number(match[1]))));
    const element = component?.getEl?.();
    const parent = element?.parentElement;
    if (!element || !parent) return null;
    const parentStyle = element.ownerDocument.defaultView.getComputedStyle(parent);
    const parentWidth = parent.getBoundingClientRect().width
      - (parseFloat(parentStyle.paddingLeft) || 0)
      - (parseFloat(parentStyle.paddingRight) || 0)
      - (parseFloat(parentStyle.borderLeftWidth) || 0)
      - (parseFloat(parentStyle.borderRightWidth) || 0);
    if (!parentWidth) return null;
    return Math.min(100, Math.max(1, Math.round(element.getBoundingClientRect().width / parentWidth * 100)));
  }

  function ensureImageResizable(component) {
    if (!component || componentTagName(component) !== "img") return;
    const current = component.get?.("resizable");
    const next = current && typeof current === "object"
      ? { ...current, ...imageResizableOptions }
      : { ...imageResizableOptions };
    component.set("resizable", next, { silent: true });
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

  function colorToHex(value, fallback = "#000000") {
    const input = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(input)) return input;
    if (/^#[0-9a-f]{3}$/i.test(input)) return `#${input[1]}${input[1]}${input[2]}${input[2]}${input[3]}${input[3]}`;
    const channels = input.match(/[\d.]+/g);
    if (!channels || channels.length < 3 || (channels.length > 3 && Number(channels[3]) === 0)) return fallback;
    return `#${channels.slice(0, 3).map((channel) => Math.max(0, Math.min(255, Math.round(Number(channel)))).toString(16).padStart(2, "0")).join("")}`;
  }

  function liveComponentLabel(selection) {
    if (!selection) return "样式";
    if (selection.selectKind) return selection.selectKind === "custom" ? "自定义下拉框" : "下拉框";
    const labels = {
      h1: "一级标题", h2: "二级标题", h3: "三级标题", p: "段落", span: "文字",
      button: "按钮", label: "标签", img: "图片", canvas: "Canvas 图表", svg: "SVG 图形",
      select: "下拉框", input: "输入框", textarea: "文本框", li: "列表项", td: "表格单元格", th: "表头单元格",
      section: "分区", main: "主体", div: "容器", a: "链接",
    };
    return labels[selection.tag] || String(selection.tag || "元素").toUpperCase();
  }

  function setLayersPanelMode(live) {
    ui.layersPanel.hidden = live;
    ui.liveLayers.hidden = !live;
    ui.layersHint.textContent = i18n.t(live
      ? "点击图层可选择元素；使用上移或下移调整顺序"
      : "拖动图层可调整元素顺序");
    if (live) renderLiveLayers();
  }

  function syncLiveLayerSelection() {
    const selectedId = state.liveCompatSelection?.liveId || "";
    ui.liveLayers.querySelectorAll(".live-layer-row").forEach((row) => {
      const selected = row.dataset.liveId === selectedId;
      row.classList.toggle("is-selected", selected);
      row.setAttribute("aria-pressed", String(selected));
    });
  }

  function renderLiveLayers() {
    if (state.editingEngine !== "live") return;
    const scrollTop = ui.liveLayers.scrollTop;
    const fragment = document.createDocumentFragment();
    const layers = Array.isArray(state.liveCompatLayers) ? state.liveCompatLayers : [];
    if (!layers.length) {
      const empty = document.createElement("p");
      empty.className = "live-layer-empty";
      empty.textContent = i18n.t("正在读取脚本运行后的页面图层…");
      fragment.append(empty);
    } else {
      layers.forEach((layer) => {
        if (!layer?.liveId) return;
        const row = document.createElement("button");
        row.type = "button";
        row.className = "live-layer-row";
        row.dataset.liveId = layer.liveId;
        row.style.setProperty("--layer-indent", `${7 + Math.min(8, Math.max(0, Number(layer.depth) || 0)) * 12}px`);
        row.title = String(layer.label || layer.tag || "");
        row.setAttribute("aria-label", `${String(layer.tag || "element")} ${String(layer.label || "")}`.trim());
        row.innerHTML = '<span class="live-layer-tag"></span><span class="live-layer-label"></span>';
        row.querySelector(".live-layer-tag").textContent = String(layer.tag || "element");
        row.querySelector(".live-layer-label").textContent = String(layer.label || layer.tag || "element");
        row.addEventListener("click", () => postLiveCompat("beautylab-live-select-layer", { liveId: layer.liveId }));
        fragment.append(row);
      });
    }
    ui.liveLayers.replaceChildren(fragment);
    ui.liveLayers.scrollTop = scrollTop;
    syncLiveLayerSelection();
  }

  function renderLiveSelectionToolbar(selection) {
    const rect = scaledLiveRect(selection?.rect);
    if (!selection || !rect || state.mode === "preview") {
      ui.liveSelectionToolbar.hidden = true;
      return;
    }
    const viewportWidth = Number(rect.viewportWidth) || ui.liveCompatFrame.clientWidth;
    const viewportHeight = Number(rect.viewportHeight) || ui.liveCompatFrame.clientHeight;
    if (Number(rect.bottom) < 0 || Number(rect.top) > viewportHeight || Number(rect.right) < 0 || Number(rect.left) > viewportWidth) {
      ui.liveSelectionToolbar.hidden = true;
      return;
    }
    ui.liveSelectionToolbar.hidden = false;
    ui.liveSelectionActions.forEach((button) => {
      const action = button.dataset.liveSelectionAction;
      button.disabled = action === "move-up" ? !selection.canMoveUp : action === "move-down" ? !selection.canMoveDown : false;
    });
    window.requestAnimationFrame(() => {
      if (ui.liveSelectionToolbar.hidden || state.liveCompatSelection?.liveId !== selection.liveId) return;
      const toolbarWidth = ui.liveSelectionToolbar.offsetWidth || 116;
      const toolbarHeight = ui.liveSelectionToolbar.offsetHeight || 32;
      const wrapWidth = ui.liveCompatFrameWrap.clientWidth;
      const wrapHeight = ui.liveCompatFrameWrap.clientHeight;
      const left = Math.max(7, Math.min(wrapWidth - toolbarWidth - 7, Number(rect.right) - toolbarWidth));
      const preferredTop = Number(rect.top) - toolbarHeight - 7;
      const top = preferredTop >= 7
        ? preferredTop
        : Math.max(7, Math.min(wrapHeight - toolbarHeight - 7, Number(rect.bottom) + 7));
      ui.liveSelectionToolbar.style.left = `${left}px`;
      ui.liveSelectionToolbar.style.top = `${top}px`;
    });
  }

  function renderLiveImageResizeHandle(selection) {
    const rect = scaledLiveRect(selection?.rect);
    if (!selection?.isImage || !rect || state.mode === "preview") {
      ui.liveImageResizeHandle.hidden = true;
      return;
    }
    const viewportWidth = Number(rect.viewportWidth) || ui.liveCompatFrame.clientWidth;
    const viewportHeight = Number(rect.viewportHeight) || ui.liveCompatFrame.clientHeight;
    if (Number(rect.bottom) < 0 || Number(rect.top) > viewportHeight || Number(rect.right) < 0 || Number(rect.left) > viewportWidth) {
      ui.liveImageResizeHandle.hidden = true;
      return;
    }
    const wrapWidth = ui.liveCompatFrameWrap.clientWidth;
    const wrapHeight = ui.liveCompatFrameWrap.clientHeight;
    ui.liveImageResizeHandle.hidden = false;
    ui.liveImageResizeHandle.style.left = `${Math.max(0, Math.min(wrapWidth - 16, Number(rect.right) - 8))}px`;
    ui.liveImageResizeHandle.style.top = `${Math.max(0, Math.min(wrapHeight - 16, Number(rect.bottom) - 8))}px`;
  }

  function liveResizePercent(event) {
    if (!liveImageResize) return 100;
    const delta = (event.clientX - liveImageResize.startX) / canvasView.getScale();
    return Math.max(1, Math.min(100, liveImageResize.startPercent + delta / liveImageResize.parentWidth * 100));
  }

  function updateLiveResizePreview(percent) {
    const rounded = Math.round(percent);
    ui.liveImageWidthSlider.value = String(rounded);
    ui.liveImageWidthOutput.value = `${rounded}%`;
    ui.liveImageWidthOutput.textContent = `${rounded}%`;
    const rect = scaledLiveRect(liveImageResize?.startRect);
    if (!rect) return;
    const nextWidth = liveImageResize.parentWidth * percent / 100 * canvasView.getScale();
    const wrapWidth = ui.liveCompatFrameWrap.clientWidth;
    ui.liveImageResizeHandle.style.left = `${Math.max(0, Math.min(wrapWidth - 16, Number(rect.left) + nextWidth - 8))}px`;
  }

  function scaledLiveRect(rect) {
    if (!rect) return null;
    const scale = canvasView.getScale();
    return Object.fromEntries(Object.entries(rect).map(([key, value]) => [key, Number(value) * scale]));
  }

  function startLiveImageResize(event) {
    const selection = state.liveCompatSelection;
    if (state.editingEngine !== "live" || state.mode !== "edit" || !selection?.isImage || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const startPercent = Math.max(1, Math.min(100, Number(selection.styles?.widthPercent) || 100));
    const parentWidth = Math.max(1, Number(selection.styles?.parentContentWidth) || Number(selection.rect?.width) / (startPercent / 100));
    liveImageResize = {
      liveId: selection.liveId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startPercent,
      parentWidth,
      startRect: { ...selection.rect },
    };
    ui.liveImageResizeHandle.classList.add("is-resizing");
    // Keep pointer capture in the host while the handle moves over the iframe.
    ui.liveCompatFrame.style.pointerEvents = "none";
    try { ui.liveImageResizeHandle.setPointerCapture(event.pointerId); } catch {}
    postLiveCompat("beautylab-live-resize-image", { liveId: selection.liveId, phase: "start" });
  }

  function moveLiveImageResize(event) {
    if (!liveImageResize || event.pointerId !== liveImageResize.pointerId) return;
    event.preventDefault();
    const percent = liveResizePercent(event);
    updateLiveResizePreview(percent);
    postLiveCompat("beautylab-live-resize-image", { liveId: liveImageResize.liveId, phase: "move", widthPercent: percent });
  }

  function finishLiveImageResize(event, cancel = false) {
    if (!liveImageResize || event.pointerId !== liveImageResize.pointerId) return;
    event.preventDefault();
    const context = liveImageResize;
    const percent = liveResizePercent(event);
    liveImageResize = null;
    ui.liveCompatFrame.style.pointerEvents = "";
    ui.liveImageResizeHandle.classList.remove("is-resizing");
    try { ui.liveImageResizeHandle.releasePointerCapture(context.pointerId); } catch {}
    postLiveCompat("beautylab-live-resize-image", {
      liveId: context.liveId,
      phase: cancel ? "cancel" : "end",
      widthPercent: percent,
    });
  }

  function liveTextLabel(entry, index, total, selection) {
    if (entry.kind === "placeholder") return i18n.t("占位文字");
    if (entry.kind === "value") return i18n.t("当前值");
    if (total === 1 && selection.tag === "button") return i18n.t("按钮文字");
    return i18n.t(`文字 ${index + 1}`);
  }

  function renderLiveTextTools(selection) {
    const entries = selection?.textEntries || [];
    ui.liveTextSection.hidden = entries.length === 0;
    ui.liveTextCount.textContent = i18n.t(`${entries.length} 处`);
    ui.liveTextList.replaceChildren();
    entries.forEach((entry, index) => {
      const field = document.createElement("div");
      field.className = "text-content-field";
      const label = document.createElement("label");
      const inputId = `live-text-${index}`;
      label.htmlFor = inputId;
      const labelName = document.createElement("span");
      labelName.textContent = liveTextLabel(entry, index, entries.length, selection);
      const source = document.createElement("span");
      source.textContent = `<${entry.tag || selection.tag}>`;
      label.append(labelName, source);
      const input = document.createElement("textarea");
      input.id = inputId;
      input.className = "text-content-input";
      input.rows = String(entry.value || "").length > 70 || String(entry.value || "").includes("\n") ? 3 : 1;
      input.value = String(entry.value || "");
      let committed = input.value;
      let timer = null;
      const commit = () => {
        window.clearTimeout(timer);
        timer = null;
        if (input.value === committed) return;
        committed = input.value;
        postLiveCompat("beautylab-live-apply-text", { liveId: selection.liveId, key: entry.key, value: input.value });
      };
      input.addEventListener("input", () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(commit, 180);
      });
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (event) => {
        if (!event.isComposing && event.keyCode !== 229 && (event.ctrlKey || event.metaKey) && event.key === "Enter") input.blur();
      });
      field.append(label, input);
      ui.liveTextList.append(field);
    });
  }

  function renderLiveSelectTools(selection) {
    const options = selection?.selectOptions || [];
    const kind = selection?.selectKind || "";
    const custom = kind === "custom";
    ui.liveSelectSection.hidden = !kind;
    ui.liveSelectTitle.textContent = i18n.t(custom ? "自定义下拉选项" : "下拉选项");
    ui.liveSelectDescription.textContent = i18n.t(custom ? "同步修改显示文字与实际值" : "增加、删除或修改每个选项");
    ui.liveSelectCount.textContent = i18n.t(`${options.length} 项`);
    ui.liveSelectEmpty.textContent = i18n.t(custom ? "当前自定义下拉框没有静态选项" : "当前下拉框没有选项");
    ui.liveSelectEmpty.hidden = options.length > 0;
    ui.liveSelectList.hidden = options.length === 0;
    ui.liveSelectRuntimeNote.hidden = !custom;
    ui.liveRemoveOptionButton.disabled = options.length === 0;
    ui.liveSelectList.replaceChildren();
    options.forEach((option) => {
      const row = document.createElement("div");
      row.className = "select-option-row";
      row.dataset.optionIndex = String(option.index);
      const main = document.createElement("div");
      main.className = "select-option-main";
      const number = document.createElement("span");
      number.className = "select-option-index";
      number.textContent = String(option.index + 1).padStart(2, "0");
      const labelField = document.createElement("label");
      labelField.className = "select-option-field select-option-label-field";
      const labelCaption = document.createElement("span");
      labelCaption.textContent = i18n.t("显示文字");
      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.value = option.label;
      labelInput.setAttribute("aria-label", `${i18n.t("显示文字")} ${option.index + 1}`);
      labelField.append(labelCaption, labelInput);
      main.append(number, labelField);
      const valueField = document.createElement("label");
      valueField.className = "select-option-field select-option-value-field";
      const valueCaption = document.createElement("span");
      valueCaption.textContent = i18n.t("值");
      const valueInput = document.createElement("input");
      valueInput.type = "text";
      valueInput.value = option.value;
      valueInput.setAttribute("aria-label", `${i18n.t("值")} ${option.index + 1}`);
      valueField.append(valueCaption, valueInput);
      const actions = document.createElement("div");
      actions.className = "select-option-actions";
      const defaultButton = document.createElement("button");
      defaultButton.type = "button";
      defaultButton.className = `mini-icon-button default-option-button${option.selected ? " active" : ""}`;
      const defaultTitle = custom
        ? option.selected ? "取消默认勾选" : option.inputType === "radio" ? "设为默认项" : "设为默认勾选"
        : option.selected ? "取消默认项" : "设为默认项";
      defaultButton.title = i18n.t(defaultTitle);
      defaultButton.setAttribute("aria-label", `${defaultButton.title} ${option.index + 1}`);
      defaultButton.setAttribute("aria-pressed", String(option.selected));
      const defaultIcon = custom
        ? option.inputType === "radio" ? "circle-dot" : "square-check-big"
        : "circle-check";
      defaultButton.innerHTML = `<i data-lucide="${defaultIcon}"></i>`;
      const divider = document.createElement("span");
      divider.className = "option-action-divider";
      divider.setAttribute("aria-hidden", "true");
      const actionButton = (action, icon, title, disabled = false, danger = false) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `mini-icon-button${danger ? " danger-on-hover" : ""}`;
        button.title = i18n.t(title);
        button.setAttribute("aria-label", `${button.title} ${option.index + 1}`);
        button.disabled = disabled;
        button.innerHTML = `<i data-lucide="${icon}"></i>`;
        button.addEventListener("click", () => postLiveCompat("beautylab-live-select-action", { liveId: selection.liveId, action, index: option.index }));
        return button;
      };
      const commitInput = (input, action) => {
        input.addEventListener("change", () => postLiveCompat("beautylab-live-select-action", { liveId: selection.liveId, action, index: option.index, value: input.value }));
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") input.blur();
        });
      };
      commitInput(labelInput, "label");
      commitInput(valueInput, "value");
      defaultButton.addEventListener("click", () => postLiveCompat("beautylab-live-select-action", { liveId: selection.liveId, action: "selected", index: option.index }));
      actions.append(
        defaultButton,
        divider,
        actionButton("up", "arrow-up", "上移选项", option.index === 0),
        actionButton("down", "arrow-down", "下移选项", option.index === options.length - 1),
        actionButton("duplicate", "copy", "复制选项"),
        actionButton("remove", "trash-2", "删除选项", false, true),
      );
      row.append(main, valueField, actions);
      ui.liveSelectList.append(row);
    });
    refreshIcons(ui.liveSelectSection);
  }

  function updateLiveStyleFields(selection) {
    const styles = selection?.styles || {};
    const values = { ...(styles.values || {}) };
    values.color = colorToHex(values.color || styles.color);
    values["background-color"] = colorToHex(values["background-color"] || styles.backgroundColor, "#ffffff");
    values["border-color"] = colorToHex(values["border-color"] || styles.borderColor, "#000000");
    ui.liveStyleFields.forEach((field) => {
      const value = values[field.dataset.liveStyle];
      if (field.matches("select") && value != null && !Array.from(field.options).some((option) => option.value === String(value))) {
        field.querySelector("option[data-live-current]")?.remove();
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = String(value);
        option.dataset.liveCurrent = "";
        field.prepend(option);
      }
      if (value !== undefined && value !== null) field.value = String(value);
      field.disabled = !selection;
    });
    ui.liveColorValues.forEach((output) => {
      const value = values[output.dataset.liveColorValue];
      if (value) output.textContent = String(value).toUpperCase();
    });
    ui.liveStyleButtons.forEach((button) => {
      const active = String(values[button.dataset.liveStyleButton] || "") === button.dataset.liveStyleValue;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      button.disabled = !selection;
    });
  }

  function renderLiveSelectionUI() {
    const selection = state.liveCompatSelection;
    const hasSelection = Boolean(selection);
    ui.noSelection.hidden = hasSelection;
    ui.rightSidebar.classList.toggle("no-active-selection", !hasSelection);
    ui.liveCompatTools.hidden = !hasSelection;
    ui.selectedComponentName.textContent = liveComponentLabel(selection);
    ui.selectionPath.textContent = hasSelection ? selection.path : "点击元素开始编辑";
    ui.liveSelectionTag.textContent = hasSelection ? `<${selection.tag}>` : "--";
    ui.duplicateButton.disabled = !hasSelection;
    ui.deleteButton.disabled = !hasSelection;
    ui.moveUpButton.disabled = !hasSelection || !selection?.canMoveUp;
    ui.moveDownButton.disabled = !hasSelection || !selection?.canMoveDown;
    const textSelected = Boolean(selection?.textEntries?.length);
    ui.boldButton.disabled = !textSelected;
    ui.alignButtons.forEach((button) => (button.disabled = !textSelected));
    renderLiveTextTools(selection);
    renderLiveSelectTools(selection);
    ui.liveImageSection.hidden = !selection?.isImage;
    ui.liveCanvasSection.hidden = !selection?.isCanvas;
    if (selection?.isImage) {
      const width = Math.max(1, Math.min(100, Number(selection.styles?.widthPercent) || 100));
      ui.liveImageWidthSlider.value = String(Math.round(width));
      ui.liveImageWidthOutput.value = `${Math.round(width)}%`;
      ui.liveImageWidthOutput.textContent = `${Math.round(width)}%`;
      ui.liveImageWidthPresets.forEach((button) => {
        const active = Number(button.dataset.liveImageWidth) === Math.round(width);
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }
    updateLiveStyleFields(selection);
    syncLiveLayerSelection();
    renderLiveSelectionToolbar(selection);
    renderLiveImageResizeHandle(selection);
    objectController?.refresh();
  }

  function updateSelectionUI() {
    if (state.editingEngine === "live") {
      renderLiveSelectionUI();
      return;
    }
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
    if (tag === "img") ensureImageResizable(selected);
    renderTextTools(selected);
    selectOptionsController?.update(selected);
    ui.imageTools.hidden = tag !== "img";
    if (tag === "img") updateImageControls(selected);
    ui.canvasTools.hidden = tag !== "canvas";
    objectController?.refresh();
  }

  function updateWarnings() {
    const warnings = [...(state.document?.warnings || [])];
    if (!ui.continueExportButton.hidden && state.editingEngine === "live" && state.exportMode === "static") {
      const incomplete = state.liveCompatSnapshot?.staticWarnings || [];
      warnings.push({
        level: incomplete.length ? "warning" : "info", icon: incomplete.length ? "triangle-alert" : "image",
        title: incomplete.length ? "静态导出有未能保留的内容" : "静态画面",
        detail: incomplete.length ? incomplete.map((detail) => {
          const canvas = /^Canvas (\d+):/.exec(detail);
          const embedded = /^(\d+) embedded/.exec(detail);
          return canvas ? `Canvas ${canvas[1]} 无法转为图片` : embedded ? `${embedded[1]} 个嵌入页面或对象无法转为图片` : detail;
        }).map((detail) => i18n.t(detail)).join("; ") : "脚本与按钮交互将停用；Canvas 将转为图片，嵌入页面无法转换。",
      });
    }
    ui.warningCount.textContent = String(warnings.length);
    const risky = warnings.filter((warning) => warning.level === "warning").length;
    ui.warningSummary.textContent = risky ? `${risky} 项需要检查` : "兼容性良好";
    if (state.mode !== "preview") ui.previewStatusText.textContent = risky ? `预览前请留意 ${risky} 项兼容性提示` : "未发现明显兼容性风险";
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

  function refreshCanvasStyles() {
    FrameEditIO.injectCanvasStyles(editor.Canvas.getDocument(), state.document);
    if (state.document.runtimeCss && !state.document.runtimeStylesheets) injectRawCanvasCss(state.document.runtimeCss);
  }

  async function loadDocument(html, fileName = "粘贴的页面.html", fileHandle = null, { editableFileName = false, draftId, viewSettings } = {}) {
    if (state.document && !state.loading && !draftId) {
      const saved = await draftController.flush();
      if (!saved.ok) throw saved.error || new Error("当前草稿未保存，未切换文件。");
    }
    const recovered = BeautyLabRuntimeEdits.extract(html);
    if (recovered) html = recovered.baseHtml;
    const sourceView = new DOMParser().parseFromString(html, "text/html").querySelector('meta[name="beautylab-view"]');
    if (!viewSettings && !recovered?.settings && sourceView) {
      try { viewSettings = JSON.parse(sourceView.content); } catch {}
    }
    let parsed;
    try {
      parsed = FrameEditIO.parseHtml(html, fileName);
    } catch (error) {
      throw new Error(error.message || "HTML 解析失败。");
    }
    state.documentEpoch += 1;
    const loadEpoch = state.documentEpoch;
    state.revision = 0;
    if (state.editingEngine === "live") destroyLiveCompatShell();
    await ensureEditorReady();
    if (loadEpoch !== state.documentEpoch) return;

    const autoOnlineCompatibility = parsed.scripts.length > 0 || parsed.counts.inlineHandlers > 0 || parsed.counts.javascriptLinks > 0 || Boolean(recovered?.edits?.transactions?.length);
    if (autoOnlineCompatibility) {
      parsed = {
        ...parsed,
        warnings: [
          ...parsed.warnings,
          {
            level: "info",
            icon: "wifi",
            title: "已自动启用联网兼容画布",
            detail: parsed.counts.externalResources
              ? "页面将联网加载外部资源，并从原始 DOM 持续运行脚本和动效。"
              : "页面将从原始 DOM 持续运行脚本和动效，普通文字和样式可直接修改。",
          },
        ],
      };
    }

    state.loading = true;
    editor.UndoManager.stop();
    editor.select(null);
    editor.setComponents(parsed.bodyHtml);
    editor.setStyle(parsed.css);
    applyBodyAttributes(parsed.bodyAttributes);
    FrameEditIO.injectCanvasStyles(editor.Canvas.getDocument(), parsed);
    state.document = parsed;
    state.document.runtimeCss = "";
    state.document.runtimeRestore = null;
    state.document.runtimeStylesheets = null;
    state.recoveredEdits = recovered?.edits || null;
    state.liveSourceHtml = null;
    state.modifiedSelectIds.clear();
    state.previewHistory = [];
    state.previewHistoryIndex = -1;
    state.previewEntrySnapshot = null;
    state.previewInteracted = false;
    state.previewReady = false;
    state.editingEngine = "standard";
    state.hasAuthorEdits = false;
    state.liveCompatSnapshot = null;
    state.liveCompatSelection = null;
    state.liveCompatInteracted = false;
    state.liveCompatHistory = { canUndo: false, canRedo: false };
    state.liveCompatResources = null;
    state.liveCompatLayers = [];
    state.mode = "edit";
    ui.appShell.classList.remove("preview-mode", "live-compat-mode", "live-compat-preview");
    ui.interactivePreview.hidden = true;
    ui.liveCompatStage.hidden = true;
    ui.liveCompatFrame.srcdoc = "";
    ui.liveSelectionToolbar.hidden = true;
    ui.liveImageResizeHandle.hidden = true;
    setLayersPanelMode(false);
    ui.previewFrame.srcdoc = "";
    ui.editModeButton.classList.add("active");
    ui.previewModeButton.classList.remove("active");
    ui.editModeButton.setAttribute("aria-pressed", "true");
    ui.previewModeButton.setAttribute("aria-pressed", "false");
    state.fileHandle = fileHandle;
    state.documentNameEditable = editableFileName;
    ui.documentName.textContent = parsed.fileName;
    setDocumentAvailability(true);
    setLayersCollapsed(true);
    canvasView.reset();
    canvasView.restoreSettings(viewSettings || recovered?.settings);
    draftController.setDocument({ id: draftId, name: parsed.fileName });
    updateLiveCompatMenu();
    updateWarnings();
    editor.UndoManager.clear();
    updateUndoRedo();
    updateSelectionUI();
    await new Promise((resolve, reject) => window.setTimeout(async () => {
      if (loadEpoch !== state.documentEpoch || state.document !== parsed) { resolve(); return; }
      try {
      editor.UndoManager.clear();
      editor.UndoManager.start();
      editor.clearDirtyCount?.();
      updateUndoRedo();
      state.loading = false;
      setDirty(false);
      installCanvasSafety();
      editor.refresh();
      if (autoOnlineCompatibility && state.document === parsed && state.editingEngine === "standard") {
        await enableLiveCompat({ automatic: true });
      }
      draftController.schedule();
      resolve();
      } catch (error) { reject(error); }
    }, 500));
    if (loadEpoch === state.documentEpoch) showToast(`已载入 ${parsed.fileName}`);
  }

  function buildOutput({ mode = state.exportMode } = {}) {
    flushPendingTextEdits();
    if (!state.document) throw new Error("请先打开或粘贴 HTML。");
    if (state.editingEngine === "live") {
      const snapshot = state.liveCompatSnapshot;
      if (!snapshot?.bodyHtml) throw new Error("实时页面尚未完成同步，请稍后重试。");
      if (mode !== "static") {
        if (!state.liveSourceHtml || !snapshot.authorEdits) throw new Error("编辑记录尚未同步，请稍后重试。");
        if (snapshot.authorEdits.pendingReplay) throw new Error("页面仍在恢复动态内容，请等待载入完成。");
        return BeautyLabRuntimeEdits.exportHtml(state.liveSourceHtml, snapshot.authorEdits, canvasView.getSettings());
      }
      return outputWithView(FrameEditIO.createStaticOutputDocument(state.document, snapshot));
    }
    if (!state.hasAuthorEdits) {
      const authorOutput = FrameEditIO.createAuthorOutputDocument(state.document);
      if (authorOutput) return outputWithView(authorOutput);
    }
    const editedCss = editor.getCss({ avoidProtected: true });
    const editedHtml = editor.getHtml();
    const bodyAttributes = { ...editor.DomComponents.getWrapper().getAttributes() };
    const parser = new DOMParser();
    const editedDocument = parser.parseFromString(`<!doctype html><html><body>${editedHtml}</body></html>`, "text/html");
    const selectOverrides = Array.from(state.modifiedSelectIds).flatMap((id) => {
      const select = Array.from(editedDocument.querySelectorAll("select")).find(
        (candidate) => candidate.classList.contains(`${FrameEditIO.selectIdClassPrefix}${id}`),
      );
      return select ? [{ id, html: select.innerHTML, value: select.value }] : [];
    });
    const runtimeRestore = state.document.runtimeRestore
      ? FrameEditIO.createRuntimeRestoreState(editedHtml, bodyAttributes, state.document.runtimeRestore.interaction)
      : null;
    return outputWithView(FrameEditIO.createOutputDocument(
      { ...state.document, bodyAttributes },
      editedHtml,
      [
        state.document.css,
        state.document.runtimeCss && `/* Captured runtime styles */\n${state.document.runtimeCss}`,
        `/* Edward's HTML Beauty Lab visual overrides */\n${editedCss}`,
      ].filter(Boolean).join("\n\n"),
      { selectOverrides, runtimeRestore },
    ));
  }

  function outputWithView(html) {
    const node = new DOMParser().parseFromString(html, "text/html");
    node.querySelector('meta[name="beautylab-view"]')?.remove();
    const meta = node.createElement("meta");
    meta.name = "beautylab-view";
    meta.content = JSON.stringify(canvasView.getSettings());
    node.head.append(meta);
    return `${state.document.originalDoctype || "<!doctype html>"}\n${node.documentElement.outerHTML}`;
  }

  function outputFileName() {
    const original = state.document?.fileName || "未命名页面.html";
    return original.replace(/\.html?$/i, "") + "-已编辑.html";
  }

  async function downloadOutput() {
    const epoch = state.documentEpoch;
    if (!await ensurePreviewSyncedForAction()) return;
    if (epoch !== state.documentEpoch) return;
    let html;
    try {
      html = buildOutput();
    } catch (error) {
      showToast(error.message, "error");
      return;
    }
    const revision = state.revision;
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
    if (revision === state.revision) setDirty(false);
    showToast(`已生成 ${outputFileName()}`);
  }

  function newPreviewToken() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
  }

  function setPreviewStatus(message, { dirty = false, error = false } = {}) {
    ui.previewStatusText.textContent = message;
    ui.interactivePreview.classList.toggle("is-dirty", dirty);
    ui.interactivePreview.classList.toggle("has-sync-error", error);
  }

  function setModeUi(mode) {
    const preview = mode === "preview";
    state.mode = mode;
    ui.appShell.classList.toggle("preview-mode", preview);
    ui.interactivePreview.hidden = !preview;
    ui.editModeButton.classList.toggle("active", !preview);
    ui.previewModeButton.classList.toggle("active", preview);
    ui.editModeButton.setAttribute("aria-pressed", String(!preview));
    ui.previewModeButton.setAttribute("aria-pressed", String(preview));
    canvasView.refresh();
    if (!preview) window.setTimeout(() => editor?.refresh(), 0);
  }

  function resetPreviewSyncFailure() {
    ui.retryPreviewSyncButton.hidden = true;
    ui.discardPreviewButton.hidden = true;
    ui.modeSwitch.classList.remove("syncing");
    ui.editModeButton.disabled = !state.document;
    ui.previewModeButton.disabled = !state.document;
  }

  function loadInteractivePreview() {
    try {
      const output = buildOutput();
      state.previewToken = newPreviewToken();
      state.previewInteracted = false;
      state.previewReady = false;
      resetPreviewSyncFailure();
      setPreviewStatus("正在载入交互预览…");
      ui.previewFrame.srcdoc = FrameEditIO.createInteractivePreviewDocument(output, state.previewToken, {
        scriptIds: state.document.scripts.map((entry) => entry.id),
      });
      return true;
    } catch (error) {
      showToast(error.message, "error");
      return false;
    }
  }

  function enterPreviewMode() {
    if (!state.document || state.mode === "preview" || state.previewSyncing) return;
    state.previewEntrySnapshot = captureEditorState();
    setModeUi("preview");
    ui.documentState.textContent = "预览模式";
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (state.mode !== "preview") return;
        if (!loadInteractivePreview()) {
          setModeUi("edit");
          state.previewEntrySnapshot = null;
        }
      });
    });
  }

  function validPreviewMessage(event) {
    const allowedOrigin = event.origin === "null" || event.origin === window.location.origin;
    return allowedOrigin && event.source === ui.previewFrame.contentWindow && event.data?.token === state.previewToken;
  }

  function requestFrameCapture(frame, token, timeoutMessage = "同步超过 4 秒，请重试。") {
    return new Promise((resolve, reject) => {
      if (!token || !frame?.contentWindow) {
        reject(new Error("交互页面尚未准备好。"));
        return;
      }
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let settled = false;
      const finish = (error, result) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        window.removeEventListener("message", receive);
        if (error) reject(error);
        else resolve(result);
      };
      const receive = (event) => {
        const message = event.data || {};
        const allowedOrigin = event.origin === "null" || event.origin === window.location.origin;
        if (!allowedOrigin || event.source !== frame.contentWindow || message.token !== token || message.type !== "beautylab-preview-capture-result" || message.requestId !== requestId) return;
        if (message.error) {
          finish(new Error(String(message.error)));
          return;
        }
        finish(null, {
          body: String(message.body || ""),
          css: String(message.css || ""),
          stylesheets: Array.isArray(message.stylesheets) ? message.stylesheets : null,
          authorEdits: message.authorEdits && typeof message.authorEdits === "object" ? message.authorEdits : null,
          staticBody: typeof message.staticBody === "string" ? message.staticBody : null,
          staticWarnings: Array.isArray(message.staticWarnings) ? message.staticWarnings : [],
          bodyAttributes: message.bodyAttributes && typeof message.bodyAttributes === "object" ? message.bodyAttributes : {},
          runtimeState: message.runtimeState && typeof message.runtimeState === "object" ? message.runtimeState : null,
          interaction: message.interaction && typeof message.interaction === "object" ? message.interaction : null,
        });
      };
      const timer = window.setTimeout(() => finish(new Error(timeoutMessage)), 4000);
      window.addEventListener("message", receive);
      frame.contentWindow.postMessage({
        type: "beautylab-preview-capture-request",
        token,
        requestId,
      }, "*");
    });
  }

  function requestPreviewCapture() {
    if (state.mode !== "preview") return Promise.reject(new Error("交互预览尚未准备好。"));
    return requestFrameCapture(ui.previewFrame, state.previewToken);
  }

  function validLiveCompatMessage(event) {
    const allowedOrigin = event.origin === "null" || event.origin === window.location.origin;
    return allowedOrigin && event.source === ui.liveCompatFrame.contentWindow && event.data?.token === state.liveCompatToken;
  }

  function postLiveCompat(type, payload = {}) {
    if (state.editingEngine !== "live" || !state.liveCompatToken || !ui.liveCompatFrame.contentWindow) return;
    ui.liveCompatFrame.contentWindow.postMessage({ type, token: state.liveCompatToken, ...payload }, "*");
  }

  function updateLiveCompatRuntimeStatus() {
    const resources = state.liveCompatResources;
    if (resources?.failed) {
      ui.liveCompatStatusText.textContent = `${resources.failed} ${i18n.t("个网络资源加载失败，请检查网络后重新开启兼容模式")}`;
      return;
    }
    if (resources?.total && resources.pending > 0) {
      ui.liveCompatStatusText.textContent = `${i18n.t("正在联网加载外部资源")} ${resources.loaded}/${resources.total}…`;
      return;
    }
    ui.liveCompatStatusText.textContent = state.mode === "preview"
      ? "脚本持续运行，可操作页面中的按钮和筛选器"
      : i18n.t("单击选择，双击文字直接修改；按住 Ctrl/Cmd 点击可运行页面按钮");
  }

  function setLiveCompatMode(mode) {
    if (state.editingEngine !== "live") return;
    const preview = mode === "preview";
    state.mode = preview ? "preview" : "edit";
    ui.appShell.classList.toggle("live-compat-preview", preview);
    ui.editModeButton.classList.toggle("active", !preview);
    ui.previewModeButton.classList.toggle("active", preview);
    ui.editModeButton.setAttribute("aria-pressed", String(!preview));
    ui.previewModeButton.setAttribute("aria-pressed", String(preview));
    postLiveCompat("beautylab-live-set-mode", { mode: state.mode });
    canvasView.refresh();
    if (preview) {
      ui.liveSelectionToolbar.hidden = true;
      ui.liveImageResizeHandle.hidden = true;
      ui.documentState.textContent = "实时预览模式";
      updateLiveCompatRuntimeStatus();
    } else {
      ui.documentState.textContent = state.dirty ? "有未保存修改" : "实时兼容模式";
      updateLiveCompatRuntimeStatus();
      renderLiveSelectionUI();
      window.setTimeout(() => postLiveCompat("beautylab-live-request-selection"), 0);
    }
  }

  async function captureLiveCompatSnapshot({ quiet = false } = {}) {
    if (state.editingEngine !== "live") return null;
    const epoch = state.documentEpoch;
    const token = state.liveCompatToken;
    if (!quiet) {
      ui.documentState.textContent = "正在同步实时页面…";
      ui.liveCompatStatusText.textContent = "正在读取当前运行时 DOM…";
    }
    const result = await requestFrameCapture(ui.liveCompatFrame, state.liveCompatToken, "实时页面同步超过 4 秒，请重试。");
    if (epoch !== state.documentEpoch || token !== state.liveCompatToken) throw new Error("文件已切换，请重试当前操作。");
    if (!result.body.trim()) throw new Error("实时页面没有返回可编辑内容。");
    const merged = FrameEditIO.mergeRuntimeSnapshot(state.document, result);
    if (!merged.snapshotApplied) throw new Error("无法读取当前实时页面。");
    state.liveCompatSnapshot = {
      ...merged,
      authorEdits: result.authorEdits || null,
      staticBody: result.staticBody || null,
      staticWarnings: result.staticWarnings || [],
      interaction: result.interaction || merged.runtimeState?.interaction || null,
      runtimeState: merged.runtimeState ? { ...merged.runtimeState, interaction: result.interaction || merged.runtimeState.interaction || null } : null,
    };
    if (!quiet) {
      ui.documentState.textContent = state.dirty ? "有未保存修改" : state.mode === "preview" ? "实时预览模式" : "实时兼容模式";
      ui.liveCompatStatusText.textContent = state.mode === "preview"
        ? "脚本持续运行，可操作页面中的按钮和筛选器"
        : "当前实时页面已同步，可继续修改";
    }
    return state.liveCompatSnapshot;
  }

  async function ensureLiveCompatCapturedForAction() {
    if (state.editingEngine !== "live") return true;
    try {
      await captureLiveCompatSnapshot();
      return true;
    } catch (error) {
      showToast(error.message || "实时页面同步失败。", "error");
      ui.documentState.textContent = "实时页面同步失败";
      ui.liveCompatStatusText.textContent = "同步失败，请稍后重试或关闭实时兼容模式";
      return false;
    }
  }

  function destroyLiveCompatShell() {
    ui.liveCompatFrame.srcdoc = "";
    ui.liveCompatStage.hidden = true;
    ui.appShell.classList.remove("live-compat-mode", "live-compat-preview");
    state.editingEngine = "standard";
    state.liveCompatToken = "";
    state.liveCompatReady = false;
    state.liveCompatSelection = null;
    state.liveCompatSnapshot = null;
    state.liveCompatEntrySnapshot = null;
    state.liveCompatInteracted = false;
    state.liveCompatHistory = { canUndo: false, canRedo: false };
    state.liveCompatResources = null;
    state.liveCompatLayers = [];
    state.mode = "edit";
    ui.liveCompatTools.hidden = true;
    ui.liveSelectionToolbar.hidden = true;
    ui.liveImageResizeHandle.hidden = true;
    setLayersPanelMode(false);
    ui.liveTextList.replaceChildren();
    ui.liveSelectList.replaceChildren();
    ui.editModeButton.classList.add("active");
    ui.previewModeButton.classList.remove("active");
    ui.editModeButton.setAttribute("aria-pressed", "true");
    ui.previewModeButton.setAttribute("aria-pressed", "false");
    ui.toggleLayersButton.disabled = !state.document;
    updateLiveCompatMenu();
    canvasView.refresh();
  }

  async function enableLiveCompat({ automatic = false } = {}) {
    if (!state.document || state.editingEngine === "live") return false;
    if (state.mode === "preview" && !await syncPreviewToEditor()) return false;
    flushPendingTextEdits();
    let output;
    try {
      output = buildOutput();
    } catch (error) {
      showToast(error.message || "无法准备实时页面。", "error");
      return false;
    }

    state.liveSourceHtml = output;
    output = BeautyLabRuntimeEdits.prepareHtml(output, state.recoveredEdits || {});
    state.recoveredEdits = null;
    state.liveCompatEntrySnapshot = captureEditorState();
    state.liveCompatToken = newPreviewToken();
    state.liveCompatReady = false;
    state.liveCompatSelection = null;
    state.liveCompatSnapshot = null;
    state.liveCompatInteracted = false;
    state.liveCompatHistory = { canUndo: false, canRedo: false };
    state.liveCompatResources = null;
    state.liveCompatLayers = [];
    state.editingEngine = "live";
    state.mode = "edit";
    ui.appShell.classList.remove("preview-mode");
    ui.appShell.classList.add("live-compat-mode");
    ui.appShell.classList.remove("live-compat-preview");
    ui.interactivePreview.hidden = true;
    ui.previewFrame.srcdoc = "";
    ui.liveCompatStage.hidden = false;
    canvasView.refresh();
    ui.toggleLayersButton.disabled = false;
    setLayersPanelMode(true);
    ui.liveCompatStatusText.textContent = state.document.counts.externalResources
      ? "正在联网加载外部资源…"
      : "正在准备联网脚本页面…";
    ui.documentState.textContent = "正在进入实时兼容模式…";
    const epoch = state.documentEpoch;
    const token = state.liveCompatToken;
    await new Promise((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
    });
    if (state.editingEngine !== "live" || epoch !== state.documentEpoch || token !== state.liveCompatToken) return false;
    ui.liveCompatFrame.srcdoc = BeautyLabLiveCompat.createDocument(output, state.liveCompatToken, {
      scriptIds: state.document.scripts.map((entry) => entry.id),
    });
    updateLiveCompatMenu();
    updateUndoRedo();
    renderLiveSelectionUI();
    showToast(automatic
      ? "已自动进入联网兼容模式，脚本和动效将持续运行"
      : "已进入实时兼容模式，脚本将在隔离画布中持续运行");
    return true;
  }

  async function disableLiveCompat() {
    if (state.editingEngine !== "live") return true;
    let merged;
    try {
      merged = await captureLiveCompatSnapshot();
    } catch (error) {
      showToast(error.message || "实时页面同步失败，仍保留在当前模式。", "error");
      return false;
    }

    const saved = await draftController.flush();
    if (!saved.ok) return false;
    const output = FrameEditIO.createStaticOutputDocument(state.document, merged);
    const name = state.document.fileName.replace(/\.html?$/i, "-静态.html");
    await loadDocument(output, name, null, { editableFileName: true, viewSettings: canvasView.getSettings() });
    setDirty(true);
    showToast("已创建静态副本，交互版本保留在草稿中");
    return true;
  }

  async function toggleLiveCompat() {
    setMoreMenuOpen(false);
    if (!state.document) {
      showToast("请先打开或粘贴 HTML。", "warning");
      return;
    }
    ui.liveCompatButton.disabled = true;
    try {
      if (state.editingEngine === "live") withDirtyConfirmation(disableLiveCompat, "创建静态副本？", "副本保留当前画面，脚本和按钮交互将停用。原交互版本保留在本地草稿中。", true);
      else await enableLiveCompat();
    } finally {
      ui.liveCompatButton.disabled = !state.document;
      updateLiveCompatMenu();
    }
  }

  function closeInteractivePreview() {
    setModeUi("edit");
    ui.previewFrame.srcdoc = "";
    state.previewToken = "";
    state.previewReady = false;
    state.previewInteracted = false;
    state.previewEntrySnapshot = null;
    resetPreviewSyncFailure();
    setDirty(state.dirty);
  }

  function pushPreviewHistory(before, after) {
    const entry = {
      before,
      after,
      beforeSignature: editableStateSignature(before),
      afterSignature: editableStateSignature(after),
      nativePointer: editor.UndoManager.getPointer(),
    };
    state.previewHistory.splice(state.previewHistoryIndex + 1);
    state.previewHistory.push(entry);
    state.previewHistoryIndex = state.previewHistory.length - 1;
  }

  async function syncPreviewToEditor() {
    if (state.mode !== "preview") return true;
    if (!state.previewInteracted) { closeInteractivePreview(); return true; }
    if (state.previewSyncing) return false;
    state.previewSyncing = true;
    ui.modeSwitch.classList.add("syncing");
    ui.editModeButton.disabled = true;
    ui.previewModeButton.disabled = true;
    ui.refreshPreviewButton.disabled = true;
    ui.retryPreviewSyncButton.hidden = true;
    ui.discardPreviewButton.hidden = true;
    setPreviewStatus("正在同步当前预览状态…", { dirty: state.previewInteracted });
    ui.documentState.textContent = "正在同步预览…";

    const before = state.previewEntrySnapshot || captureEditorState();
    try {
      const result = await requestPreviewCapture();
      if (!result.body.trim()) throw new Error("预览没有返回可编辑页面内容。");
      const merged = FrameEditIO.mergeRuntimeSnapshot(state.document, result);
      if (!merged.snapshotApplied) throw new Error("无法把当前预览转换为可编辑页面。");
      const capturedRuntimeCss = String(merged.css || "").trim();
      const nextRuntimeCss = !merged.stylesheets && capturedRuntimeCss && !state.document.css.includes(capturedRuntimeCss)
        ? capturedRuntimeCss
        : before.runtimeCss;

      state.loading = true;
      editor.UndoManager.skip(() => {
        editor.select(null);
        editor.setComponents(merged.bodyHtml);
        editor.setStyle(before.css);
        applyBodyAttributes(merged.bodyAttributes);
      });
      state.document = {
        ...state.document,
        bodyAttributes: { ...merged.bodyAttributes },
        runtimeCss: nextRuntimeCss || "",
        runtimeStylesheets: merged.stylesheets || before.runtimeStylesheets,
        runtimeRestore: merged.runtimeState ? { ...merged.runtimeState, interaction: result.interaction || merged.runtimeState.interaction || null } : null,
      };
      refreshCanvasStyles();
      const afterBeforeDirty = captureEditorState();
      const changed = JSON.stringify({
        html: before.html,
        css: before.css,
        bodyAttributes: before.bodyAttributes,
        runtimeCss: before.runtimeCss,
      }) !== JSON.stringify({
        html: afterBeforeDirty.html,
        css: afterBeforeDirty.css,
        bodyAttributes: afterBeforeDirty.bodyAttributes,
        runtimeCss: afterBeforeDirty.runtimeCss,
      });

      if (changed) {
        state.hasAuthorEdits = true;
        setDirty(true);
        const after = captureEditorState();
        pushPreviewHistory(before, after);
        showToast("预览状态已同步，可继续修改当前页面");
      } else {
        state.document.runtimeRestore = before.runtimeRestore;
        state.document.runtimeCss = before.runtimeCss;
        setDirty(before.dirty);
        showToast("预览状态未发生变化");
      }
      editor.clearDirtyCount?.();
      updateSelectionUI();
      updateUndoRedo();
      closeInteractivePreview();
      installCanvasSafety();
      window.setTimeout(() => {
        editor.clearDirtyCount?.();
        state.loading = false;
        setDirty(changed ? true : before.dirty);
        installCanvasSafety();
        updateUndoRedo();
      }, 400);
      return true;
    } catch (error) {
      if (before) applyEditorState(before);
      state.previewSyncing = false;
      ui.modeSwitch.classList.remove("syncing");
      ui.previewModeButton.disabled = false;
      ui.editModeButton.disabled = false;
      ui.refreshPreviewButton.disabled = false;
      ui.retryPreviewSyncButton.hidden = false;
      ui.discardPreviewButton.hidden = false;
      setPreviewStatus(error.message || "预览同步失败，请重试。", { dirty: state.previewInteracted, error: true });
      ui.documentState.textContent = "预览同步失败";
      showToast(error.message || "预览同步失败。", "error");
      return false;
    } finally {
      if (state.mode !== "preview") {
        state.previewSyncing = false;
        ui.refreshPreviewButton.disabled = false;
      }
    }
  }

  function discardPreviewChanges() {
    if (state.previewSyncing) return;
    closeInteractivePreview();
    showToast("已放弃本轮预览变化", "warning");
  }

  function reloadInteractivePreview() {
    ui.documentState.textContent = "预览模式";
    ui.previewFrame.srcdoc = "";
    window.requestAnimationFrame(() => {
      if (state.mode === "preview") loadInteractivePreview();
    });
  }

  function refreshPreview() {
    if (!state.previewInteracted) {
      reloadInteractivePreview();
      return;
    }
    withDirtyConfirmation(
      reloadInteractivePreview,
      "重新载入预览？",
      "本轮尚未同步的点击、输入和选择变化将被放弃。",
      true,
    );
  }

  async function ensurePreviewSyncedForAction() {
    if (state.editingEngine === "live") return ensureLiveCompatCapturedForAction();
    return state.mode === "preview" ? syncPreviewToEditor() : true;
  }

  async function openWarnings(forExport = false) {
    if (forExport && state.editingEngine === "live" && !await ensureLiveCompatCapturedForAction()) return;
    ui.continueExportButton.hidden = !forExport;
    $("#export-mode-control").hidden = !forExport || state.editingEngine !== "live";
    $("#export-mode-select").value = state.exportMode;
    updateWarnings();
    ui.warningsDialog.showModal();
  }

  async function printOutput() {
    if (!await ensurePreviewSyncedForAction()) return;
    try {
      const output = buildOutput();
      ui.printFrame.hidden = false;
      ui.printFrame.srcdoc = FrameEditIO.createPreviewDocument(output, { print: true });
      window.setTimeout(() => (ui.printFrame.hidden = true), 5000);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function withDirtyConfirmation(action, title = "放弃未导出的修改？", message = "继续操作会清空当前修改。", force = false) {
    if (!state.dirty && !force) {
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
    const epoch = state.documentEpoch;
    if (!await ensurePreviewSyncedForAction()) return;
    if (epoch !== state.documentEpoch) return;
    let html;
    try {
      html = buildOutput({ mode: "interactive" });
    } catch (error) {
      showToast(error.message, "error");
      return;
    }
    const revision = state.revision;

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

      if (epoch !== state.documentEpoch) {
        showToast(`已保存 ${fileHandle.name || "HTML"}`);
        return;
      }
      state.fileHandle = fileHandle;
      if (fileHandle.name) {
        state.document = { ...state.document, fileName: fileHandle.name };
        ui.documentName.textContent = fileHandle.name;
      }
      if (revision === state.revision) {
        setDirty(false);
        ui.documentState.textContent = "已保存";
      }
      updateSaveButton();
      showToast(revision === state.revision ? `已保存并覆盖 ${state.document.fileName}` : "已保存此前版本，最新修改仍未保存");
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
    const percent = Math.min(100, Math.max(1, Math.round(Number(value) || 100)));
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

  function getInteractiveCanvasDocument() {
    return editor.Canvas.getFrameEl?.()?.contentDocument || editor.Canvas.getDocument();
  }

  function getCanvasComponent(target) {
    const frameDocument = getInteractiveCanvasDocument();
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

  function selectHoveredCanvasComponent(event) {
    if (state.editingEngine !== "standard" || state.mode !== "edit" || event.button !== 0) return;
    if (event.target !== editor.Canvas.getFrameEl?.()) return;
    const component = hoveredCanvasComponent;
    if (!component || component.is?.("wrapper") || editor.getEditing?.()) return;
    editor.select(component);
  }

  function activateHoveredCanvasComponent(event) {
    if (state.editingEngine !== "standard" || state.mode !== "edit") return;
    if (event.target !== editor.Canvas.getFrameEl?.()) return;
    event.preventDefault();
    activateStandardDoubleClick(hoveredCanvasComponent);
  }

  function installComponentSelection(component) {
    const element = component?.getEl?.();
    if (!element || preparedCanvasElements.get(element) === component) return;
    ensureImageResizable(component);
    preparedCanvasElements.set(element, component);
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
    const frameDocument = getInteractiveCanvasDocument();
    const frameRoot = frameDocument?.body;
    if (!frameRoot) return;
    installMountedComponentSelection(editor.DomComponents.getWrapper());
    if (preparedCanvasDocuments.has(frameRoot)) return;
    preparedCanvasDocuments.add(frameRoot);
    frameDocument.addEventListener("click", (event) => {
      if (event.target.closest?.("a")) event.preventDefault();
    });
  }

  function activateStandardDoubleClick(selectedComponent) {
    if (!selectedComponent || selectedComponent.is?.("wrapper")) return;
    editor.select(selectedComponent);
    if (componentTagName(selectedComponent) === "img") {
      window.setTimeout(() => ui.imageFileInput.click(), 0);
      return;
    }
    const component = closestTextBearingComponent(selectedComponent) || selectedComponent;
    editor.select(component);
    if (isTextLike(component)) focusTextContentEditor(component);
  }

  function bindEditorEvents() {
    window.addEventListener("pointerdown", selectHoveredCanvasComponent, true);
    window.addEventListener("dblclick", activateHoveredCanvasComponent, true);
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
    editor.on("undo redo", () => objectController?.refresh());
    editor.on("change:changesCount", () => {
      updateUndoRedo();
      if (!state.loading && state.document) {
        state.hasAuthorEdits = true;
        setDirty(true);
      }
    });
  }

  ui.openFileButton.addEventListener("click", async () => {
    if (!await ensurePreviewSyncedForAction()) return;
    withDirtyConfirmation(openHtmlFile, "打开其他 HTML？", "当前未保存的修改将被清空。");
  });
  ui.emptyOpenFileButton.addEventListener("click", () => ui.openFileButton.click());
  $("#empty-drafts-button").addEventListener("click", () => draftController.open());
  $("#drafts-button").addEventListener("click", () => setMoreMenuOpen(false));
  $("#export-mode-select").addEventListener("change", (event) => { state.exportMode = event.target.value; updateWarnings(); });
  ui.fileInput.addEventListener("change", () => {
    const [file] = ui.fileInput.files;
    loadFile(file);
    ui.fileInput.value = "";
  });
  ui.pasteCodeButton.addEventListener("click", async () => {
    if (!await ensurePreviewSyncedForAction()) return;
    withDirtyConfirmation(() => {
    ui.pasteInput.value = "";
    ui.pasteError.hidden = true;
    ui.pasteDialog.showModal();
    window.setTimeout(() => ui.pasteInput.focus(), 0);
    }, "粘贴新的 HTML？", "载入新代码会清空当前未保存的修改。");
  });
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

  ui.previewModeButton.addEventListener("click", () => {
    if (state.editingEngine === "live") setLiveCompatMode("preview");
    else enterPreviewMode();
  });
  ui.editModeButton.addEventListener("click", () => {
    if (state.editingEngine === "live") setLiveCompatMode("edit");
    else syncPreviewToEditor();
  });
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
  ui.exportButton.addEventListener("click", async () => {
    if (!await ensurePreviewSyncedForAction()) return;
    openWarnings(true);
  });
  ui.printButton.addEventListener("click", async () => {
    setMoreMenuOpen(false);
    await printOutput();
  });
  ui.pngExportButton.addEventListener("click", () => pngController.open());
  ui.userGuideButton.addEventListener("click", openUserGuide);
  ui.refreshPreviewButton.addEventListener("click", refreshPreview);
  ui.retryPreviewSyncButton.addEventListener("click", syncPreviewToEditor);
  ui.discardPreviewButton.addEventListener("click", discardPreviewChanges);
  ui.undoButton.addEventListener("click", () => {
    if (state.editingEngine === "live") postLiveCompat("beautylab-live-action", { action: "undo" });
    else runHistoryAction("undo");
  });
  ui.redoButton.addEventListener("click", () => {
    if (state.editingEngine === "live") postLiveCompat("beautylab-live-action", { action: "redo" });
    else runHistoryAction("redo");
  });
  ui.duplicateButton.addEventListener("click", () => {
    if (state.editingEngine === "live") {
      postLiveCompat("beautylab-live-action", { action: "duplicate" });
      return;
    }
    const selected = getSelected();
    if (!selected) return;
    const clone = selected.clone();
    selected.parent()?.append(clone, { at: selected.index() + 1 });
    editor.select(clone);
  });
  ui.deleteButton.addEventListener("click", () => {
    if (state.editingEngine === "live") {
      postLiveCompat("beautylab-live-action", { action: "delete" });
      return;
    }
    const selected = getSelected();
    if (selected && !selected.is("wrapper")) selected.remove();
  });
  ui.moveUpButton.addEventListener("click", () => {
    if (state.editingEngine === "live") postLiveCompat("beautylab-live-action", { action: "move-up" });
    else moveSelected(-1);
  });
  ui.moveDownButton.addEventListener("click", () => {
    if (state.editingEngine === "live") postLiveCompat("beautylab-live-action", { action: "move-down" });
    else moveSelected(1);
  });
  ui.liveSelectionActions.forEach((button) => button.addEventListener("click", () => {
    postLiveCompat("beautylab-live-action", { action: button.dataset.liveSelectionAction });
  }));
  ui.liveImageResizeHandle.addEventListener("pointerdown", startLiveImageResize);
  ui.liveImageResizeHandle.addEventListener("pointermove", moveLiveImageResize);
  ui.liveImageResizeHandle.addEventListener("pointerup", (event) => finishLiveImageResize(event));
  ui.liveImageResizeHandle.addEventListener("pointercancel", (event) => finishLiveImageResize(event, true));
  ui.liveImageResizeHandle.addEventListener("lostpointercapture", (event) => finishLiveImageResize(event, true));
  ui.liveImageResizeHandle.addEventListener("click", (event) => event.preventDefault());
  ui.boldButton.addEventListener("click", () => {
    if (state.editingEngine === "live") {
      const current = Number(state.liveCompatSelection?.styles?.fontWeight) >= 600 ? "400" : "700";
      postLiveCompat("beautylab-live-apply-style", { liveId: state.liveCompatSelection?.liveId, property: "font-weight", value: current });
    } else toggleStyle("font-weight", "700", "400");
  });
  ui.alignButtons.forEach((button) => button.addEventListener("click", () => {
    if (state.editingEngine === "live") postLiveCompat("beautylab-live-apply-style", { liveId: state.liveCompatSelection?.liveId, property: "text-align", value: button.dataset.align });
    else getSelected()?.addStyle({ "text-align": button.dataset.align });
  }));

  ui.insertImageButton.addEventListener("click", () => {
    ui.insertImageButton.blur();
    state.pendingImageInsertionComponent = state.editingEngine === "live" ? null : getSelected();
    ui.insertImageFileInput.click();
  });
  ui.insertImageFileInput.addEventListener("change", async () => {
    const [file] = ui.insertImageFileInput.files;
    const reference = state.pendingImageInsertionComponent;
    state.pendingImageInsertionComponent = null;
    ui.insertImageFileInput.value = "";
    if (!file) return;
    try {
      if (state.editingEngine === "live") {
        validateImageFile(file);
        const dataUrl = await readFileAsDataUrl(file);
        postLiveCompat("beautylab-live-insert-image", { src: dataUrl, alt: file.name || "插入的图片" });
      } else {
        await insertImageFile(file, reference);
      }
    } catch (error) {
      showToast(error.message || "图片插入失败。", "error");
    }
  });
  ui.replaceImageButton.addEventListener("click", () => ui.imageFileInput.click());
  ui.liveReplaceImageButton.addEventListener("click", () => ui.imageFileInput.click());
  ui.imageFileInput.addEventListener("change", () => {
    const file = ui.imageFileInput.files[0];
    if (state.editingEngine === "live" && file) {
      (async () => {
        try {
          validateImageFile(file);
          const dataUrl = await readFileAsDataUrl(file);
          postLiveCompat("beautylab-live-replace-image", { liveId: state.liveCompatSelection?.liveId, src: dataUrl, alt: file.name || "图片" });
        } catch (error) {
          showToast(error.message || "图片读取失败。", "error");
        }
      })();
    } else {
      replaceSelectedImage(file);
    }
    ui.imageFileInput.value = "";
  });
  ui.imageWidthSlider.addEventListener("input", () => {
    if (state.editingEngine === "live") postLiveCompat("beautylab-live-apply-style", { liveId: state.liveCompatSelection?.liveId, property: "width", value: `${ui.imageWidthSlider.value}%` });
    else setSelectedImageWidth(ui.imageWidthSlider.value);
  });
  ui.imageWidthPresets.forEach((button) => button.addEventListener("click", () => {
    if (state.editingEngine === "live") postLiveCompat("beautylab-live-apply-style", { liveId: state.liveCompatSelection?.liveId, property: "width", value: `${button.dataset.imageWidth}%` });
    else setSelectedImageWidth(button.dataset.imageWidth);
  }));
  ui.liveImageWidthSlider.addEventListener("input", () => {
    const width = ui.liveImageWidthSlider.value;
    ui.liveImageWidthOutput.value = `${width}%`;
    ui.liveImageWidthOutput.textContent = `${width}%`;
    postLiveCompat("beautylab-live-apply-style", { liveId: state.liveCompatSelection?.liveId, property: "width", value: `${width}%` });
  });
  ui.liveImageWidthPresets.forEach((button) => button.addEventListener("click", () => {
    const width = button.dataset.liveImageWidth;
    ui.liveImageWidthSlider.value = width;
    ui.liveImageWidthOutput.value = `${width}%`;
    ui.liveImageWidthOutput.textContent = `${width}%`;
    postLiveCompat("beautylab-live-apply-style", { liveId: state.liveCompatSelection?.liveId, property: "width", value: `${width}%` });
  }));
  ui.liveStyleFields.forEach((field) => {
    let timer = null;
    const apply = (liveId, value) => {
      if (state.editingEngine !== "live" || !liveId) return;
      postLiveCompat("beautylab-live-apply-style", { liveId, property: field.dataset.liveStyle, value });
    };
    field.addEventListener("input", () => {
      const liveId = state.liveCompatSelection?.liveId;
      const value = field.dataset.unit && field.value !== "" ? `${field.value}${field.dataset.unit}` : field.value;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => apply(liveId, value), field.matches("select, input[type=color]") ? 0 : 140);
    });
  });
  ui.liveStyleButtons.forEach((button) => button.addEventListener("click", () => {
    const liveId = state.liveCompatSelection?.liveId;
    if (state.editingEngine !== "live" || !liveId) return;
    postLiveCompat("beautylab-live-apply-style", {
      liveId,
      property: button.dataset.liveStyleButton,
      value: button.dataset.liveStyleValue,
    });
  }));
  ui.liveAddOptionButton.addEventListener("click", () => {
    postLiveCompat("beautylab-live-select-action", { liveId: state.liveCompatSelection?.liveId, action: "add", label: "新选项", value: `option-${(state.liveCompatSelection?.selectOptions?.length || 0) + 1}` });
  });
  ui.liveRemoveOptionButton.addEventListener("click", () => {
    const selection = state.liveCompatSelection;
    const options = selection?.selectOptions || [];
    if (!selection?.liveId || !options.length) return;
    postLiveCompat("beautylab-live-select-action", { liveId: selection.liveId, action: "remove", index: options.length - 1 });
  });
  function setLayersCollapsed(collapsed) {
    ui.workspace.classList.toggle("left-collapsed", collapsed);
    ui.toggleLayersButton.title = i18n.t(collapsed ? "展开图层" : "收起图层");
    ui.toggleLayersButton.setAttribute("aria-label", ui.toggleLayersButton.title);
    ui.toggleLayersButton.setAttribute("aria-pressed", String(collapsed));
    ui.toggleLayersButton.setAttribute("aria-expanded", String(!collapsed));
    const icon = ui.toggleLayersButton.querySelector("svg, i");
    if (icon) icon.outerHTML = `<i data-lucide="${collapsed ? "panel-left-open" : "panel-left-close"}"></i>`;
    refreshIcons(ui.toggleLayersButton);
  }

  ui.toggleLayersButton.addEventListener("click", () => {
    setLayersCollapsed(!ui.workspace.classList.contains("left-collapsed"));
    window.setTimeout(() => {
      if (state.editingEngine === "live") {
        renderLiveSelectionToolbar(state.liveCompatSelection);
        renderLiveImageResizeHandle(state.liveCompatSelection);
      }
      else editor?.refresh();
    }, 180);
  });

  ui.warningsButton.addEventListener("click", () => openWarnings(false));
  ui.closeWarningsButton.addEventListener("click", () => ui.warningsDialog.close());
  ui.continueExportButton.addEventListener("click", async () => {
    ui.warningsDialog.close();
    await downloadOutput();
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
  window.addEventListener("resize", () => {
    setMoreMenuOpen(false);
    if (state.editingEngine === "live") {
      renderLiveSelectionToolbar(state.liveCompatSelection);
      renderLiveImageResizeHandle(state.liveCompatSelection);
    }
  });

  ui.liveCompatButton.addEventListener("click", toggleLiveCompat);

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
    if (editor) updateSelectionUI();
    updateLiveCompatMenu();
    setLayersPanelMode(state.editingEngine === "live");
    if (state.editingEngine === "live") updateLiveCompatRuntimeStatus();
  });
  ui.ecoButton.addEventListener("click", () => {
    applyEcoMode(!ui.appShell.classList.contains("eco-mode"));
  });

  window.addEventListener("message", (event) => {
    if (state.editingEngine === "live" && validLiveCompatMessage(event)) {
      const message = event.data || {};
      if (message.type === "beautylab-live-ready" || message.type === "beautylab-preview-ready") {
        canvasView.refresh();
        state.liveCompatReady = true;
        updateLiveCompatRuntimeStatus();
        ui.documentState.textContent = state.mode === "preview" ? "实时预览模式" : "实时兼容模式";
        postLiveCompat("beautylab-live-set-mode", { mode: state.mode });
        return;
      }
      if (message.type === "beautylab-resource-status") {
        state.liveCompatResources = {
          total: Math.max(0, Number(message.total) || 0),
          loaded: Math.max(0, Number(message.loaded) || 0),
          failed: Math.max(0, Number(message.failed) || 0),
          pending: Math.max(0, Number(message.pending) || 0),
          online: message.online !== false,
          failedUrls: Array.isArray(message.failedUrls) ? message.failedUrls.slice(0, 8) : [],
        };
        updateLiveCompatRuntimeStatus();
        return;
      }
      if (message.type === "beautylab-live-tree") {
        state.liveCompatLayers = Array.isArray(message.layers)
          ? message.layers.slice(0, 600).map((layer) => ({
              liveId: String(layer?.liveId || ""),
              tag: String(layer?.tag || "element"),
              label: String(layer?.label || ""),
              depth: Math.max(0, Math.min(10, Number(layer?.depth) || 0)),
              hasChildren: Boolean(layer?.hasChildren),
              locked: Boolean(layer?.locked),
              hidden: Boolean(layer?.hidden),
            }))
          : [];
        renderLiveLayers();
        return;
      }
      if (message.type === "beautylab-live-selection") {
        state.liveCompatSelection = message.selection || null;
        renderLiveSelectionUI();
        return;
      }
      if (message.type === "beautylab-live-format") {
        objectController.receiveFormat(message.format);
        return;
      }
      if (message.type === "beautylab-live-history") {
        state.liveCompatHistory = { canUndo: Boolean(message.canUndo), canRedo: Boolean(message.canRedo) };
        updateUndoRedo();
        return;
      }
      if (message.type === "beautylab-live-change") {
        state.liveCompatInteracted = true;
        state.hasAuthorEdits = true;
        setDirty(true);
        ui.liveCompatStatusText.textContent = "修改已应用到当前运行时页面";
        return;
      }
      if (message.type === "beautylab-live-preview-activity") {
        state.liveCompatInteracted = true;
        state.hasAuthorEdits = true;
        setDirty(true);
        ui.liveCompatStatusText.textContent = "交互状态已保留，切回修改不会重建页面";
        return;
      }
      if (message.type === "beautylab-live-error") {
        showToast(message.message || "实时页面操作失败。", "error");
        return;
      }
      return;
    }
    if (state.mode !== "preview" || !validPreviewMessage(event)) return;
    const message = event.data || {};
    if (message.type === "beautylab-preview-ready") {
      state.previewReady = true;
      if (!state.previewInteracted && !state.previewSyncing) {
        const risky = state.document?.warnings?.filter((warning) => warning.level === "warning").length || 0;
        setPreviewStatus(risky ? `预览已就绪，请留意 ${risky} 项兼容性提示` : "交互预览已就绪，可点击页面按钮");
      }
      return;
    }
    if (message.type === "beautylab-preview-interaction") {
      state.previewInteracted = true;
      state.revision += 1;
      draftController.schedule();
      if (!state.previewSyncing) {
        setPreviewStatus("预览中有尚未同步的交互变化", { dirty: true });
        ui.documentState.textContent = "预览变化待同步";
      }
    }
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
  window.addEventListener("drop", async (event) => {
    event.preventDefault();
    state.dragDepth = 0;
    ui.dropOverlay.hidden = true;
    const file = Array.from(event.dataTransfer?.files || []).find((candidate) => /\.html?$/i.test(candidate.name));
    if (!file) {
      showToast("拖入的文件中没有 HTML。", "warning");
      return;
    }
    if (!await ensurePreviewSyncedForAction()) return;
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
    // Let text fields own selection, clipboard, deletion and native undo.
    if (event.isComposing || event.keyCode === 229 || event.target?.isContentEditable || event.target?.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return;
    if (modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (state.editingEngine === "live") postLiveCompat("beautylab-live-action", { action: event.shiftKey ? "redo" : "undo" });
      else runHistoryAction(event.shiftKey ? "redo" : "undo");
    }
    if (modifier && event.key.toLowerCase() === "d") {
      event.preventDefault();
      ui.duplicateButton.click();
    }
    const hasDeletableSelection = state.editingEngine === "live" ? Boolean(state.liveCompatSelection) : Boolean(getSelected());
    if ((event.key === "Delete" || event.key === "Backspace") && hasDeletableSelection && document.activeElement === document.body) {
      event.preventDefault();
      ui.deleteButton.click();
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (!state.dirty && !state.previewInteracted && !state.liveCompatInteracted) return;
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
  window.__beautyLabMarkReady?.();
  applyEcoMode(readLocalSetting(ECO_MODE_KEY) === "true", false);
  i18n.setLanguage(i18n.getLanguage());
  refreshIcons();
  if (window.grapesjs) {
    ensureEditorReady().catch((error) => showToast(error.message || "编辑器初始化失败。", "error"));
  }
})();
