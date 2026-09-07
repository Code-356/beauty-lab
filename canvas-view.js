(function initCanvasView(global) {
  "use strict";

  const PRESETS = {
    desktop: [1440, 900],
    "16:9": [1920, 1080],
    tablet: [768, 1024],
    mobile: [390, 844],
  };
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 200;

  function create({ getEditor, getState, onChange }) {
    const $ = (selector) => document.querySelector(selector);
    const stage = $(".canvas-stage");
    const gjs = $("#gjs");
    const liveViewport = $("#live-zoom-viewport");
    const previewViewport = $("#preview-zoom-viewport");
    const select = $("#viewport-select");
    const customControls = $("#custom-viewport-controls");
    const widthInput = $("#viewport-width");
    const heightInput = $("#viewport-height");
    const slider = $("#zoom-slider");
    const percent = $("#zoom-percent");
    const minus = $("#zoom-out");
    const plus = $("#zoom-in");
    const actual = $("#zoom-actual");
    const fitButton = $("#zoom-fit");
    let width = 1440;
    let height = 900;
    let zoom = 100;
    let fit = true;
    let pending = 0;

    function activeViewport() {
      const state = getState();
      return state.editingEngine === "live" ? liveViewport : state.mode === "preview" ? previewViewport : stage;
    }

    function innerSize(element) {
      const style = getComputedStyle(element);
      return {
        width: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        height: element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
      };
    }

    function syncControls() {
      const available = Boolean(getState().document);
      [select, widthInput, heightInput, slider, percent, actual, fitButton].forEach((control) => { control.disabled = !available; });
      minus.disabled = !available || zoom <= MIN_ZOOM;
      plus.disabled = !available || zoom >= MAX_ZOOM;
      slider.value = String(zoom);
      percent.value = String(zoom);
      fitButton.setAttribute("aria-pressed", String(fit));
      actual.setAttribute("aria-pressed", String(!fit && zoom === 100));
    }

    function applyFrame(viewport, page, frame) {
      const size = innerSize(viewport);
      if (size.width <= 0 || size.height <= 0) return;
      const scale = zoom / 100;
      page.style.width = `${width * scale}px`;
      page.style.height = `${height * scale}px`;
      page.style.marginLeft = `${Math.max(0, (size.width - width * scale) / 2)}px`;
      page.style.marginTop = `${Math.max(0, (size.height - height * scale) / 2)}px`;
      frame.style.width = `${width}px`;
      frame.style.height = `${height}px`;
      frame.style.transform = `scale(${scale})`;
    }

    function applyStandard() {
      const editor = getEditor();
      const frame = editor?.Canvas.getFrameEl();
      if (!frame) return;
      const size = innerSize(stage);
      if (size.width <= 0 || size.height <= 0) return;
      const scale = zoom / 100;
      const visibleWidth = Math.max(size.width, width * scale);
      const visibleHeight = Math.max(size.height, height * scale);
      gjs.style.width = `${visibleWidth}px`;
      gjs.style.height = `${visibleHeight}px`;
      // Canvas zoom keeps GrapesJS selection and resize coordinates in page units.
      const model = editor.Canvas.getFrames()[0];
      if (model && (model.get("width") !== width || model.get("height") !== height)) {
        editor.UndoManager.skip(() => model.set({ width, height }));
      }
      editor.Canvas.setZoom(zoom);
      editor.Canvas.setCoords(0, 0);
      const bounds = gjs.getBoundingClientRect();
      const rect = frame.getBoundingClientRect();
      editor.Canvas.setCoords(
        bounds.left + Math.max(0, (visibleWidth - width * scale) / 2) - rect.left,
        bounds.top + Math.max(0, (visibleHeight - height * scale) / 2) - rect.top,
      );
      editor.refresh({ tools: true });
    }

    function apply() {
      pending = 0;
      if (!getState().document) { syncControls(); return; }
      const viewport = activeViewport();
      const size = innerSize(viewport);
      if (size.width <= 0 || size.height <= 0) return;
      if (fit) zoom = Math.max(MIN_ZOOM, Math.min(100, Math.floor(Math.min(size.width / width, size.height / height) * 100)));
      const state = getState();
      if (state.editingEngine === "live") {
        applyFrame(liveViewport, $("#live-compat-frame-wrap"), $("#live-compat-frame"));
      } else if (state.mode === "preview") {
        applyFrame(previewViewport, $("#preview-frame-wrap"), $("#preview-frame"));
      } else {
        applyStandard();
      }
      syncControls();
      onChange?.();
    }

    function refresh() {
      if (!pending) pending = requestAnimationFrame(apply);
    }

    function setZoom(value) {
      if (!getState().document) return;
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || value === "") { syncControls(); return; }
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(numeric)));
      fit = false;
      refresh();
    }

    function setDimensions() {
      const preset = PRESETS[select.value];
      const clamp = (value, fallback) => value === "" || !Number.isFinite(Number(value))
        ? fallback : Math.max(240, Math.min(7680, Math.round(Number(value))));
      [width, height] = preset || [clamp(widthInput.value, width), clamp(heightInput.value, height)];
      widthInput.value = String(width);
      heightInput.value = String(height);
      customControls.hidden = Boolean(preset);
      fit = true;
      [stage, liveViewport, previewViewport].forEach((viewport) => { viewport.scrollTop = 0; viewport.scrollLeft = 0; });
      refresh();
    }

    select.addEventListener("change", setDimensions);
    [widthInput, heightInput].forEach((input) => input.addEventListener("change", setDimensions));
    slider.addEventListener("input", () => setZoom(slider.value));
    percent.addEventListener("change", () => setZoom(percent.value));
    percent.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { setZoom(percent.value); percent.blur(); }
      if (event.key === "Escape") { syncControls(); percent.blur(); }
    });
    minus.addEventListener("click", () => setZoom(zoom - 10));
    plus.addEventListener("click", () => setZoom(zoom + 10));
    actual.addEventListener("click", () => setZoom(100));
    fitButton.addEventListener("click", () => {
      fit = true;
      activeViewport().scrollTo(0, 0);
      refresh();
    });
    const observer = new ResizeObserver(refresh);
    [stage, liveViewport, previewViewport].forEach((element) => observer.observe(element));
    stage.addEventListener("scroll", () => getEditor()?.refresh({ tools: true }));
    function getSettings() { return { version: 1, preset: select.value, width, height, zoom, fit }; }
    function restoreSettings(settings) {
      if (!settings || settings.version !== 1) return;
      select.value = PRESETS[settings.preset] ? settings.preset : "custom";
      widthInput.value = String(settings.width || 1440);
      heightInput.value = String(settings.height || 900);
      setDimensions();
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(settings.zoom) || 100));
      fit = settings.fit !== false;
      refresh();
    }
    return { refresh, reset: () => { fit = true; refresh(); }, getScale: () => zoom / 100, getSettings, restoreSettings };
  }

  global.BeautyLabCanvasView = { create };
})(window);
