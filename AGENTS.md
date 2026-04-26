<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## RSSHub 自用服务

此项目用于将缺少自带 RSS 的网站转换为可订阅的 XML 输出，供 RSS 阅读器（如 Inoreader）使用。

## 关键工具

| 工具 | 版本 |
|-----|------|
| Next.js | 16.2.4 |
| React | 19.2.4 |
| Tailwind | 4 |
| 包管理器 | **bun** (使用 `bun.lock`) |

## 开发命令

```bash
bun run dev      # 开发服务器 localhost:3000
bun run build    # 生产构建
bun run start    # 启动生产服务器
bun run lint     # ESLint
```

## 已安装依赖

- `next`, `react`, `react-dom` - 核心框架
- `tailwindcss`, `@tailwindcss/postcss` - CSS 框架 (v4 配置方式)
- `typescript`, `@types/*` - 类型系统
- `eslint`, `eslint-config-next` - 代码检查

## 项目结构

```
app/                    # Next.js App Router 入口
  page.tsx             # 首页（待开发 RSS 路由）
  layout.tsx           # 根布局
  globals.css          # 全局样式（Tailwind v4）
```

## 注意事项

- **包管理器**: 必须用 `bun`，不要用 `npm`/`yarn`/`pnpm`
- **无测试框架**: package.json 中未安装测试工具，如需请手动添加
- **无 typecheck 脚本**: TS 仅通过 IDE 检查，无独立验证命令
- **路径别名**: `@/*` 指向项目根目录
- **Next.js 16**: React Server Components、Server Actions 等 API 可能与旧版本不同