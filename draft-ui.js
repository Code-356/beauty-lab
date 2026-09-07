(function initDraftUI(global) {
  "use strict";

  function create({ capture, restore, showToast, onStatus }) {
    const store = global.BeautyLabDrafts.create();
    const t = (value) => global.BeautyLabI18n?.t(value) || value;
    const make = (tag, className, text) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    };
    let active = null;
    let timer = 0;
    let sequence = Promise.resolve();
    let generation = 0;
    let selectedId = null;
    let selectedVersionId = null;
    let documents = [];
    let history = [];
    let reading = 0;
    let busy = false;
    let destroyed = false;
    let lastErrorMessage = "";
    const trigger = document.getElementById("drafts-button");
    const dialog = make("dialog", "dialog draft-dialog");
    dialog.id = "drafts-dialog";
    dialog.setAttribute("aria-labelledby", "drafts-title");
    const shell = make("div", "draft-shell");
    const header = make("header", "dialog-header");
    const title = make("h2");
    title.id = "drafts-title";
    const headerActions = make("div", "draft-header-actions");
    const button = (icon, label, className = "icon-button") => {
      const element = make("button", className);
      element.type = "button";
      element.dataset.draftLabel = label;
      const symbol = make("i");
      symbol.setAttribute("data-lucide", icon);
      element.append(symbol);
      return element;
    };
    const refreshButton = button("refresh-cw", "刷新草稿");
    const closeButton = button("x", "关闭");
    headerActions.append(refreshButton, closeButton);
    header.append(title, headerActions);
    const body = make("div", "draft-body");
    const documentPane = make("section", "draft-documents-pane");
    const documentHeading = make("h3");
    const documentList = make("div", "draft-document-list");
    documentList.setAttribute("aria-label", t("草稿文件"));
    documentPane.append(documentHeading, documentList);
    const versionPane = make("section", "draft-versions-pane");
    const versionHeading = make("h3");
    const versionList = make("div", "draft-version-list");
    versionList.setAttribute("aria-label", t("历史版本"));
    versionPane.append(versionHeading, versionList);
    body.append(documentPane, versionPane);
    const errorText = make("p", "draft-error");
    errorText.setAttribute("role", "status");
    errorText.hidden = true;
    const footer = make("footer", "dialog-footer draft-footer");
    const deleteButton = button("trash-2", "删除草稿");
    deleteButton.classList.add("draft-delete");
    const countLabel = make("span", "draft-count");
    const restoreButton = button("history", "恢复此版本", "button button-primary");
    const restoreLabel = make("span");
    restoreButton.append(restoreLabel);
    footer.append(deleteButton, countLabel, restoreButton);
    shell.append(header, body, errorText, footer);
    dialog.append(shell);
    document.body.append(dialog);

    function fingerprint(payload) {
      return JSON.stringify({ html: payload.html, fileName: payload.fileName, viewSettings: payload.viewSettings });
    }

    function errorMessage(error) {
      if (error?.code === "QUOTA_EXCEEDED") return t("本地空间不足，草稿未保存。请导出 HTML 或删除旧草稿。");
      if (error?.code === "STORAGE_UNAVAILABLE") return t("此浏览器无法使用本地草稿，请及时导出 HTML。");
      if (error?.code === "INVALID_DATA") return t("草稿数据无法保存，请导出 HTML。");
      return t("草稿未保存，请稍后重试或导出 HTML。");
    }

    function report(error, target = active) {
      const message = errorMessage(error);
      if (!target || target === active) onStatus?.("error", { error, message });
      if (dialog.open) { errorText.textContent = message; errorText.hidden = false; }
      if (lastErrorMessage !== message) showToast?.(message);
      lastErrorMessage = message;
      return { ok: false, error };
    }

    function setDocument({ id, name } = {}) {
      clearTimeout(timer);
      timer = 0;
      generation += 1;
      active = { generation, id, name: name || "Untitled.html", fingerprint: null, changes: 0 };
      lastErrorMessage = "";
    }

    async function save(target) {
      if (!target) return { ok: true, skipped: true };
      if (destroyed || target !== active) return { ok: false, stale: true };
      const changes = target.changes;
      try {
        const payload = await capture();
        if (destroyed || target !== active) return { ok: false, stale: true };
        if (!payload) throw new Error("The document is not ready for a draft snapshot.");
        const key = fingerprint(payload);
        if (key === target.fingerprint) {
          lastErrorMessage = "";
          if (target.metadata) onStatus?.("saved", { metadata: target.metadata });
          return { ok: true, skipped: true, metadata: target.metadata };
        }
        onStatus?.("saving", {});
        const metadata = await store.save({ id: target.id, name: payload.fileName || target.name, payload });
        target.id = metadata.id;
        target.name = metadata.name;
        target.fingerprint = key;
        target.metadata = metadata;
        if (target === active && !destroyed) {
          lastErrorMessage = "";
          if (changes === target.changes) onStatus?.("saved", { metadata });
          if (trigger) trigger.dataset.hasDrafts = "true";
        }
        return { ok: target === active && !destroyed, stale: target !== active, metadata };
      } catch (error) {
        if (target !== active || destroyed) return { ok: false, stale: true, error };
        return report(error, target);
      }
    }

    function flush() {
      clearTimeout(timer);
      timer = 0;
      const target = active;
      const pending = sequence.then(() => save(target));
      sequence = pending.then(() => undefined, () => undefined);
      return pending;
    }

    function schedule() {
      if (!active || destroyed) return;
      active.changes += 1;
      clearTimeout(timer);
      timer = setTimeout(() => { timer = 0; void flush(); }, 1200);
    }

    function dateLabel(value) {
      return new Date(value).toLocaleString(global.BeautyLabI18n?.getLanguage() === "en" ? "en-US" : "zh-CN", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      });
    }

    function syncButtons() {
      restoreButton.disabled = busy || !selectedId || !selectedVersionId;
      deleteButton.disabled = busy || !selectedId;
      refreshButton.disabled = busy;
      closeButton.disabled = busy;
      documentList.querySelectorAll("button").forEach((element) => { element.disabled = busy; });
      versionList.querySelectorAll("button").forEach((element) => { element.disabled = busy; });
      dialog.setAttribute("aria-busy", String(busy));
    }

    function paint() {
      title.textContent = t("本地草稿");
      documentHeading.textContent = t("草稿文件");
      versionHeading.textContent = t("历史版本");
      restoreLabel.textContent = t("恢复此版本");
      documentList.setAttribute("aria-label", t("草稿文件"));
      versionList.setAttribute("aria-label", t("历史版本"));
      dialog.querySelectorAll("[data-draft-label]").forEach((element) => {
        element.title = t(element.dataset.draftLabel);
        element.setAttribute("aria-label", t(element.dataset.draftLabel));
      });
      documentList.replaceChildren();
      versionList.replaceChildren();
      if (!documents.length) documentList.append(make("p", "draft-empty", t("暂无本地草稿")));
      for (const metadata of documents) {
        const row = make("button", "draft-document-row");
        row.type = "button";
        row.dataset.draftId = metadata.id;
        row.setAttribute("aria-pressed", String(selectedId === metadata.id));
        row.append(make("strong", "draft-file-name", metadata.name), make("time", "draft-date", dateLabel(metadata.updatedAt)));
        row.addEventListener("click", () => { selectedId = metadata.id; selectedVersionId = null; void readVersions(); });
        documentList.append(row);
      }
      if (!history.length) versionList.append(make("p", "draft-empty", t("暂无历史版本")));
      for (const version of history) {
        const row = make("button", "draft-version-row");
        row.type = "button";
        row.dataset.versionId = version.versionId;
        row.setAttribute("aria-pressed", String(selectedVersionId === version.versionId));
        const heading = make("span", "draft-version-heading");
        heading.append(make("strong", "", `${t("版本")} ${version.sequence}`));
        if (version.versionId === history[0].versionId) heading.append(make("span", "draft-latest", t("最新")));
        row.append(heading, make("time", "draft-date", dateLabel(version.savedAt)));
        row.addEventListener("click", () => { selectedVersionId = version.versionId; paint(); });
        versionList.append(row);
      }
      countLabel.textContent = `${documents.length} ${t("个草稿")} / ${history.length} ${t("个版本")}`;
      syncButtons();
      global.lucide?.createIcons({ root: dialog });
    }

    async function readVersions() {
      const request = ++reading;
      const id = selectedId;
      history = [];
      selectedVersionId = null;
      paint();
      try {
        const result = id ? await store.versions(id) : [];
        if (request !== reading || destroyed) return;
        history = result;
        selectedVersionId = result[0]?.versionId || null;
        paint();
      } catch (error) { if (request === reading) report(error); }
    }

    async function refresh() {
      const request = ++reading;
      errorText.hidden = true;
      try {
        const result = await store.list();
        if (request !== reading || destroyed) return;
        documents = result;
        if (trigger) trigger.dataset.hasDrafts = String(result.length > 0);
        if (!result.some((metadata) => metadata.id === selectedId)) {
          selectedId = result.find((metadata) => metadata.id === active?.id)?.id || result[0]?.id || null;
        }
        await readVersions();
      } catch (error) { if (request === reading) { documents = []; history = []; paint(); report(error); } }
    }

    async function open() {
      if (destroyed) return;
      if (!dialog.open) dialog.showModal();
      paint();
      busy = true;
      syncButtons();
      try {
        const result = await flush();
        await refresh();
        if (!result.ok && result.error) report(result.error);
      } finally { busy = false; syncButtons(); }
    }

    async function recover() {
      if (busy || !selectedId || !selectedVersionId) return;
      busy = true;
      syncButtons();
      const id = selectedId;
      const versionId = selectedVersionId;
      try {
        const saved = await flush();
        if (!saved.ok) return;
        const record = await store.get(id, versionId);
        if (!record) {
          errorText.textContent = t("此版本已不存在，请刷新草稿列表。");
          errorText.hidden = false;
          return;
        }
        await restore(record.payload, { id });
        setDocument({ id, name: record.payload.fileName || record.metadata.name });
        if (record.versionId === record.metadata.latestVersionId) {
          active.fingerprint = fingerprint(record.payload);
          active.metadata = record.metadata;
        }
        else schedule();
        dialog.close();
        showToast?.(t("已恢复草稿"));
      } catch (error) { report(error); }
      finally { busy = false; syncButtons(); }
    }

    async function removeSelected() {
      if (busy || !selectedId || !global.confirm(t("删除这个草稿及其全部历史版本？"))) return;
      busy = true;
      syncButtons();
      const id = selectedId;
      try {
        // Deletion remains available when a full disk prevents the current draft from saving.
        if (active?.id === id) {
          clearTimeout(timer);
          timer = 0;
          await sequence;
        }
        await store.remove(id);
        if (active?.id === id) {
          clearTimeout(timer);
          timer = 0;
          active.id = undefined;
          active.fingerprint = null;
          active.metadata = null;
        }
        selectedId = null;
        await refresh();
        showToast?.(t("已删除草稿"));
      } catch (error) { report(error); }
      finally { busy = false; syncButtons(); }
    }

    const onVisibility = () => { if (document.visibilityState === "hidden" && timer) void flush(); };
    const onTrigger = () => { void open(); };
    closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("cancel", (event) => { if (busy) event.preventDefault(); });
    refreshButton.addEventListener("click", () => { void refresh(); });
    restoreButton.addEventListener("click", () => { void recover(); });
    deleteButton.addEventListener("click", () => { void removeSelected(); });
    trigger?.addEventListener("click", onTrigger);
    document.addEventListener("visibilitychange", onVisibility);
    const unsubscribeLanguage = global.BeautyLabI18n?.onChange(paint);
    paint();

    async function destroy() {
      destroyed = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      trigger?.removeEventListener("click", onTrigger);
      unsubscribeLanguage?.();
      dialog.remove();
      await sequence;
      await store.close();
    }

    return { schedule, flush, setDocument, open, refresh, destroy };
  }

  global.BeautyLabDraftUI = { create };
})(window);
