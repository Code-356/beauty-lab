(function initFrameEditSelectOptions(global) {
  "use strict";

  function escapeAttribute(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function componentTag(component) {
    return (component?.get?.("tagName") || "").toLowerCase();
  }

  function componentAttributes(component) {
    return component?.getAttributes?.() || {};
  }

  function hasClass(component, className) {
    return String(componentAttributes(component).class || "").split(/\s+/).includes(className);
  }

  function findDescendants(component, predicate, matches = []) {
    component?.components?.().forEach((child) => {
      if (predicate(child)) matches.push(child);
      findDescendants(child, predicate, matches);
    });
    return matches;
  }

  function findDescendant(component, predicate) {
    return findDescendants(component, predicate, [])[0] || null;
  }

  function findAncestor(component, predicate) {
    let current = component;
    while (current) {
      if (predicate(current)) return current;
      current = current.parent?.();
    }
    return null;
  }

  function textNodes(component) {
    return findDescendants(component, (candidate) => candidate.get?.("type") === "textnode", []);
  }

  function create(config) {
    const {
      editor,
      panel,
      list,
      empty,
      count,
      title,
      description,
      runtimeNote,
      addButton,
      removeButton,
      hasScripts,
      onOptionsChanged = () => {},
      refreshIcons,
      showToast,
    } = config;
    let selected = null;
    let renderScheduled = false;

    function resolveTarget(component) {
      if (!component) return null;
      const nativeSelect = componentTag(component) === "select"
        ? component
        : componentTag(component) === "option" && componentTag(component.parent?.()) === "select"
          ? component.parent()
          : null;
      if (nativeSelect) return { kind: "native", root: nativeSelect, content: nativeSelect, summary: null };

      const customRoot = findAncestor(component, (candidate) => hasClass(candidate, "dropdown-group"));
      if (!customRoot) return null;
      const content = findDescendant(customRoot, (candidate) => hasClass(candidate, "dropdown-content"));
      if (!content) return null;
      const summary = findDescendant(customRoot, (candidate) => {
        const attributes = componentAttributes(candidate);
        return componentTag(candidate) === "span" && Boolean(attributes.id) && !hasClass(candidate, "filter-label");
      });
      return { kind: "custom", root: customRoot, content, summary };
    }

    function optionInput(option) {
      if (!option || selected?.kind !== "custom") return null;
      return findDescendant(option, (candidate) => {
        if (componentTag(candidate) !== "input") return false;
        const type = String(componentAttributes(candidate).type || "").toLowerCase();
        return type === "checkbox" || type === "radio";
      });
    }

    function options() {
      if (!selected) return [];
      if (selected.kind === "native") {
        return selected.content.components().filter((component) => componentTag(component) === "option");
      }
      return findDescendants(selected.content, (component) => componentTag(component) === "label" && Boolean(optionInput(component)), []);
    }

    function componentText(component) {
      const element = component?.getEl?.();
      if (element) return element.textContent || "";
      return textNodes(component).map((node) => node.get?.("content") || "").join("");
    }

    function optionText(option) {
      const text = componentText(option);
      return selected?.kind === "custom" ? text.trim() : text;
    }

    function optionValue(option) {
      if (selected?.kind === "native") {
        const attributes = componentAttributes(option);
        return attributes.value ?? optionText(option);
      }
      const input = optionInput(option);
      return componentAttributes(input).value ?? optionText(option);
    }

    function isDefault(option) {
      const target = selected?.kind === "native" ? option : optionInput(option);
      return Object.prototype.hasOwnProperty.call(componentAttributes(target), selected?.kind === "native" ? "selected" : "checked");
    }

    function setComponentText(component, value, prefix = "") {
      if (!component) return;
      const text = String(value ?? "");
      const nodes = textNodes(component).filter((node) => String(node.get?.("content") || "").trim());
      if (nodes.length) {
        nodes[0].set("content", `${prefix}${text}`);
      } else {
        component.append(`${prefix}${escapeAttribute(text)}`);
      }
      component.view?.render?.();
    }

    function setOptionText(option, value) {
      if (selected?.kind === "native") {
        option.components(escapeAttribute(value));
        return;
      }
      setComponentText(option, value, " ");
    }

    function setOptionValue(option, value) {
      const target = selected?.kind === "native" ? option : optionInput(option);
      target?.addAttributes?.({ value });
      syncCustomSummary();
    }

    function customInputType(option) {
      return String(componentAttributes(optionInput(option)).type || "checkbox").toLowerCase();
    }

    function customTargetId() {
      const targetFromOption = options().map(optionInput).find(Boolean);
      const targetId = componentAttributes(targetFromOption)["data-target"] || componentAttributes(selected?.summary).id || "";
      return /^[A-Za-z0-9_-]+$/.test(targetId) ? targetId : "";
    }

    function syncCustomSummary() {
      if (selected?.kind !== "custom" || !selected.summary) return;
      const values = options().filter(isDefault).map(optionValue);
      const text = values.length === 0 ? "None Selected" : values.length > 2 ? `Selected ${values.length} Items` : values.join(", ");
      const apply = () => selected?.summary && selected.root && setComponentText(selected.summary, text);
      if (typeof editor.UndoManager.skip === "function") editor.UndoManager.skip(apply);
      else apply();
    }

    function defaultActionMeta(option) {
      const active = isDefault(option);
      if (selected?.kind === "native") {
        return { active, icon: "circle-check", title: active ? "取消默认项" : "设为默认项" };
      }
      const radio = customInputType(option) === "radio";
      return {
        active,
        icon: radio ? "circle-dot" : "square-check-big",
        title: active ? "取消默认勾选" : radio ? "设为默认项" : "设为默认勾选",
      };
    }

    function render() {
      renderScheduled = false;
      const currentOptions = options();
      const custom = selected?.kind === "custom";
      title.textContent = custom ? "自定义下拉选项" : "下拉选项";
      description.textContent = custom ? "同步修改显示文字与实际值" : "增加、删除或修改每个选项";
      count.textContent = `${currentOptions.length} 项`;
      empty.textContent = custom ? "当前自定义下拉框没有静态选项" : "当前下拉框没有选项";
      empty.hidden = currentOptions.length > 0;
      list.hidden = currentOptions.length === 0;
      removeButton.disabled = currentOptions.length === 0;
      runtimeNote.hidden = !(custom && currentOptions.length === 0 && hasScripts());
      list.innerHTML = currentOptions
        .map((option, index) => {
          const defaultMeta = defaultActionMeta(option);
          return `
            <div class="select-option-row" data-option-index="${index}">
              <div class="select-option-main">
                <span class="select-option-index">${String(index + 1).padStart(2, "0")}</span>
                <label class="select-option-field select-option-label-field">
                  <span>显示文字</span>
                  <input data-option-field="label" type="text" value="${escapeAttribute(optionText(option))}" />
                </label>
              </div>
              <label class="select-option-field select-option-value-field">
                <span>值</span>
                <input data-option-field="value" type="text" value="${escapeAttribute(optionValue(option))}" />
              </label>
              <div class="select-option-actions">
                <button class="mini-icon-button default-option-button${defaultMeta.active ? " active" : ""}" data-option-action="default" type="button" aria-pressed="${defaultMeta.active}" title="${defaultMeta.title}" aria-label="${defaultMeta.title}">
                  <i data-lucide="${defaultMeta.icon}"></i>
                </button>
                <span class="option-action-divider" aria-hidden="true"></span>
                <button class="mini-icon-button" data-option-action="up" type="button" title="上移选项" aria-label="上移选项" ${index === 0 ? "disabled" : ""}><i data-lucide="arrow-up"></i></button>
                <button class="mini-icon-button" data-option-action="down" type="button" title="下移选项" aria-label="下移选项" ${index === currentOptions.length - 1 ? "disabled" : ""}><i data-lucide="arrow-down"></i></button>
                <button class="mini-icon-button" data-option-action="duplicate" type="button" title="复制选项" aria-label="复制选项"><i data-lucide="copy"></i></button>
                <button class="mini-icon-button danger-on-hover" data-option-action="delete" type="button" title="删除选项" aria-label="删除选项"><i data-lucide="trash-2"></i></button>
              </div>
            </div>`;
        })
        .join("");
      refreshIcons(panel);
    }

    function scheduleRender() {
      if (!selected || renderScheduled) return;
      if (list.contains(document.activeElement) && document.activeElement.matches("input[data-option-field]")) return;
      renderScheduled = true;
      window.requestAnimationFrame(render);
    }

    function setDefault(option) {
      if (selected?.kind === "native") {
        const shouldClear = isDefault(option);
        options().forEach((candidate) => candidate.removeAttributes("selected"));
        if (!shouldClear) option.addAttributes({ selected: "" });
        showToast(shouldClear ? "已取消默认选项" : "已设置默认选项");
        return;
      }

      const input = optionInput(option);
      const shouldClear = isDefault(option);
      if (customInputType(option) === "radio") options().forEach((candidate) => optionInput(candidate)?.removeAttributes("checked"));
      if (shouldClear) input.removeAttributes("checked");
      else input.addAttributes({ checked: "" });
      syncCustomSummary();
      showToast(shouldClear ? "已取消默认勾选" : "已设置默认勾选");
    }

    function moveOption(option, direction) {
      const currentOptions = options();
      const optionIndex = currentOptions.indexOf(option);
      const neighbor = currentOptions[optionIndex + direction];
      const parent = option?.parent?.();
      if (!neighbor || !parent || neighbor.parent?.() !== parent) return;
      const collection = parent.components();
      const targetIndex = collection.indexOf(neighbor);
      collection.remove(option, { temporary: true });
      collection.add(option, { at: targetIndex });
      keepTargetActive();
      showToast(direction < 0 ? "选项已上移" : "选项已下移");
    }

    function keepTargetActive() {
      if (selected?.root) editor.select(selected.root);
    }

    function notifyOptionsChanged() {
      if (selected) onOptionsChanged(selected);
    }

    function addNativeOption(label, value) {
      const added = selected.content.append(`<option value="${escapeAttribute(value)}">${escapeAttribute(label)}</option>`);
      return Array.isArray(added) ? added[0] : added;
    }

    function addCustomOption(label, value) {
      const currentOptions = options();
      const template = currentOptions.at(-1);
      if (template) {
        const clone = template.clone();
        const cloneInput = optionInput(clone);
        cloneInput?.removeAttributes?.(["checked", "id"]);
        setOptionText(clone, label);
        setOptionValue(clone, value);
        const parent = template.parent?.();
        return parent?.components?.().add(clone, { at: parent.components().indexOf(template) + 1 });
      }

      const targetId = customTargetId();
      const targetAttribute = targetId ? ` data-target="${escapeAttribute(targetId)}"` : "";
      const handlerAttribute = targetId
        ? ` data-frameedit-handler-onchange="${escapeAttribute(`updateFilters('${targetId}')`)}"`
        : "";
      const added = selected.content.append(
        `<label class="checkbox-label"><input type="checkbox" class="filter-cb"${targetAttribute} value="${escapeAttribute(value)}"${handlerAttribute}/> ${escapeAttribute(label)}</label>`,
      );
      if (hasScripts()) showToast("已增加静态选项；此容器含脚本，请在最终预览检查是否被重新生成。", "warning");
      return Array.isArray(added) ? added[0] : added;
    }

    function addOption() {
      if (!selected) return;
      const number = options().length + 1;
      const label = `新选项 ${number}`;
      const value = `option-${number}`;
      const added = selected.kind === "native" ? addNativeOption(label, value) : addCustomOption(label, value);
      if (!added) {
        showToast("无法增加选项，请重新选择下拉框后再试。", "error");
        return;
      }
      keepTargetActive();
      notifyOptionsChanged();
      showToast("已增加一个选项");
      scheduleRender();
    }

    function removeOption(option) {
      if (!selected || !option) return;
      option.parent?.()?.components?.().remove(option);
      syncCustomSummary();
      keepTargetActive();
      notifyOptionsChanged();
      showToast("选项已删除");
      scheduleRender();
    }

    function removeLastOption() {
      removeOption(options().at(-1));
    }

    function duplicateOption(option) {
      const parent = option?.parent?.();
      if (!parent) return;
      const clone = option.clone();
      if (selected.kind === "native") clone.removeAttributes("selected");
      else optionInput(clone)?.removeAttributes?.(["checked", "id"]);
      parent.components().add(clone, { at: parent.components().indexOf(option) + 1 });
      keepTargetActive();
      notifyOptionsChanged();
      showToast("选项已复制");
    }

    function updateOptionFromInput(input) {
      if (!input) return;
      const row = input.closest("[data-option-index]");
      const option = options()[Number(row?.dataset.optionIndex)];
      if (!option) return;
      if (input.dataset.optionField === "label") setOptionText(option, input.value);
      if (input.dataset.optionField === "value") setOptionValue(option, input.value);
      notifyOptionsChanged();
    }

    list.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target.matches("input[data-option-field]")) event.target.blur();
    });
    list.addEventListener("input", (event) => updateOptionFromInput(event.target.closest("input[data-option-field]")));
    list.addEventListener("change", (event) => {
      updateOptionFromInput(event.target.closest("input[data-option-field]"));
      scheduleRender();
    });
    list.addEventListener("focusout", () => window.setTimeout(scheduleRender, 0));
    list.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-option-action]");
      if (!button) return;
      const row = button.closest("[data-option-index]");
      const option = options()[Number(row?.dataset.optionIndex)];
      if (!option) return;
      const action = button.dataset.optionAction;
      if (action === "default") setDefault(option);
      if (action === "up") moveOption(option, -1);
      if (action === "down") moveOption(option, 1);
      if (action === "duplicate") duplicateOption(option);
      if (action === "delete") removeOption(option);
      if (action === "default" || action === "up" || action === "down") notifyOptionsChanged();
      scheduleRender();
    });

    addButton.addEventListener("click", addOption);
    removeButton.addEventListener("click", removeLastOption);
    editor.on("component:update component:add component:remove component:move", scheduleRender);
    editor.UndoManager.getInstance()?.on("undo redo", () => {
      syncCustomSummary();
      scheduleRender();
    });

    return {
      update(component) {
        selected = resolveTarget(component);
        panel.hidden = !selected;
        if (selected) render();
      },
    };
  }

  global.FrameEditSelectOptions = Object.freeze({ create });
})(window);
