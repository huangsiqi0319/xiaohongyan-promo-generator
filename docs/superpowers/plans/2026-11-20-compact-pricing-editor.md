# Compact Pricing Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 按用户确认的构图缩短价目编辑页，保留网站外观和现有成图。

**Architecture:** 抽出已有折叠/操作控件，新增紧凑价格数据表和行附加信息弹窗。App 仅增加手机快捷滚动导航，复用现有真实预览。

**Tech Stack:** React/TypeScript、现有 CSS、UtilityDialog、Playwright/Vitest，无新增依赖。

**Spec:** docs/superpowers/specs/2026-11-20-compact-pricing-editor-design.md

## Global Constraints

- 不改模板绘制、图片、数据结构或任何既有颜色、字体与边框。
- 只在表格内部左右滚动，320px 宽度也不得整页横向溢出。
- 保留显示、编辑、排序、删除、赠品、备注和已有本地保存。
- 用户已确认样稿并指示照此布局做，直接在当前 work 分支实施、测试、发布原网站。

## Review Focus

- 删除/重排首列后，单元格数据按ID关联，不随表头错位。
- 弹窗和操作菜单不会被水平滚动容器截断；键盘关闭后还能继续编辑。
- 隐藏列仍可修改，显示/宽度/名称在窄屏同排。
- 手机预览按钮固定且不遮挡最后一个编辑项，返回时保留滚动和展开状态。
- 颜色、字体、边框及 PNG 不发生变化。

### Task 1: 紧凑价目编辑区

**Files:** src/components/PricingControls.tsx（从原组件提取）、PricingRowsEditor.tsx（新增）、PricingEditor.tsx、src/styles.css；tests/compact-pricing.e2e.ts。
**Interfaces:** PricingRowsEditor({section,prefix,onChange})；Actions({label,index,total,move,remove,onDetails?})；Fold/Toggle/moved 保持既有行为。
- [x] 保存修改前 PNG、computed styles 与设计；写浏览器失败测试同排、内滚动、单元格保存和菜单操作。
- [x] 运行测试确认原布局失败；提取控件、实现单排设置和数据表、默认折叠的赠品附注。
- [x] 更新原回归测试的交互入口，保持相同数据/导出断言；验证功能与样式一致。

### Task 2: 手机预览导航

**Files:** src/App.tsx、src/styles.css；tests/compact-pricing.e2e.ts。
**Interfaces:** App 记录 window.scrollY 并对既有 .preview-toolbar 快捷定位，返回后复原；价格编辑页专用手机底栏。
- [x] 写失败测试按钮始终可见、画布到达、返回原位置与数据保留。
- [x] 实现固定底栏与导航，不修改 PosterPreview 的渲染和导出。
- [x] 320/390/430px 验证、PNG 与基准逐字节比较、样式对比。

### Task 3: 验证与交付

**Files:** README.md、docs/VALIDATION.md；不新增外部服务。
- [x] npm test、Pages 子路径生产构建、npm run test:e2e 全通过；查看真实手机编辑与预览截图。
- [x] 一次独立只读审查，重要发现以回归测试修复。
- [x] 提交推送、手动 Pages 工作流、线上资产核对后使用原网址交付。
