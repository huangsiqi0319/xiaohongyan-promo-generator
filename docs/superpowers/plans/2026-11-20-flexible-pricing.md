# Flexible Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 用获批的可编辑分区表格更新价目功能，保留原图库及用户数据。

**Architecture:** Design 增加可选 pricingTable，纯函数兼容旧 Price[]；独立编辑组件与纯测量布局模块，Canvas 共享实际测量结果进行预览与导出。保持本地持久化与当前 Pages 部署。

**Tech Stack:** React 19、TypeScript、Canvas、Vitest、Playwright；不新增依赖。

**Spec:** docs/superpowers/specs/2026-11-20-flexible-pricing-design.md

## Global Constraints

- 不接入云同步；仅更新价目功能。
- 用户最新视觉指示优先：原图库粉色背景、与课表共用暖灰字体和细线，不允许绿色色块或文字。
- 六张原图字节不改动，课程表与价目表无人像。
- 旧价格信息不得用演示金额覆盖；可选新字段保持旧存储/备份可读。
- 自动字号 30–22px；溢出提示且阻止导出；隐藏不删除数据。
- 本次用户已确认样稿并要求直接更新网站，原地执行，无额外实施方式确认。

## Review Focus

- 旧类别不连续、空价格或纯文字价格：内容完整迁移，无货币假设。
- 隐藏后再次开启：保留所有行值；删除/复制 ID 与单元格映射一致。
- 长表头、长赠品与窄列：真实测量高度；字符宽于列时禁止导出。
- 所有列或分区隐藏：空图合理提示，不崩溃、不留原分区空白。
- 异常新备份、隐藏信息的可访问预览：校验严格，预览只包含实际显示内容。

### Task 1: 数据与兼容

**Files:** src/types.ts, src/lib/pricing.ts, src/lib/model.ts; tests src/lib/pricing.test.ts。
**Interfaces:** getPricingTable(d: Design): PricingTable; createDemoPricing(): PricingTable; isPricingTable(value: unknown): boolean; duplicatePricing(table: PricingTable): PricingTable。
- [x] 写失败测试：旧 Price[] 全字段保留、隐藏保留值、默认三分区演示、非法 schema 拒绝、复制 ID/键独立、旧/新持久化往返。
- [x] 运行 `npm test -- src/lib/pricing.test.ts` 确认缺失行为失败。
- [x] 实现可选类型、纯兼容视图、校验与复制；更新默认新价目项目。
- [x] 运行单元测试通过并提交。

### Task 2: Canvas 表格测量与绘制

**Files:** src/lib/pricing-layout.ts, src/lib/render.ts; tests src/lib/pricing-layout.test.ts。
**Interfaces:** planPricing(d: Design, measure: (value:string,size:number,serif?:boolean)=>number, available:number): PricingPlan；返回文字/表头/横线相对位置、总高、字号与溢出信息。getPricingVisibleText(d): string[]。
- [x] 写失败测试：列关闭自动填宽、全隐藏、长表头/赠品高度、不可分字符、尺寸不足拒绝。
- [x] 运行对应测试确认缺少布局失败。
- [x] 实现纯布局和绘制；价目专用标题/货币/日期；保留原背景合成。
- [x] 运行单测及类型检查通过。

### Task 3: 编辑与保存整合

**Files:** src/components/PricingEditor.tsx, src/components/Editor.tsx, src/components/PosterPreview.tsx, src/styles.css; tests/pricing.e2e.ts。
**Interfaces:** PricingEditor({design,onChange}) 使用 getPricingTable；onChange 保存 pricingTable，不更改遗留 prices。预览语义文字使用可见内容。
- [x] 写浏览器失败测试：编辑表头/单元格、添加与隐藏列/分区、恢复内容、说明开关、刷新、复制与备份。
- [x] 运行对应测试确认新入口缺失失败。
- [x] 实现折叠分区编辑、列宽/开关/排序/增删、行和说明；移动布局不横向溢出。
- [x] 更新旧测试中已改变的新项目默认内容断言，保留原有行为检查；跑单测及浏览器回归。

### Task 4: 验收与发布

**Files:** README.md, docs/VALIDATION.md，必要回归测试；无新增部署服务。
- [x] 查看真实原图上的 1920/1440 价目与移动界面截图，验证开启/关闭后版面，不以 AI 样稿替代实际输出。
- [x] `npm test`、`npm run build -- --base=/xiaohongyan-promo-generator/`、`npm run test:e2e` 全通过。
- [x] 一次独立只读代码审查；重要发现补回归再修复。
- [ ] 更新使用说明与验证结果；提交，推 main，手动 Pages 工作流；核对 head_sha 与线上 JS/CSS hash。
- [ ] 用原网址交付，说明可见功能与实际限制。
