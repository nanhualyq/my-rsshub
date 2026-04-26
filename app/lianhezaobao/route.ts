import * as cheerio from 'cheerio'
import { rssDate, escapeXml, buildRssXml as buildRssFeed, type RssItem } from '@/lib/rss'

export const dynamic = 'force-dynamic'

interface Article {
  id: string
  title: string
  timestamp: number
  thumbnail: string
  summary: string
  item_type: string
  href: string
}

async function fetchArticles(): Promise<Article[]> {
  const res = await fetch('https://www.zaobao.com.sg/news/china', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    },
  })
  const html = await res.text()
  const $ = cheerio.load(html)
  const scriptContent = $('[id="S:0"] script').text()

  const arg = extractEnqueueArg(scriptContent)
  if (!arg) return []

  const data: any[] = JSON.parse(arg)

  const articlesIdx = data.indexOf('articles')
  if (articlesIdx === -1) return []

  const articleIndices: number[] = data[articlesIdx + 1]
  if (!Array.isArray(articleIndices)) return []

  const articles: Article[] = []

  for (const refMapIdx of articleIndices) {
    const refMap = data[refMapIdx]
    if (typeof refMap !== 'object' || refMap === null) continue

    const article: Record<string, any> = {}

    for (const [keyRef, valIdx] of Object.entries(refMap)) {
      if (typeof valIdx !== 'number' || valIdx < 0) continue
      const keyIdx = Number(keyRef.replace('_', ''))
      const key: string = data[keyIdx]
      article[key] = data[valIdx]
    }

    if (article.id && article.title) {
      articles.push(article as unknown as Article)
    }
  }

  return articles
}

function extractEnqueueArg(scriptContent: string): string | null {
  const prefix = 'enqueue("'
  const start = scriptContent.indexOf(prefix)
  if (start === -1) return null

  const argStart = start + prefix.length

  let i = argStart
  while (i < scriptContent.length) {
    if (scriptContent[i] === '\\') {
      i += 2
      continue
    }
    if (scriptContent[i] === '"') break
    i++
  }
  if (i >= scriptContent.length) return null

  const outerJsonStr = scriptContent.substring(argStart - 1, i + 1)
  const innerJsonStr: string = JSON.parse(outerJsonStr)
  return innerJsonStr
}

function buildZaobaoRss(articles: Article[]): string {
  const siteUrl = 'https://www.zaobao.com.sg'
  const chinaUrl = `${siteUrl}/news/china`

  const items: RssItem[] = articles.map((a) => {
    const link = `${siteUrl}${a.href}`
    const imgHtml = a.thumbnail
      ? `<img src="${escapeXml(a.thumbnail)}" alt="${escapeXml(a.title)}" /><br/>`
      : ''
    const description = `${imgHtml}<p>${escapeXml(a.summary)}</p>`
    return {
      title: a.title,
      link,
      guid: link,
      pubDate: rssDate(a.timestamp),
      description,
    }
  })

  return buildRssFeed({
    title: '联合早报 - 中国新闻',
    link: chinaUrl,
    description: '联合早报中国频道最新新闻',
    language: 'zh-cn',
  }, items)
}

export async function GET() {
  try {
    const articles = await fetchArticles()

    if (articles.length === 0) {
      return new Response('Failed to fetch articles', { status: 502 })
    }

    const xml = buildZaobaoRss(articles)

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
