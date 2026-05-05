import { escapeXml, buildRssXml, rssDate, type RssItem } from '@/lib/rss'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = 'force-dynamic'

const API_URL =
  'https://x.com/i/api/graphql/iCyHMXVutL66dZyvMtyChA/HomeLatestTimeline'

const VARIABLES = {
  count: 20,
  enableRanking: false,
  includePromotedContent: true,
  requestContext: 'launch',
}

const FEATURES = {
  rweb_video_screen_enabled: false,
  rweb_cashtags_enabled: true,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: false,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_annotations_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  content_disclosure_indicator_enabled: true,
  content_disclosure_ai_generated_indicator_enabled: true,
  responsive_web_grok_show_grok_translated_post: true,
  responsive_web_grok_analysis_button_from_backend: true,
  post_ctas_fetch_enabled: true,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: false,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: true,
  responsive_web_enhance_cards_enabled: false,
}

const QUERY_ID = 'iCyHMXVutL66dZyvMtyChA'

function getTweetText(result: any): string {
  if (result.note_tweet?.note_tweet_results?.result?.text) {
    return result.note_tweet.note_tweet_results.result.text
  }
  const fullText = result.legacy?.full_text || ''
  const range = result.legacy?.display_text_range
  if (range && Array.isArray(range) && range.length >= 2) {
    return fullText.slice(0, range[1])
  }
  return fullText
}

function parseTimestamp(createdAt: string): number {
  return Math.floor(new Date(createdAt).getTime() / 1000)
}

function getUserResult(result: any): any | null {
  return result.core?.user_results?.result ?? null
}

function renderTweetContent(result: any): string {
  const user = getUserResult(result)
  const text = getTweetText(result)

  let html = ''

  if (user) {
    const avatarUrl =
      user.avatar?.image_url ??
      user.legacy?.profile_image_url_https ??
      ''
    const displayName = user.core?.name ?? user.legacy?.name ?? ''
    const screenName =
      user.core?.screen_name ?? user.legacy?.screen_name ?? ''

    html += `<table><tr>`
    if (avatarUrl) {
      html += `<td valign="top"><img src="${escapeXml(avatarUrl)}" width="48" height="48" style="border-radius:50%;max-width:48px" /></td>`
    }
    html += `<td style="padding-left:10px"><strong>${escapeXml(displayName)}</strong><br/><span style="color:#666">@${escapeXml(screenName)}</span></td>`
    html += `</tr></table>`
  }

  html += `<p>${escapeXml(text)}</p>`

  const media = result.legacy?.entities?.media
  if (media && Array.isArray(media)) {
    for (const m of media) {
      if (m.type === 'photo' && m.media_url_https) {
        html += `<br/><img src="${escapeXml(m.media_url_https)}" alt="" style="max-width:100%" />`
      }
    }
  }

  const quoted = result.quoted_status_result?.result
  if (quoted && quoted.__typename === 'Tweet') {
    const qUser = getUserResult(quoted)
    const qText = getTweetText(quoted)
    const qDisplayName = qUser?.core?.name ?? qUser?.legacy?.name ?? ''
    const qScreenName =
      qUser?.core?.screen_name ?? qUser?.legacy?.screen_name ?? ''

    html += `<blockquote style="border-left:4px solid #ccc;padding-left:10px;margin:10px 0;color:#555">`
    html += `<strong>${escapeXml(qDisplayName)}</strong> <span style="color:#666">@${escapeXml(qScreenName)}</span><br/>`
    html += `${escapeXml(qText)}</blockquote>`
  }

  return html
}

function buildDescription(result: any): string {
  const retweetedResult = result.legacy?.retweeted_status_result?.result
  if (retweetedResult && retweetedResult.__typename === 'Tweet') {
    const retweeter = getUserResult(result)
    let html = ''
    if (retweeter) {
      const rtName = retweeter.core?.screen_name ?? retweeter.legacy?.screen_name ?? ''
      html += `<p style="color:#666;font-size:0.9em">转推自 @${escapeXml(rtName)}</p>`
    }
    html += renderTweetContent(retweetedResult)
    return html
  }
  return renderTweetContent(result)
}

function extractTweets(json: any): RssItem[] {
  const instructions =
    json?.data?.home?.home_timeline_urt?.instructions ?? []
  const items: RssItem[] = []

  for (const instruction of instructions) {
    if (!instruction.entries) continue
    for (const entry of instruction.entries) {
      if (!entry.entryId?.startsWith('tweet-')) continue

      const result = entry.content?.itemContent?.tweet_results?.result
      if (!result || result.__typename !== 'Tweet' || !result.legacy) continue

      const user = getUserResult(result)
      if (!user) continue

      const screenName =
        user.core?.screen_name ?? user.legacy?.screen_name ?? ''

      const innerResult = result.legacy?.retweeted_status_result?.result
      const isRetweet = !!(innerResult && innerResult.__typename === 'Tweet')

      const tweetId = (isRetweet ? innerResult.rest_id ?? innerResult.legacy?.id_str : result.rest_id ?? result.legacy.id_str) as string
      const timestamp = parseTimestamp(result.legacy.created_at)
      const text = getTweetText(isRetweet ? innerResult : result)

      if (!screenName || !tweetId) continue

      const title = text.length > 80 ? text.slice(0, 80) + '…' : text
      const innerUser = isRetweet ? getUserResult(innerResult) : null
      const authorScreenName = isRetweet
        ? (innerUser?.core?.screen_name ?? innerUser?.legacy?.screen_name ?? screenName)
        : screenName

      items.push({
        title,
        link: `https://x.com/${authorScreenName}/status/${tweetId}`,
        guid: `https://x.com/${authorScreenName}/status/${tweetId}`,
        pubDate: rssDate(timestamp),
        description: buildDescription(result),
      })
    }
  }

  return items
}

export async function GET() {
  try {
    if (
      !process.env.X_BEARER_TOKEN ||
      !process.env.X_CSRF_TOKEN ||
      !process.env.X_COOKIE
    ) {
      return new Response('X API credentials not configured', { status: 500 })
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
        'x-csrf-token': process.env.X_CSRF_TOKEN,
        cookie: process.env.X_COOKIE,
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        variables: VARIABLES,
        features: FEATURES,
        queryId: QUERY_ID,
      }),
    })

    if (!res.ok) {
      console.error('X API error:', res.status)
      return new Response('Failed to fetch timeline', { status: 502 })
    }

    const json = await res.json()
    const items = extractTweets(json)

    if (items.length === 0) {
      return new Response('No tweets found', { status: 502 })
    }

    const xml = buildRssXml(
      {
        title: 'X 首页时间线',
        link: 'https://x.com/home',
        description: 'X (Twitter) 首页最新推文',
        language: 'zh-cn',
      },
      items,
    )

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    console.error('Failed to generate X timeline RSS:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
