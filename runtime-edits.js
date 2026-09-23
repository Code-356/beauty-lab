(function initRuntimeEdits(global) {
  "use strict";
  const PAYLOAD_ID = "beautylab-edit-document";

  function runtime(initial, editing) {
    const excluded = 'script,[data-beautylab-live-ui],[data-beautylab-live-style],[data-beautylab-object-ui],.html2canvas-container';
    const nativeClass = (value) => String(value || "").split(/\s+/).filter((name) => name && !/^beautylab-live-(selected|hover)$/.test(name)).join(" ");
    const allowed = (node) => node.nodeType === 3 || (node.nodeType === 1 && !node.matches(excluded));
    const children = (node) => Array.from(node.childNodes).filter(allowed);
    const attrs = (node) => Object.fromEntries(Array.from(node.attributes).flatMap(({ name, value }) => {
      if (/^data-beautylab-live-|^data-frameedit-|^data-gjs-/.test(name)) return [];
      if (name === "class") value = nativeClass(value);
      return value || name !== "class" ? [[name, value]] : [];
    }));
    const transactions = Array.isArray(initial?.transactions) ? initial.transactions.slice() : [];
    let pointer = transactions.length;
    let pending = null;
    let replaying = false;

    function fingerprint(node) {
      return JSON.stringify({
        text: Array.from(node.childNodes).filter((child) => child.nodeType === 3).map((child) => child.nodeValue).join('').trim().slice(0, 200),
        children: Array.from(node.children).filter(allowed).map((child) => child.tagName).join(','),
        name: node.getAttribute('name') || '',
        type: node.getAttribute('type') || '',
      });
    }

    function describe(node) {
      if (node.nodeType === 3) return { parent: describe(node.parentNode), textIndex: Array.from(node.parentNode.childNodes).filter((item) => item.nodeType === 3).indexOf(node), text: node.nodeValue };
      const path = [];
      let current = node;
      while (current && current !== document.body) {
        const parent = current.parentElement;
        if (!parent) break;
        path.unshift(Array.from(parent.children).filter(allowed).indexOf(current));
        current = parent;
      }
      return {
        path,
        tag: node.tagName,
        id: node.id && document.querySelectorAll(`[id="${CSS.escape(node.id)}"]`).length === 1 ? node.id : "",
        runtimeId: node.getAttribute("data-beautylab-runtime-id") || "",
        fingerprint: fingerprint(node),
      };
    }

    function find(ref) {
      if (!ref) return null;
      if (ref.parent) {
        const parent = find(ref.parent);
        const node = parent ? Array.from(parent.childNodes).filter((node) => node.nodeType === 3)[ref.textIndex] || null : null;
        return node && (ref.text === undefined || node.nodeValue === ref.text) ? node : null;
      }
      let node = ref.id ? document.getElementById(ref.id) : null;
      if (ref.id) return node?.tagName === ref.tag ? node : null;
      if (!node && ref.runtimeId) node = Array.from(document.querySelectorAll('[data-beautylab-runtime-id]')).find((item) => item.getAttribute('data-beautylab-runtime-id') === ref.runtimeId);
      if (!node) {
        node = (ref.path || []).reduce((parent, index) => parent && Array.from(parent.children).filter(allowed)[index], document.body);
        if (node && ref.fingerprint && fingerprint(node) !== ref.fingerprint) return null;
      }
      return node?.tagName === ref.tag ? node : null;
    }

    function snapshot() {
      const map = new Map();
      let next = 0;
      const visit = (node) => {
        if (!allowed(node)) return;
        const entry = { key: String(next++), ref: describe(node), parent: node.parentNode, children: children(node) };
        if (node.nodeType === 3) entry.text = node.nodeValue;
        else entry.attrs = attrs(node);
        map.set(node, entry);
        entry.children.forEach(visit);
      };
      visit(document.body);
      return map;
    }

    function markup(node) {
      if (node.nodeType === 3) return { text: node.nodeValue };
      const clone = node.cloneNode(false);
      [clone, ...clone.querySelectorAll('*')].forEach((element) => {
        if (element !== clone && element.matches(excluded)) { element.remove(); return; }
        const clean = attrs(element);
        Array.from(element.attributes).forEach(({ name }) => element.removeAttribute(name));
        Object.entries(clean).forEach(([name, value]) => element.setAttribute(name, value));
      });
      return { html: clone.outerHTML };
    }

    function styleDiff(before, after) {
      const left = document.createElement('span').style;
      const right = document.createElement('span').style;
      left.cssText = before || '';
      right.cssText = after || '';
      return Object.fromEntries([...new Set([...left, ...right])].flatMap((name) => {
        const value = right.getPropertyValue(name);
        const priority = right.getPropertyPriority(name);
        return value === left.getPropertyValue(name) && priority === left.getPropertyPriority(name) ? [] : [[name, [value, priority]]];
      }));
    }

    function diff(before, after) {
      const patch = { targets: {}, inserts: {}, removes: [], orders: [], changes: [] };
      const use = (node) => {
        const entry = before.get(node);
        if (entry) { patch.targets[entry.key] = entry.ref; return entry.key; }
        const key = `new-${after.get(node).key}`;
        patch.inserts[key] = markup(node);
        return key;
      };
      before.forEach((entry, node) => {
        const next = after.get(node);
        if (!next) {
          if (after.has(entry.parent)) patch.removes.push(use(node));
          return;
        }
        if (node.nodeType === 3) {
          if (entry.text !== next.text) patch.changes.push({ target: use(node), text: next.text });
          return;
        }
        const changed = {};
        const styles = styleDiff(entry.attrs.style, next.attrs.style);
        new Set([...Object.keys(entry.attrs), ...Object.keys(next.attrs)]).forEach((name) => {
          if (name !== 'style' && entry.attrs[name] !== next.attrs[name]) changed[name] = next.attrs[name] ?? null;
        });
        if (Object.keys(changed).length || Object.keys(styles).length) patch.changes.push({ target: use(node), attrs: changed, styles });
        if (entry.children.length !== next.children.length || entry.children.some((child, index) => child !== next.children[index])) {
          patch.orders.push({ parent: use(node), children: next.children.map(use) });
        }
      });
      after.forEach((entry, node) => {
        if (!before.has(node) && entry.children.length) patch.orders.push({ parent: use(node), children: entry.children.map(use) });
      });
      return patch;
    }

    function begin() {
      if (!editing || replaying || pending) return;
      pending = snapshot();
    }

    function commit() {
      const patch = pending ? diff(pending, snapshot()) : { targets: {}, inserts: {}, removes: [], orders: [], changes: [] };
      pending = null;
      transactions.splice(pointer);
      transactions.push(patch);
      pointer = transactions.length;
      replayIndex = pointer;
    }

    function apply(patch) {
      const resolved = new Map(Object.entries(patch.targets || {}).map(([key, ref]) => [key, find(ref)]));
      if ([...resolved.values()].some((node) => !node)) return false;
      Object.entries(patch.inserts || {}).forEach(([key, value]) => {
        if ('text' in value) resolved.set(key, document.createTextNode(value.text));
        else {
          const template = document.createElement('template');
          template.innerHTML = value.html;
          resolved.set(key, template.content.firstChild);
        }
      });
      (patch.changes || []).forEach((change) => {
        const node = resolved.get(change.target);
        if ('text' in change) node.nodeValue = change.text;
        Object.entries(change.attrs || {}).forEach(([name, value]) => value == null ? node.removeAttribute(name) : node.setAttribute(name, value));
        Object.entries(change.styles || {}).forEach(([name, [value, priority]]) => value ? node.style.setProperty(name, value, priority) : node.style.removeProperty(name));
      });
      (patch.removes || []).forEach((key) => resolved.get(key)?.remove());
      (patch.orders || []).forEach((order) => {
        const parent = resolved.get(order.parent);
        order.children.forEach((key) => parent.appendChild(resolved.get(key)));
      });
      return true;
    }

    function viewState() {
      return {
        bodyClass: nativeClass(document.body.className),
        forms: Array.from(document.querySelectorAll('input:not([type=file]),textarea,select,details')).map((node) => ({
          ref: describe(node), value: 'value' in node ? node.value : undefined,
          checked: 'checked' in node ? node.checked : undefined,
          selected: node.options ? Array.from(node.options, (option) => option.selected) : undefined,
          open: 'open' in node ? node.open : undefined,
        })),
        scrollX: window.scrollX, scrollY: window.scrollY,
      };
    }

    let replayIndex = 0;
    let restored = false;
    let scheduled = false;
    const restore = () => {
      scheduled = false;
      replaying = true;
      try {
        while (replayIndex < pointer && apply(transactions[replayIndex])) replayIndex += 1;
        if (replayIndex === pointer && !restored) {
          const state = initial?.viewState;
          if (state) {
            document.body.className = state.bodyClass || '';
            (state.forms || []).forEach((record) => {
              const node = find(record.ref);
              if (!node) return;
              if (record.value !== undefined && 'value' in node) node.value = record.value;
              if (record.checked !== undefined && 'checked' in node) node.checked = record.checked;
              if (record.open !== undefined && 'open' in node) node.open = record.open;
              if (record.selected && node.options) Array.from(node.options).forEach((option, index) => { option.selected = Boolean(record.selected[index]); });
            });
            window.scrollTo(state.scrollX || 0, state.scrollY || 0);
          }
          restored = true;
          observer.disconnect();
        }
      } finally { replaying = false; }
    };
    const observer = new MutationObserver(() => {
      if (!scheduled && !restored) { scheduled = true; setTimeout(restore, 0); }
    });
    const start = () => {
      observer.observe(document.body, { childList: true, subtree: true });
      restore();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
    window.addEventListener('load', restore, { once: true });
    // Later framework rerenders are deliberately outside the author-edit replay contract.
    setTimeout(() => observer.disconnect(), 30000);
    if (editing) window.BeautyLabRuntimeEdits = {
      begin, commit, cancel: () => { pending = null; },
      undo: () => { pending = null; pointer = Math.max(0, pointer - 1); replayIndex = pointer; },
      redo: () => { pending = null; pointer = Math.min(transactions.length, pointer + 1); replayIndex = pointer; },
      capture: () => ({ transactions: transactions.slice(0, pointer), viewState: viewState(), pendingReplay: pointer - replayIndex }),
    };
  }

  function extract(html) {
    const documentNode = new DOMParser().parseFromString(html, 'text/html');
    const node = documentNode.querySelector(`script#${PAYLOAD_ID}[type="application/json"]`);
    if (!node) return null;
    try {
      const data = JSON.parse(node.textContent);
      return data.version === 1 && typeof data.baseHtml === 'string' && Array.isArray(data.edits?.transactions) ? data : null;
    } catch { return null; }
  }

  function inject(baseHtml, edits = {}, editing = false, settings = null) {
    const documentNode = new DOMParser().parseFromString(baseHtml, 'text/html');
    documentNode.querySelectorAll(`script#${PAYLOAD_ID},script[data-beautylab-edit-replay],script[data-beautylab-edit-collector]`).forEach((node) => node.remove());
    const script = documentNode.createElement('script');
    script.setAttribute(editing ? 'data-beautylab-edit-collector' : 'data-beautylab-edit-replay', '');
    script.textContent = `(${runtime.toString()})(${JSON.stringify(edits).replaceAll('<', '\\u003c')},${editing});`;
    documentNode.body.append(script);
    if (!editing) {
      const data = documentNode.createElement('script');
      data.id = PAYLOAD_ID;
      data.type = 'application/json';
      data.textContent = JSON.stringify({ version: 1, baseHtml, edits, settings }).replaceAll('<', '\\u003c');
      documentNode.body.append(data);
    }
    return '<!doctype html>\n' + documentNode.documentElement.outerHTML;
  }

  global.BeautyLabRuntimeEdits = { extract, prepareHtml: (html, edits) => inject(html, edits, true), exportHtml: (html, edits, settings) => inject(html, edits, false, settings) };
})(window);
