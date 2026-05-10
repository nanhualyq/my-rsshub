import { escapeXml, buildRssXml, type RssItem } from '@/lib/rss'

export const dynamic = 'force-dynamic'

interface DoubanSubject {
  id: string
  title: string
  year: string
  info: string
  release_date: string
  rating: { value: number; count: number }
  cover: { url: string }
  directors: string[]
  actors: string[]
}

interface DoubanResponse {
  subject_collection_items: DoubanSubject[]
}

function buildDescription(item: DoubanSubject): string {
  const parts: string[] = []

  if (item.cover?.url) {
    parts.push(`<img src="${escapeXml(item.cover.url)}" alt="${escapeXml(item.title)}" style="max-width:200px;float:left;margin:0 16px 8px 0" />`)
  }

  const lines: string[] = []
  if (item.rating?.value) {
    lines.push(`评分：${item.rating.value}（${item.rating.count}人评价）`)
  }
  if (item.directors?.length) {
    lines.push(`导演：${item.directors.join(' / ')}`)
  }
  if (item.actors?.length) {
    lines.push(`主演：${item.actors.join(' / ')}`)
  }
  if (item.year) {
    lines.push(`年份：${item.year}`)
  }
  if (item.info) {
    lines.push(`类型：${item.info}`)
  }
  if (item.release_date) {
    lines.push(`上映日期：${item.release_date}`)
  }

  if (lines.length) {
    parts.push(`<p>${lines.join('<br/>')}</p>`)
  }

  return parts.join('')
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const minRating = parseFloat(searchParams.get('min') ?? '')

    const res = await fetch(
      'https://m.douban.com/rexxar/api/v2/subject_collection/tv_hot/items?start=0&count=50',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
          Referer: 'https://m.douban.com/movie/',
          Accept: 'application/json',
        },
      },
    )

    if (!res.ok) {
      console.error('Douban API error:', res.status)
      return new Response('Failed to fetch hot TV shows', { status: 502 })
    }

    const data: DoubanResponse = await res.json()
    let shows = data.subject_collection_items
    if (!isNaN(minRating)) {
      shows = shows.filter((item) => item.rating?.value >= minRating)
    }
    const items: RssItem[] = shows.map((item) => ({
      title: item.title,
      link: `https://movie.douban.com/subject/${item.id}/`,
      guid: `https://movie.douban.com/subject/${item.id}/`,
      description: buildDescription(item),
    }))

    if (items.length === 0) {
      return new Response('No TV shows found', { status: 502 })
    }

    const descSuffix = !isNaN(minRating) ? `（评分 ≥ ${minRating}）` : ''
    const xml = buildRssXml(
      {
        title: `豆瓣电影 - 最近热门电视剧${descSuffix}`,
        link: 'https://movie.douban.com/',
        description: `豆瓣电影最近热门电视剧列表${descSuffix}`,
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
    console.error('Failed to generate hot TV RSS:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
