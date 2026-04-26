export interface RssChannel {
  title: string
  link: string
  description: string
  language?: string
}

export interface RssItem {
  title: string
  link: string
  description?: string
  pubDate?: string
  guid?: string
}

export function rssDate(ts: number): string {
  return new Date(ts * 1000).toUTCString()
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildRssXml(channel: RssChannel, items: RssItem[]): string {
  const itemXml = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${item.link}</link>
      ${item.guid ? `<guid isPermaLink="true">${item.guid}</guid>` : `<guid>${item.link}</guid>`}
      ${item.pubDate ? `<pubDate>${item.pubDate}</pubDate>` : ''}
      ${item.description ? `<description><![CDATA[${item.description}]]></description>` : ''}
    </item>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${channel.link}</link>
    <description>${escapeXml(channel.description)}</description>
    ${channel.language ? `<language>${channel.language}</language>` : ''}
    <atom:link href="${channel.link}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${rssDate(Math.floor(Date.now() / 1000))}</lastBuildDate>
${itemXml}
  </channel>
</rss>`
}
