import * as cheerio from 'cheerio'
import { escapeXml, buildRssXml, type RssItem } from '@/lib/rss'

export const dynamic = 'force-dynamic'

interface DxyArticle {
  id: number
  title: string
  cover: string
  content_brief: string
}

async function fetchArticles(): Promise<DxyArticle[]> {
  const res = await fetch('https://dxy.com/articles', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    },
  })
  const html = await res.text()
  const $ = cheerio.load(html)

  const scriptText = $('script')
    .toArray()
    .map((el) => $(el).text())
    .find((t) => t.includes('window.$$data'))

  if (!scriptText) return []

  const prefix = 'window.$$data='
  const start = scriptText.indexOf(prefix)
  if (start === -1) return []

  let depth = 0
  let jsonStart = -1
  let jsonEnd = -1

  for (let i = start + prefix.length; i < scriptText.length; i++) {
    const ch = scriptText[i]
    if (ch === '{') {
      if (depth === 0) jsonStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        jsonEnd = i + 1
        break
      }
    }
  }

  if (jsonStart === -1 || jsonEnd === -1) return []

  const data = JSON.parse(scriptText.slice(jsonStart, jsonEnd))
  const items: DxyArticle[] = data?.list?.items ?? []
  return items
}

function buildDxyRss(articles: DxyArticle[]): string {
  const siteUrl = 'https://dxy.com'

  const items: RssItem[] = articles.map((a) => {
    const link = `${siteUrl}/article/${a.id}`
    const imgHtml = a.cover
      ? `<img src="${escapeXml(a.cover)}" alt="${escapeXml(a.title)}" /><br/>`
      : ''
    const description = `${imgHtml}<p>${escapeXml(a.content_brief)}</p>`
    return {
      title: a.title,
      link,
      guid: link,
      description,
    }
  })

  return buildRssXml({
    title: '丁香医生 - 科普文章',
    link: `${siteUrl}/articles`,
    description: '丁香医生科普文章列表',
    language: 'zh-cn',
  }, items)
}

export async function GET() {
  try {
    const articles = await fetchArticles()

    if (articles.length === 0) {
      return new Response('Failed to fetch articles', { status: 502 })
    }

    const xml = buildDxyRss(articles)

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
