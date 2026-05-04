import * as cheerio from 'cheerio'
import { rssDate, escapeXml, buildRssXml, type RssItem } from '@/lib/rss'

export const dynamic = 'force-dynamic'

function parseCaixinTime(text: string): number {
  const now = Math.floor(Date.now() / 1000)
  const m = text.match(/(\d{2})月(\d{2})日\s+(\d{2}):(\d{2})/)
  if (!m) return now
  const year = new Date().getFullYear()
  const d = new Date(year, parseInt(m[1]) - 1, parseInt(m[2]), parseInt(m[3]), parseInt(m[4]))
  if (d.getTime() > Date.now()) d.setFullYear(year - 1)
  return Math.floor(d.getTime() / 1000)
}

async function fetchArticles(): Promise<RssItem[]> {
  const res = await fetch('https://www.caixin.com/?HOLDZH', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    },
  })
  const html = await res.text()
  const $ = cheerio.load(html)
  const items: RssItem[] = []

  $('.news_list > dl').each((_, el) => {
    const $el = $(el)
    const $a = $el.find('dd p a').first()
    const title = $a.text().trim()
    const link = $a.attr('href') || ''
    const img = $el.find('dt img').attr('data-src') || ''
    const timeText = $el.find('dd > span').text().trim()
    if (!title || !link) return
    const desc = img
      ? `<img src="${escapeXml(img)}" alt="${escapeXml(title)}" /><br/>`
      : ''
    items.push({
      title,
      link,
      guid: link,
      pubDate: rssDate(parseCaixinTime(timeText)),
      description: desc,
    })
  })

  $('.news_list > .news_img_box').each((_, el) => {
    const $el = $(el)
    const $a = $el.find('.tit p a').first()
    const title = $a.text().trim()
    const link = $a.attr('href') || ''
    const img = $el.find('ul li img').first().attr('src') || ''
    const timeText = $el.find('> span').text().trim()
    if (!title || !link) return
    const desc = img
      ? `<img src="${escapeXml(img)}" alt="${escapeXml(title)}" /><br/>`
      : ''
    items.push({
      title,
      link,
      guid: link,
      pubDate: rssDate(parseCaixinTime(timeText)),
      description: desc,
    })
  })

  return items
}

export async function GET() {
  try {
    const items = await fetchArticles()
    if (items.length === 0) {
      return new Response('Failed to fetch articles', { status: 502 })
    }
    const xml = buildRssXml(
      {
        title: '财新网 - 首页新闻',
        link: 'https://www.caixin.com/?HOLDZH',
        description: '财新网首页新闻列表',
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
