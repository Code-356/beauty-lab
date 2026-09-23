(function (global) {
  "use strict";

  // Serialized into the sandbox. Keep this function independent of outer scope.
  function frameRuntime(token, render) {
    const UI = '[data-beautylab-live-ui], [data-gjs-tools], .gjs-tools, .gjs-toolbar, .html2canvas-container';
    let busy = false;
    const deadline = (promise, ms, message) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
    });
    function measure(options) {
      const full = options.range === 'full';
      const root = document.documentElement, body = document.body;
      const width = Math.ceil(full ? Math.max(root.scrollWidth, body?.scrollWidth || 0, innerWidth) : innerWidth);
      const height = Math.ceil(full ? Math.max(root.scrollHeight, body?.scrollHeight || 0, innerHeight) : innerHeight);
      const scale = options.scale === 1 ? 1 : 2;
      const pixelWidth = width * scale, pixelHeight = height * scale;
      return { width, height, scale, pixelWidth, pixelHeight, x: full ? 0 : scrollX, y: full ? 0 : scrollY,
        tooLarge: pixelWidth > 16384 || pixelHeight > 16384 || pixelWidth * pixelHeight > 32000000 };
    }
    function pathFor(el) {
      const parts = [];
      while (el && el.nodeType === 1) {
        const siblings = el.parentElement ? Array.from(el.parentElement.children).filter(item => item.tagName === el.tagName) : [el];
        parts.unshift(`${el.localName}:nth-of-type(${siblings.indexOf(el) + 1})`);
        el = el.parentElement;
      }
      return parts.join(' > ');
    }
    async function capture(options) {
      if (busy) throw new Error('PNG 导出正在进行。');
      busy = true;
      let canvas;
      try {
        window.BeautyLabCommitDirectText?.();
        const warnings = [];
        const warn = (code, detail = '') => warnings.push({ code, detail });
        try { await deadline(document.fonts.ready, 8000, 'fonts'); }
        catch (_) { warn('fonts'); }
        if (Array.from(document.fonts).some(font => font.status === 'error')) warn('fonts');
        const images = Array.from(document.images).filter(el => !el.closest(UI));
        await Promise.all(images.map(async image => {
          if (!image.complete) {
            try { await deadline(image.decode(), 8000, 'image'); } catch (_) { /* Report below. */ }
          }
        }));
        const size = measure(options);
        if (size.tooLarge) throw new Error('图片尺寸超限，请选择 1 倍或当前画布。');

        // Resolve accessible images ourselves so renderer failures cannot silently omit them.
        const urls = new Set(), badImages = new Set(), backgroundNodes = [];
        images.forEach((image, index) => {
          if (!image.naturalWidth) { badImages.add(index); warn('image', image.getAttribute('src') || image.alt); }
          else if (image.currentSrc || image.src) urls.add(image.currentSrc || image.src);
        });
        Array.from(document.querySelectorAll('*')).forEach((el, index) => {
          if (el.closest(UI)) return;
          for (const pseudo of [null, '::before', '::after']) {
            const style = getComputedStyle(el, pseudo);
            const matches = Array.from(style.backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g));
            if (matches.length) {
              backgroundNodes.push({ index, path: pathFor(el), pseudo, value: style.backgroundImage });
              matches.forEach(match => urls.add(new URL(match[1], document.baseURI).href));
            }
            if (style.filter !== 'none' || (style.backdropFilter && style.backdropFilter !== 'none')) warn('effects');
          }
        });
        const encoded = new Map();
        await Promise.all(Array.from(urls).map(async url => {
          try {
            const image = new Image();
            if (!url.startsWith('data:') && !url.startsWith('blob:')) image.crossOrigin = 'anonymous';
            image.src = url;
            await deadline(image.decode(), 8000, 'image');
            const buffer = document.createElement('canvas');
            buffer.width = image.naturalWidth; buffer.height = image.naturalHeight;
            buffer.getContext('2d').drawImage(image, 0, 0);
            encoded.set(url, buffer.toDataURL('image/png'));
            buffer.width = buffer.height = 0;
          } catch (_) { encoded.set(url, null); warn('image', url); }
        }));
        const canvasImages = Array.from(document.querySelectorAll('canvas')).map((node, index) => {
          try { const data = node.toDataURL('image/png'); if (data === 'data:,') throw Error(); return data; }
          catch (_) { warn('canvas', String(index + 1)); return null; }
        });
        if (document.querySelector('iframe, object, embed')) warn('embedded');
        if (document.querySelector('video')) warn('video');
        const uniqueWarnings = Array.from(new Map(warnings.map(item => [item.code + item.detail, item])).values());
        if (uniqueWarnings.length && !options.allowIncomplete) return { ...size, warnings: uniqueWarnings };

        const renderOptions = {
          x: size.x, y: size.y, width: size.width, height: size.height, scale: size.scale,
          windowWidth: innerWidth, windowHeight: innerHeight,
          scrollX: size.x, scrollY: size.y, backgroundColor: '#ffffff',
          useCORS: true, allowTaint: false, logging: false, imageTimeout: 8000,
          ignoreElements: node => node.matches?.(UI),
          onclone: clone => {
            // Use a clone only: do not disturb author DOM, selection, animations or undo history.
            const style = clone.createElement('style');
            style.textContent = '.beautylab-live-selected,.beautylab-live-hover,.gjs-selected,.gjs-hovered,.gjs-selected-parent{outline:none!important;}*{caret-color:transparent!important;}';
            clone.head.append(style);
            clone.querySelectorAll('.gjs-dashed').forEach(node => node.classList.remove('gjs-dashed'));
            Array.from(clone.images).filter(el => !el.closest(UI)).forEach((image, index) => {
              const original = images[index];
              const value = original && encoded.get(original.currentSrc || original.src);
              image.removeAttribute('srcset'); image.removeAttribute('loading');
              if (badImages.has(index) || value === null) image.style.visibility = 'hidden';
              else if (value) image.src = value;
            });
            backgroundNodes.forEach(({ index, path, pseudo, value }) => {
              const target = clone.querySelector(path);
              if (!target) return;
              const next = value.replace(/url\(["']?(.*?)["']?\)/g, (match, src) => {
                const data = encoded.get(new URL(src, document.baseURI).href);
                return data ? `url("${data}")` : 'none';
              });
              if (!pseudo) target.style.backgroundImage = next;
              else {
                target.setAttribute('data-beautylab-png-node', String(index));
                const rule = clone.createElement('style');
                rule.textContent = `[data-beautylab-png-node="${index}"]${pseudo}{background-image:${next}!important}`;
                clone.head.append(rule);
              }
            });
            clone.querySelectorAll('canvas').forEach((node, index) => {
              const data = canvasImages[index];
              if (!data) { node.style.visibility = 'hidden'; return; }
              const image = clone.createElement('img');
              Array.from(node.attributes).forEach(attr => image.setAttribute(attr.name, attr.value));
              image.width = node.width; image.height = node.height; image.src = data;
              node.replaceWith(image);
            });
            // html2canvas's native text-input painter can clip the baseline in short fields.
            // Render text controls as equivalent inert boxes in the clone only.
            Array.from(document.querySelectorAll('input,textarea'), original => ({ original, copy: clone.querySelector(pathFor(original)) })).forEach(({ original, copy }) => {
              if (original.closest(UI) || (original.tagName === 'INPUT' && !['text','search','email','url','tel','password','number'].includes(original.type))) return;
              if (!copy) return;
              const box = clone.createElement('div'), computed = getComputedStyle(original);
              Array.from(original.attributes).forEach(attr => box.setAttribute(attr.name, attr.value));
              for (const name of computed) box.style.setProperty(name, computed.getPropertyValue(name));
              box.style.display = computed.display === 'none' ? 'none' : 'inline-flex';
              box.style.flexDirection = 'column'; box.style.justifyContent = original.tagName === 'INPUT' ? 'center' : 'flex-start';
              box.style.whiteSpace = original.tagName === 'INPUT' ? 'pre' : 'pre-wrap';
              box.style.overflow = 'hidden'; box.style.lineHeight = 'normal';
              box.textContent = original.type === 'password' ? '•'.repeat(original.value.length) : original.value || original.getAttribute('placeholder') || '';
              copy.replaceWith(box);
            });
            const embedded = Array.from(document.querySelectorAll('iframe,object,embed,video')).filter(node => !node.closest(UI));
            Array.from(clone.querySelectorAll('iframe,object,embed,video')).filter(node => !node.closest(UI)).forEach((node, index) => {
              const placeholder = clone.createElement('div'), original = embedded[index];
              if (original) {
                const computed = getComputedStyle(original);
                for (const name of computed) placeholder.style.setProperty(name, computed.getPropertyValue(name));
              }
              placeholder.style.visibility = 'hidden'; node.replaceWith(placeholder);
            });
          },
        };
        if (options.snapshot) {
          // Unique-origin sandbox frames cannot access html2canvas's nested clone iframe.
          // Freeze their current DOM; the host renders it in a script-disabled frame.
          const clone = document.implementation.createHTMLDocument('PNG');
          clone.replaceChild(document.documentElement.cloneNode(true), clone.documentElement);
          const originals = Array.from(document.querySelectorAll('*'));
          const copies = Array.from(clone.querySelectorAll('*'));
          const pseudoStyles = [];
          originals.forEach((original, index) => {
            const copy = copies[index];
            if (!copy || /^(SCRIPT|STYLE|LINK|META|HEAD|TITLE|BASE)$/.test(original.tagName) || original.closest(UI)) return;
            const computed = getComputedStyle(original);
            for (const name of computed) copy.style.setProperty(name, computed.getPropertyValue(name));
            copy.style.animation = 'none'; copy.style.transition = 'none';
            if (original.matches('.beautylab-live-selected,.beautylab-live-hover')) copy.style.outline = 'none';
            if (original.matches('input')) { copy.setAttribute('value', original.value); copy.toggleAttribute('checked', original.checked); }
            if (original.matches('textarea')) copy.textContent = original.value;
            if (original.matches('option')) copy.toggleAttribute('selected', original.selected);
            for (const pseudo of ['::before','::after']) {
              const computedPseudo = getComputedStyle(original, pseudo);
              if (!computedPseudo.content || ['none','normal'].includes(computedPseudo.content)) continue;
              copy.setAttribute('data-beautylab-png-pseudo', String(index));
              const declarations = Array.from(computedPseudo, name => `${name}:${computedPseudo.getPropertyValue(name)};`).join('');
              pseudoStyles.push(`[data-beautylab-png-pseudo="${index}"]${pseudo}{${declarations}animation:none;transition:none;}`);
            }
          });
          // Freeze dynamically inserted stylesheet rules and custom fonts too.
          Array.from(document.querySelectorAll('style')).forEach((original, index) => {
            try { clone.querySelectorAll('style')[index].textContent = Array.from(original.sheet.cssRules, rule => rule.cssText).join('\n'); } catch (_) {}
          });
          const pseudoStyle = clone.createElement('style'); pseudoStyle.textContent = pseudoStyles.join('\n'); clone.head.append(pseudoStyle);
          renderOptions.onclone(clone);
          clone.querySelectorAll(UI).forEach(node => node.remove());
          clone.querySelectorAll('script,base,meta[http-equiv],link[rel="preload"],link[rel="modulepreload"]').forEach(node => node.remove());
          clone.querySelectorAll('*').forEach(node => Array.from(node.attributes).forEach(attr => {
            if (/^on/i.test(attr.name) || attr.name === 'srcdoc') node.removeAttribute(attr.name);
          }));
          const base = clone.createElement('base'); base.href = document.baseURI; clone.head.prepend(base);
          return { ...size, viewportWidth: innerWidth, viewportHeight: innerHeight, warnings: uniqueWarnings, html: '<!doctype html>\n' + clone.documentElement.outerHTML };
        }
        canvas = await deadline(render(document.documentElement, renderOptions), 25000, 'PNG 导出超时，请重试。');
        const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG 生成失败，请重试。')), 'image/png'));
        return { ...size, warnings: uniqueWarnings, blob };
      } finally {
        if (canvas) canvas.width = canvas.height = 0;
        document.querySelectorAll('.html2canvas-container').forEach(node => node.remove());
        busy = false;
      }
    }
    async function renderSnapshot(snapshot) {
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-same-origin');
      frame.setAttribute('data-beautylab-live-ui', 'png-snapshot');
      frame.style.cssText = `position:fixed;left:-100000px;top:0;border:0;width:${snapshot.viewportWidth}px;height:${snapshot.viewportHeight}px;visibility:hidden;pointer-events:none;`;
      let output;
      try {
        const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
        frame.srcdoc = snapshot.html; document.body.append(frame);
        await deadline(loaded, 12000, 'PNG 导出超时，请重试。');
        const doc = frame.contentDocument;
        await deadline(doc.fonts.ready, 8000, 'PNG 导出超时，请重试。');
        output = await deadline(render(doc.documentElement, {
          x: snapshot.x, y: snapshot.y, width: snapshot.width, height: snapshot.height, scale: snapshot.scale,
          windowWidth: snapshot.viewportWidth, windowHeight: snapshot.viewportHeight,
          scrollX: snapshot.x, scrollY: snapshot.y, backgroundColor: '#ffffff',
          logging: false, useCORS: true, allowTaint: false, imageTimeout: 8000,
        }), 25000, 'PNG 导出超时，请重试。');
        const blob = await new Promise((resolve, reject) => output.toBlob(value => value ? resolve(value) : reject(Error('PNG 生成失败，请重试。')), 'image/png'));
        return { ...snapshot, html: undefined, blob };
      } finally { if (output) output.width = output.height = 0; frame.remove(); }
    }
    window.BeautyLabPngRuntime = { measure, capture, renderSnapshot };
    window.addEventListener('message', async event => {
      const data = event.data;
      if (event.source !== parent || !data || data.token !== token || data.type !== 'beautylab-png-request') return;
      try {
        const result = data.action === 'measure' ? measure(data.options || {}) : await capture(data.options || {});
        parent.postMessage({ type: 'beautylab-png-result', token, requestId: data.requestId, result }, '*');
      } catch (error) {
        parent.postMessage({ type: 'beautylab-png-result', token, requestId: data.requestId, error: String(error.message || error) }, '*');
      }
    });
  }

  function source(token) {
    return `(function(){var module, exports, define;var previous=window.html2canvas;\n${global.BeautyLabPngRendererSource}\nvar renderer=window.html2canvas;window.html2canvas=previous;(${frameRuntime.toString()})(${JSON.stringify(token)},renderer);})();`;
  }
  function inject(documentNode, token) {
    const script = documentNode.createElement('script');
    script.setAttribute('data-beautylab-png-bridge', '');
    script.textContent = source(token);
    documentNode.body.append(script);
  }

  function create({ getTarget, getEpoch, getFileName, flush, notify, closeMenu, t }) {
    const $ = id => document.getElementById(id);
    const dialog = $('png-dialog'), range = $('png-range'), scale = $('png-scale');
    const button = $('png-download'), status = $('png-status'), sizeLabel = $('png-size');
    const warningsList = $('png-warnings'), incomplete = $('png-incomplete');
    let busy = false, generation = 0, context = null, measureGeneration = 0;
    function same(target) {
      const current = getTarget();
      return current?.frame === target.frame && current.token === target.token && getEpoch() === context?.epoch;
    }
    async function request(target, action, options) {
      if (target.direct) {
        const doc = target.frame.contentDocument;
        if (!doc?.defaultView.BeautyLabPngRuntime) inject(doc, 'standard');
        return doc.defaultView.BeautyLabPngRuntime[action](options);
      }
      return new Promise((resolve, reject) => {
        const requestId = crypto.randomUUID();
        const cleanup = () => { clearTimeout(timer); window.removeEventListener('message', receive); };
        const timer = setTimeout(() => { cleanup(); reject(new Error(t('PNG 导出超时，请重试。'))); }, 45000);
        function receive(event) {
          const data = event.data;
          if (event.source !== target.frame.contentWindow || data?.type !== 'beautylab-png-result' || data.token !== target.token || data.requestId !== requestId) return;
          cleanup();
          if (data.error) reject(new Error(t(data.error))); else resolve(data.result);
        }
        window.addEventListener('message', receive);
        target.frame.contentWindow.postMessage({ type: 'beautylab-png-request', token: target.token, requestId, action, options: { ...options, snapshot: true } }, '*');
      });
    }
    const options = () => ({ range: range.value, scale: Number(scale.value), allowIncomplete: incomplete.checked });
    function warningText(item) {
      const labels = { image: '图片或背景无法读取', canvas: 'Canvas 无法读取', embedded: '嵌入页面无法导出', video: '视频无法导出', fonts: '部分字体未能载入', effects: '滤镜效果可能无法完整还原' };
      return t(labels[item.code] || item.code) + (item.detail ? `: ${item.detail.slice(0, 180)}` : '');
    }
    async function updateSize() {
      const current = ++measureGeneration;
      warningsList.replaceChildren(); incomplete.checked = false; $('png-incomplete-label').hidden = true;
      button.disabled = true;
      try {
        if (!context || !same(context.target)) throw new Error(t('文件已切换，请重试当前操作。'));
        const result = await request(context.target, 'measure', options());
        if (current !== measureGeneration || !dialog.open) return;
        sizeLabel.textContent = `${result.pixelWidth} × ${result.pixelHeight} px`;
        status.textContent = result.tooLarge ? t('图片尺寸超限，请选择 1 倍或当前画布。') : '';
        button.disabled = result.tooLarge || busy;
      } catch (error) { if (current === measureGeneration) status.textContent = error.message; }
    }
    async function open() {
      closeMenu();
      const target = getTarget();
      if (!target) { notify(t('页面尚未就绪，请稍后重试。')); return; }
      if (busy) { notify(t('PNG 导出正在进行。')); return; }
      flush(); context = { target, epoch: getEpoch() };
      range.value = 'viewport'; scale.value = '2'; status.textContent = '';
      dialog.showModal(); await updateSize();
    }
    function close() { generation++; measureGeneration++; dialog.close(); }
    $('png-close').addEventListener('click', close);
    dialog.addEventListener('cancel', () => { generation++; measureGeneration++; });
    range.addEventListener('change', updateSize); scale.addEventListener('change', updateSize);
    button.addEventListener('click', async () => {
      if (busy || !context) return;
      const current = ++generation, target = context.target;
      busy = true; button.disabled = range.disabled = scale.disabled = true;
      status.textContent = t('正在生成 PNG…');
      try {
        flush();
        if (!same(target)) throw new Error(t('文件已切换，请重试当前操作。'));
        let result = await request(target, 'capture', options());
        if (current !== generation || !dialog.open) return;
        if (!same(target)) throw new Error(t('文件已切换，请重试当前操作。'));
        if (result.html) {
          if (!window.BeautyLabPngRuntime) inject(document, 'host');
          result = await window.BeautyLabPngRuntime.renderSnapshot(result);
          if (current !== generation || !dialog.open) return;
          if (!same(target)) throw new Error(t('文件已切换，请重试当前操作。'));
        }
        if (!result.blob) {
          warningsList.replaceChildren(...result.warnings.map(item => { const li = document.createElement('li'); li.textContent = warningText(item); return li; }));
          $('png-incomplete-label').hidden = false;
          status.textContent = t('部分内容无法完整导出。勾选下方选项后可继续。');
          return;
        }
        const name = getFileName().replace(/\.html?$/i, '') + (range.value === 'full' ? '-full' : '-canvas') + '.png';
        const url = URL.createObjectURL(result.blob), a = document.createElement('a');
        a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        close(); notify(t('PNG 已导出'));
      } catch (error) { if (current === generation) status.textContent = t(error.message); }
      finally { busy = false; button.disabled = range.disabled = scale.disabled = false; }
    });
    return { open };
  }
  global.BeautyLabPng = { inject, create };
})(window);
