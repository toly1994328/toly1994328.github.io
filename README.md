# 学海无涯 | Endless Learning

基于 [Astro](https://astro.build/) 构建的个人技术博客，专注于 Flutter 状态管理源码分析等内容。

🌐 **在线预览**: [https://toly1994328.github.io](https://toly1994328.github.io)

## 技术栈

- **框架**: Astro 4
- **内容**: Markdown / MDX
- **代码高亮**: Shiki (one-dark-pro 主题)
- **图表**: Mermaid (支持全屏查看与下载)
- **部署**: GitHub Pages (GitHub Actions 自动构建)

## 功能特性

- 🌓 亮色/暗色主题切换
- 🏷️ 文章标签 & 分类系统
- 📅 归档时间轴
- 📋 代码块一键复制
- 📊 Mermaid 图表渲染（全屏 / 缩放 / 导出 PNG）
- ✨ 粒子动画背景
- 📡 RSS 订阅
- 🎨 毛玻璃 (Glassmorphism) UI 风格

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 本地预览构建产物
npm run preview
```

## 项目结构

```
├── src/
│   ├── content/
│   │   ├── blog/          # Markdown 博客文章
│   │   └── config.ts      # 内容集合 Schema 定义
│   ├── layouts/
│   │   ├── BaseLayout.astro   # 基础布局（首页等）
│   │   └── PostLayout.astro   # 文章详情布局（含目录）
│   └── pages/
│       ├── index.astro        # 首页
│       ├── archive.astro      # 归档页
│       ├── about.astro        # 关于页
│       ├── rss.xml.ts         # RSS 输出
│       ├── blog/[...slug].astro
│       ├── categories/        # 分类页
│       └── tags/              # 标签页
├── remark-mermaid.mjs     # 自定义 remark 插件（Mermaid 渲染）
├── astro.config.mjs       # Astro 配置
└── .github/workflows/     # CI/CD 部署脚本
```

## 写作

在 `src/content/blog/` 下新建 `.md` 文件，frontmatter 格式：

```yaml
---
title: 文章标题
description: 文章简介
date: 2024-01-01
tags: [Flutter, 状态管理]
category: 源码分析
draft: false        # 可选，true 时不展示
cover: /cover.png   # 可选，封面图
---
```

## 部署

推送到 `main` 分支后，GitHub Actions 会自动构建并部署到 GitHub Pages。

## License

MIT
