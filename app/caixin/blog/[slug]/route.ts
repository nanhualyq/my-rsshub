import * as cheerio from 'cheerio'
import { rssDate, escapeXml, buildRssXml, type RssItem } from '@/lib/rss'

export const dynamic = 'force-dynamic'

interface Post {
  title: string
  guid: string
  publishTime: number
  brief: string
  thumbnail?: string
  displayName: string
}

interface ApiResponse {
  data: Post[]
  lastPage: boolean
}

async function getAuthorInfo(slug: string) {
  const url = `https://${slug}.blog.caixin.com/`
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    },
  })
  const html = await res.text()
  const $ = cheerio.load(html)
  let authorId = ''
  let authorName = ''
  $('script').each((_, el) => {
    const text = $(el).html() || ''
    const idMatch = text.match(/window\.authorId\s*=\s*(\d+)/)
    const nameMatch = text.match(/window\.authorName\s*=\s*"([^"]+)"/)
    if (idMatch) authorId = idMatch[1]
    if (nameMatch) authorName = nameMatch[1]
  })
  return { authorId, authorName, blogUrl: url }
}

async function fetchArticles(slug: string): Promise<{ items: RssItem[]; channelTitle: string }> {
  const { authorId, authorName } = await getAuthorInfo(slug)
  if (!authorId) throw new Error(`Author not found for slug: ${slug}`)

  const res = await fetch('https://blog.caixin.com/blog-api/post/posts', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    },
    body: new URLSearchParams({
      page: '1',
      size: '20',
      authorId,
      sort: 'publishTime',
      direction: 'DESC',
    }),
    method: 'POST',
  })
  const json: ApiResponse = await res.json()

  const items: RssItem[] = json.data.map((post) => {
    const desc = post.thumbnail
      ? `<img src="${escapeXml(post.thumbnail)}" alt="${escapeXml(post.title)}" /><br/>${escapeXml(post.brief)}`
      : escapeXml(post.brief)
    return {
      title: post.title,
      link: post.guid,
      guid: post.guid,
      pubDate: rssDate(Math.floor(post.publishTime / 1000)),
      description: desc,
    }
  })

  return { items, channelTitle: `${authorName}的财新博客` }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  try {
    const { items, channelTitle } = await fetchArticles(slug)
    if (items.length === 0) {
      return new Response('Failed to fetch articles', { status: 502 })
    }
    const xml = buildRssXml(
      {
        title: channelTitle,
        link: `https://${slug}.blog.caixin.com/`,
        description: `${slug}的财新博客`,
        language: 'zh-cn',
      },
      items,
    )
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
