# 小鸿雁宣传物料生成器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现无需账号、可复用、可高清导出的品牌物料编辑工具。

**Architecture:** React 管理编辑状态；纯函数管理项目和布局；Canvas 统一预览与导出；localStorage 保存文本项目，IndexedDB 保存图片。

**Tech Stack:** React, TypeScript, Vite, Canvas 2D, Vitest, Playwright, Noto Serif SC / Sans SC (OFL).

**Spec:** `docs/superpowers/specs/2026-11-10-material-generator-design.md`

## Global Constraints
- 保留原背景，不生成替代图；原图未落盘需如实报告。
- 课程与价目模板禁止人物；所有初始价格与课程标注演示。
- 1080 × 1920 / 1440 / 1080；中文最低可读字号，溢出不导出。
- 浏览器本地存储，无服务端和付费服务；使用当前隔离检出，不新建 worktree。

## Review Focus
- 多行长中文与无空格长词必须换行，不能在画布边缘消失。
- 内容过多不能缩小至不可读，不能允许导出裁切结果。
- 存储不可用或内容损坏必须显示真实状态，不能假报已保存。
- 上传图片、项目复制和恢复在刷新后必须仍然存在。
- 最后一个项目删除必须保留可继续操作的入口。

### Task 1: 数据模型与测试
**Files:** package.json, src/lib/model.ts, src/lib/storage.ts, src/lib/model.test.ts
**Interfaces:** Design / Course / Price / MaterialState; createDesign(kind), sortCourses(items), duplicateDesign(project), loadState(storage), saveState(storage,state).
- [x] 建立项目配置和测试；先验证未实现接口失败。
- [x] 实现三类演示模型、项目操作、版本化保存和损坏恢复。
- [x] 运行单元测试，确认业务行为。

### Task 2: 统一排版与真实 PNG
**Files:** src/lib/layout.ts, src/lib/layout.test.ts, src/lib/render.ts, src/components/PosterPreview.tsx
**Interfaces:** wrapText(text,maxWidth,measure), renderPoster(canvas,design,assets): Promise<RenderResult>.
- [x] 先测试换行与密度约束。
- [x] 实现两个布局、三类模板、三尺寸、字体等待和素材解码。
- [x] 实现可读字号、溢出诊断和同画布 PNG 导出。

### Task 3: 编辑器与素材持久化
**Files:** src/App.tsx, src/components/Editor.tsx, src/components/AssetLibrary.tsx, src/lib/assets.ts, src/styles.css
**Interfaces:** useDesigns() 暴露项目编辑、复制删除恢复与保存状态；Asset record 保存 blob、类别、无人像确认。
- [x] 实现响应式工作台、模板和项目切换、全部表单及行操作。
- [x] 实现 IndexedDB 原图上传、背景裁切与遮罩、Logo、活动照片及二维码。
- [x] 实现自动保存、恢复前次、备份导入导出和错误提示。

### Task 4: 端到端验证与交付
**Files:** tests/editor.spec.ts, playwright.config.ts, README.md
- [x] 浏览器验证编辑、刷新恢复、项目复制删除、价目排序、所有尺寸真实 PNG。
- [x] 验证长内容阻止截断导出、手机布局、素材跨刷新和活动基础版。
- [x] 截图检查桌面及手机显示，运行 test / typecheck / build / e2e。
- [x] 文档记录启动、Vercel 部署、存储限制和尚缺的真实背景素材。
