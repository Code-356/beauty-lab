# 更新日志 / Changelog

## v1.10 — 2026-09-23

### 修复 / Fixed

- 编辑文字时，空格和其他键盘事件不再触发原 HTML 的翻页或快捷键。保留正常文字输入、删除、方向键、复制粘贴、文字撤销及中文输入法；预览模式和导出的 HTML 继续使用原页面快捷键。
- Editing text no longer triggers the original HTML's navigation or keyboard shortcuts. Normal typing, deletion, cursor movement, clipboard actions, native text undo and IME composition are preserved. Preview and exported HTML retain the original shortcuts.

### 新增 / Added

- “更多操作 → 导出 PNG”：支持当前画布和完整长图，1 倍或 2 倍清晰度，默认当前画布、2 倍。导出像素尺寸独立于编辑器显示比例。
- More actions → Export PNG supports the current canvas or full document at 1× or 2× resolution. The default is current canvas at 2×; pixel dimensions are independent of editor zoom.
- 导出前提交正在编辑的文字，保留当前幻灯片、滚动位置和动态内容；不清除 HTML 未保存标记。取消或切换文件时阻止旧结果下载，重复点击只生成一个下载。
- Export commits pending text and preserves the current slide, scroll position and dynamic content without clearing the HTML unsaved indicator. Cancellation or document changes prevent stale downloads; repeated clicks produce one download.
- 新增资源缺失提示及显式继续选项；图片单边最多 16,384 像素、总计最多 3,200 万像素，超限时提示降低倍率或改为当前画布。
- Added missing-resource warnings with an explicit option to continue. Images are limited to 16,384 pixels per side and 32 million pixels total; oversized exports require a lower resolution or current-canvas scope.

### 更新及验证 / Updated and validated

- 同步中英文使用指南、应用内更新日志、离线包及网站缓存版本。PNG 渲染依赖 html2canvas 1.4.1（MIT）随应用本地打包。
- Updated the bilingual guide, in-app changelog, offline package and website cache version. html2canvas 1.4.1 (MIT) is bundled locally.
- 已验证网站、单文件和离线文件夹的键盘输入及 PNG 导出，覆盖标准和实时编辑、预览、长图、像素尺寸、资源失败、跨域 Canvas、取消、切换文件、重复点击和网站离线使用；现有 HTML 导出、重新导入与默认图层状态回归通过。
- Validated keyboard input and PNG export in the website, standalone file and offline folder, including both editing engines, Preview, full documents, pixel dimensions, resource failures, tainted canvases, cancellation, document switching, repeated clicks and offline website use. Existing HTML export/reimport and collapsed-layer checks passed.

### 已知范围 / Limitations

- 长图包含文档可滚动区域，不自动翻到隐藏幻灯片，也不展开内部滚动面板。复杂 CSS、滤镜和第三方嵌入不能保证与浏览器截图逐像素一致；跨域限制、视频或字体加载失败会提示。
- Full-document export includes document overflow without advancing hidden slides or expanding nested scrolling panels. Complex CSS, filters and third-party embeds may differ from browser screenshots. Cross-origin restrictions, video and failed fonts produce warnings.

## v1.9 — 2026-09-07

- 编辑与预览共享显示比例及页面尺寸；新增本地草稿、历史恢复与基础对象工具；改进样式保真、交互/静态导出；打开或恢复文档时默认收起图层。
- Added shared Edit/Preview zoom and page dimensions, local drafts and history, and basic object tools; improved style fidelity and interactive/static exports; layers start collapsed when opening or restoring a document.
