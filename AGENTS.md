<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data.

## 在写任何代码之前必须做：

1. **优先查阅本地文档**: `node_modules/next/dist/docs/` 目录下有当前版本的完整文档，必须先读
2. **兜底查询**: 如果本地文档中没有找到答案，或者不确定 API 用法，使用 `load skill find-docs` 来查询官方文档
3. Heed deprecation notices.
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

## RSS 路由约定

每个 RSS 源对应一个 route handler，位于 `app/<name>/route.ts`，URL 路径为 `GET /<name>`。

### 标准脚手架

```ts
import * as cheerio from 'cheerio'
import { escapeXml, buildRssXml, rssDate, type RssItem } from '@/lib/rss'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const articles = await fetchArticles()
    if (articles.length === 0) {
      return new Response('Failed to fetch articles', { status: 502 })
    }
    const xml = buildFeedXml(articles)
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    })
  } catch (error) {
    console.error('Failed to generate RSS feed:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
```

### 数据抓取

- 使用 `fetch()` 获取页面 HTML，必须带 `User-Agent` 请求头
- 使用 `cheerio` 解析 HTML，或提取页面内嵌 JSON（如 `window.$$data`）
- 提取内嵌 JSON 时**不可用非贪婪正则**（`{.+?}` 会在第一个 `}` 提前结束），必须用**花括号深度追踪**来定位完整的 JSON 边界：

```ts
function extractJson(scriptText: string, prefix: string): any {
  const start = scriptText.indexOf(prefix)
  let depth = 0, jsonStart = -1, jsonEnd = -1
  for (let i = start + prefix.length; i < scriptText.length; i++) {
    const ch = scriptText[i]
    if (ch === '{') { if (depth === 0) jsonStart = i; depth++ }
    else if (ch === '}') { depth--; if (depth === 0) { jsonEnd = i + 1; break } }
  }
  return JSON.parse(scriptText.slice(jsonStart, jsonEnd))
}
```

### RSS 构建

- 调用 `buildRssXml(channel, items)` 生成完整 RSS 2.0 XML
- `channel` 包含 `title`, `link`, `description`, 可选 `language`（中文用 `'zh-cn'`）
- 每个 `RssItem` 包含 `title`, `link`, 可选 `description`（可含 HTML，自动包 CDATA）、`pubDate`（需 `rssDate(timestampInSeconds)`）、`guid`
- 图片用 `<img src="..." alt="..." />` 拼入 `description`
- 用户生成的内容（标题、摘要等）用 `escapeXml()` 转义后再拼入字符串