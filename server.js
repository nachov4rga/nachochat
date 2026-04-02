const http = require("http");
const path = require("path");
const fs = require("fs/promises");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const PUBLIC_DIR = path.join(__dirname, "public");
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_ARTICLE_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const NEWS_SOURCES = [
  {
    id: "bbc-top",
    name: "BBC News",
    feed: "https://feeds.bbci.co.uk/news/rss.xml",
    siteUrl: "https://www.bbc.com/news",
    limit: 6
  },
  {
    id: "bbc-world",
    name: "BBC World",
    feed: "https://feeds.bbci.co.uk/news/world/rss.xml",
    siteUrl: "https://www.bbc.com/news/world",
    limit: 6
  },
  {
    id: "cnn-top",
    name: "CNN",
    feed: "http://rss.cnn.com/rss/edition.rss",
    siteUrl: "https://edition.cnn.com",
    limit: 6
  },
  {
    id: "al-jazeera",
    name: "Al Jazeera",
    feed: "https://www.aljazeera.com/xml/rss/all.xml",
    siteUrl: "https://www.aljazeera.com",
    limit: 6
  },
  {
    id: "npr",
    name: "NPR",
    feed: "https://feeds.npr.org/1001/rss.xml",
    siteUrl: "https://www.npr.org/sections/news/",
    limit: 6
  },
  {
    id: "guardian-world",
    name: "The Guardian",
    feed: "https://www.theguardian.com/world/rss",
    siteUrl: "https://www.theguardian.com/world",
    limit: 6
  },
  {
    id: "cbs",
    name: "CBS News",
    feed: "https://www.cbsnews.com/latest/rss/main",
    siteUrl: "https://www.cbsnews.com",
    limit: 6
  },
  {
    id: "sky-world",
    name: "Sky News",
    feed: "https://feeds.skynews.com/feeds/rss/world.xml",
    siteUrl: "https://news.sky.com/world",
    limit: 6
  }
];

const newsCache = {
  data: null,
  expiresAt: 0,
  promise: null
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && requestUrl.pathname === "/api/news") {
      const forceRefresh = requestUrl.searchParams.get("refresh") === "1";
      const news = await getLatestNews(forceRefresh);
      return sendJson(res, 200, {
        fetchedAt: news.fetchedAt,
        openAiConfigured: Boolean(OPENAI_API_KEY),
        model: OPENAI_MODEL,
        sourceCount: NEWS_SOURCES.length,
        articles: news.articles.slice(0, 20),
        sources: NEWS_SOURCES.map((source) => ({
          id: source.id,
          name: source.name,
          siteUrl: source.siteUrl
        }))
      });
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/chat") {
      const body = await readJsonBody(req);
      const message = typeof body.message === "string" ? body.message.trim() : "";

      if (!message) {
        return sendJson(res, 400, { error: "Please send a question for the chatbot." });
      }

      const mathResult = solveMathQuestion(message);

      if (mathResult) {
        return sendJson(res, 200, {
          answer: buildMathAnswer(mathResult),
          articles: [],
          usedModel: false,
          model: "local math engine",
          openAiConfigured: Boolean(OPENAI_API_KEY),
          fallbackReason: "",
          queryType: "math"
        });
      }

      const queryType = classifyQuestion(message);
      let news = null;
      let contextArticles = [];

      if (queryType === "news") {
        news = await getLatestNews(false);
        const rankedArticles = rankArticles(message, news.articles);
        contextArticles = rankedArticles.slice(0, 8);
      }

      let answer = "";
      let usedModel = false;
      let modelName = queryType === "news" ? "source-grounded fallback" : "general fallback";
      let fallbackReason = "";

      if (OPENAI_API_KEY) {
        try {
          answer = await askOpenAI({
            mode: queryType,
            question: message,
            articles: contextArticles,
            fetchedAt: news?.fetchedAt || ""
          });
          usedModel = true;
          modelName = OPENAI_MODEL;
        } catch (error) {
          fallbackReason = `OpenAI request failed: ${error.message}`;
        }
      } else {
        fallbackReason = "OPENAI_API_KEY is not configured.";
      }

      if (!answer) {
        answer =
          queryType === "news"
            ? buildNewsFallbackAnswer(message, contextArticles, fallbackReason)
            : buildGeneralFallbackAnswer(message, fallbackReason);
      }

      return sendJson(res, 200, {
        answer,
        articles: contextArticles.slice(0, 5),
        usedModel,
        model: modelName,
        openAiConfigured: Boolean(OPENAI_API_KEY),
        fallbackReason,
        queryType
      });
    }

    if (req.method === "GET") {
      return serveStaticAsset(requestUrl.pathname, res);
    }

    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(res, 500, {
      error: "The server hit an unexpected error.",
      details: error.message
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Nacho is running at http://${HOST}:${PORT}`);
});

async function getLatestNews(forceRefresh) {
  const now = Date.now();

  if (!forceRefresh && newsCache.data && newsCache.expiresAt > now) {
    return newsCache.data;
  }

  if (newsCache.promise) {
    return newsCache.promise;
  }

  newsCache.promise = refreshNewsCache();

  try {
    const data = await newsCache.promise;
    newsCache.data = data;
    newsCache.expiresAt = Date.now() + CACHE_TTL_MS;
    return data;
  } finally {
    newsCache.promise = null;
  }
}

async function refreshNewsCache() {
  const results = await Promise.all(
    NEWS_SOURCES.map(async (source) => {
      try {
        const articles = await fetchFeed(source);
        return articles;
      } catch (error) {
        console.warn(`Feed failed for ${source.name}: ${error.message}`);
        return [];
      }
    })
  );

  const merged = dedupeArticles(results.flat())
    .sort((left, right) => new Date(right.publishedAt) - new Date(left.publishedAt))
    .slice(0, 60);

  return {
    fetchedAt: new Date().toISOString(),
    articles: merged
  };
}

async function fetchFeed(source) {
  const response = await fetch(source.feed, {
    headers: {
      "User-Agent": "NachoNewsBot/1.0"
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xml = await response.text();
  return parseRss(xml, source)
    .filter(isFreshArticle)
    .slice(0, source.limit);
}

function parseRss(xml, source) {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const channelPublishedAt = normalizeDate(cleanText(extractTag(xml, ["lastBuildDate", "updated", "pubDate"])));

  return itemBlocks
    .map((block) => {
      const title = cleanText(extractTag(block, ["title"]));
      const linkFromTag = cleanText(extractTag(block, ["link"]));
      const linkFromAttribute = extractLinkAttribute(block);
      const summary = cleanText(extractTag(block, ["description", "content:encoded", "summary"]));
      const publishedAtRaw = cleanText(extractTag(block, ["pubDate", "dc:date", "published", "updated"]));
      const publishedAt = normalizeDate(publishedAtRaw) || channelPublishedAt;

      if (!title || !(linkFromTag || linkFromAttribute) || !publishedAt) {
        return null;
      }

      return {
        id: `${source.id}:${createSlug(linkFromTag || linkFromAttribute || title)}`,
        title,
        link: linkFromTag || linkFromAttribute,
        summary: summary || "No summary was provided in the feed.",
        source: source.name,
        sourceId: source.id,
        sourceUrl: source.siteUrl,
        publishedAt
      };
    })
    .filter(Boolean);
}

function extractTag(block, tagNames) {
  for (const tagName of tagNames) {
    const pattern = new RegExp(`<${escapeRegExp(tagName)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, "i");
    const match = block.match(pattern);

    if (match) {
      return match[1];
    }
  }

  return "";
}

function extractLinkAttribute(block) {
  const match = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return match ? match[1] : "";
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function cleanText(value) {
  if (!value) {
    return "";
  }

  return decodeHtmlEntities(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(parseInt(codePoint, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'");
}

function rankArticles(query, articles) {
  const queryTokens = Array.from(tokenize(query));
  const specificTokens = queryTokens.filter((token) => !GENERIC_QUERY_WORDS.has(token));

  if (isGenericHeadlineQuery(query, specificTokens)) {
    return sortByFreshness(articles);
  }

  return articles
    .map((article) => {
      const title = article.title.toLowerCase();
      const summary = article.summary.toLowerCase();
      const source = article.source.toLowerCase();
      let score = recencyBoost(article.publishedAt);

      for (const token of specificTokens) {
        if (title.includes(token)) {
          score += 7;
        }

        if (summary.includes(token)) {
          score += 4;
        }

        if (source.includes(token)) {
          score += 2;
        }
      }

      return { article, score };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return toTimestamp(right.article.publishedAt) - toTimestamp(left.article.publishedAt);
    })
    .map((entry) => entry.article);
}

function sortByFreshness(articles) {
  return [...articles].sort((left, right) => toTimestamp(right.publishedAt) - toTimestamp(left.publishedAt));
}

function isGenericHeadlineQuery(query, specificTokens) {
  const normalized = query.toLowerCase();

  if (!specificTokens.length) {
    return true;
  }

  return specificTokens.length <= 1 && /(headline|headlines|latest|breaking|current|today|right now|top story|top stories|world news)/i.test(normalized);
}

function isFreshArticle(article) {
  const timestamp = toTimestamp(article.publishedAt);

  if (!timestamp) {
    return false;
  }

  return Date.now() - timestamp <= MAX_ARTICLE_AGE_MS;
}

function recencyBoost(publishedAt) {
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);

  if (ageHours <= 6) {
    return 5;
  }

  if (ageHours <= 24) {
    return 3;
  }

  if (ageHours <= 72) {
    return 1;
  }

  return 0;
}

function tokenize(value) {
  return new Set((value.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter((token) => !STOP_WORDS.has(token)));
}

function classifyQuestion(question) {
  if (isLikelyNewsQuery(question)) {
    return "news";
  }

  return "general";
}

function isLikelyNewsQuery(question) {
  const normalized = question.toLowerCase();

  if (/(headline|headlines|breaking|latest|current|today|right now|news|news update|news updates)/i.test(normalized)) {
    return true;
  }

  if (/(market|markets|election|elections|war|conflict|gaza|ukraine|iran|israel|trump|cnn|bbc|al jazeera|guardian|npr|cbs|sky news)/i.test(normalized) && /(what|why|how|summarize|update|happening|latest|current|today|news)/i.test(normalized)) {
    return true;
  }

  return false;
}

function solveMathQuestion(question) {
  const expression = extractMathExpression(question);

  if (!expression) {
    return null;
  }

  try {
    const normalized = normalizeMathExpression(expression);

    if (!normalized || !/^[0-9+\-*/().\s%*]+$/.test(normalized)) {
      return null;
    }

    const result = Function(`"use strict"; return (${normalized});`)();

    if (!Number.isFinite(result)) {
      return null;
    }

    return {
      expression: expression.replace(/\s+/g, " ").trim(),
      result
    };
  } catch {
    return null;
  }
}

function extractMathExpression(question) {
  let candidate = question
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/[?=]/g, " ")
    .replace(/what is|what's|calculate|solve|evaluate|compute|can you solve|can you calculate|please|for me|math/gi, " ")
    .replace(/to the power of/gi, " ^ ")
    .replace(/multiplied by|times/gi, " * ")
    .replace(/divided by|over/gi, " / ")
    .replace(/plus/gi, " + ")
    .replace(/minus/gi, " - ")
    .replace(/\bof\b/gi, " * ")
    .replace(/\bx\b/gi, " * ")
    .replace(/\s+/g, " ")
    .trim();

  if (!candidate) {
    return null;
  }

  return /^[0-9+\-*/().\s^%]+$/.test(candidate) ? candidate : null;
}

function normalizeMathExpression(expression) {
  return expression
    .replace(/\^/g, "**")
    .replace(/(\d+(?:\.\d+)?)%/g, "($1/100)")
    .trim();
}

function buildMathAnswer(result) {
  return [
    `I solved it locally.`,
    `${result.expression} = ${formatMathResult(result.result)}`,
    "Press Enter to send the next question, or use Shift+Enter for a new line."
  ].join("\n\n");
}

function formatMathResult(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return Number(value.toFixed(8)).toString();
}

async function askOpenAI({ mode, question, articles, fetchedAt }) {
  const context = articles
    .map((article, index) => {
      return [
        `Article ${index + 1}:`,
        `Source: ${article.source}`,
        `Published: ${formatDate(article.publishedAt)}`,
        `Title: ${article.title}`,
        `Summary: ${article.summary}`,
        `Link: ${article.link}`
      ].join("\n");
    })
    .join("\n\n");

  const payload = {
    model: OPENAI_MODEL,
    temperature: mode === "news" ? 0.3 : 0.5,
    messages: [
      {
        role: "system",
        content:
          mode === "news"
            ? "You are Nacho, a reliable news-focused assistant. Use the provided article packets as the source of truth for current events. If the user asks about current news, answer only from the provided packets and cite relevant sources inline using the pattern [Source - Title]."
            : "You are Nacho, a warm, capable assistant that answers general questions clearly. Handle general knowledge, explanations, and math help well. If the user asks about fast-changing current events without live packets, say that live news grounding is better for that topic."
      },
      {
        role: "user",
        content: [
          fetchedAt ? `Feed snapshot time: ${fetchedAt}.` : "",
          `User question: ${question}`,
          "",
          mode === "news" ? "Current article packets:" : "Optional live article packets:",
          context || "No article packets were provided."
        ]
          .filter(Boolean)
          .join("\n")
      }
    ]
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`);
  }

  const answer = data.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("The OpenAI response did not include a message.");
  }

  return answer;
}

function buildNewsFallbackAnswer(question, articles, fallbackReason) {
  if (!articles.length) {
    return [
      "I couldn't load enough current articles to answer confidently right now.",
      "Try refreshing the feed in a moment, or add an `OPENAI_API_KEY` after the source feeds are available so the chatbot can reason over them."
    ].join("\n\n");
  }

  const intro = fallbackReason
    ? `I stayed in source-grounded fallback mode because ${fallbackReason}`
    : "I stayed in source-grounded fallback mode.";

  const digest = articles
    .slice(0, 4)
    .map((article, index) => {
      return `${index + 1}. ${article.title} (${article.source}, ${formatDate(article.publishedAt)}): ${truncate(article.summary, 180)}`;
    })
    .join("\n");

  return [
    `${intro} Here is the best current-news brief I can build from the live feeds for: "${question}".`,
    digest,
    "Ask about a country, event, company, election, conflict, market, or person and I can narrow the answer around the freshest matching stories."
  ].join("\n\n");
}

function buildGeneralFallbackAnswer(question, fallbackReason) {
  const intro = fallbackReason
    ? `I couldn't use the AI model because ${fallbackReason}`
    : "I couldn't use the AI model for that general question.";

  return [
    `${intro}`,
    `I can still help with live news from the current feeds and with arithmetic-style math locally, but broader general questions like "${question}" need an \`OPENAI_API_KEY\` in your local \`.env\` file for full answers.`
  ].join("\n\n");
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}...`;
}

function dedupeArticles(articles) {
  const seen = new Set();

  return articles.filter((article) => {
    const key = `${article.link}|${article.title.toLowerCase()}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function readJsonBody(req) {
  const chunks = [];
  let totalLength = 0;

  for await (const chunk of req) {
    totalLength += chunk.length;

    if (totalLength > 1_000_000) {
      throw new Error("Request body is too large.");
    }

    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf-8");
  return rawBody ? JSON.parse(rawBody) : {};
}

async function serveStaticAsset(requestPath, res) {
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const resolvedPath = path.resolve(PUBLIC_DIR, relativePath);

  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, 403, { error: "Forbidden." });
  }

  try {
    const file = await fs.readFile(resolvedPath);
    const extension = path.extname(resolvedPath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[extension] || "application/octet-stream" });
    res.end(file);
  } catch (error) {
    if (relativePath !== "index.html") {
      return sendJson(res, 404, { error: "Not found." });
    }

    throw error;
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function formatDate(value) {
  if (!value) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date(value));
}

function toTimestamp(value) {
  const date = new Date(value);
  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STOP_WORDS = new Set([
  "are",
  "about",
  "after",
  "before",
  "could",
  "does",
  "from",
  "give",
  "have",
  "into",
  "just",
  "language",
  "like",
  "many",
  "more",
  "most",
  "into",
  "just",
  "more",
  "news",
  "now",
  "over",
  "please",
  "show",
  "simple",
  "that",
  "than",
  "their",
  "there",
  "they",
  "this",
  "those",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your"
]);

const GENERIC_QUERY_WORDS = new Set([
  "biggest",
  "breaking",
  "current",
  "freshest",
  "headline",
  "headlines",
  "international",
  "latest",
  "news",
  "now",
  "right",
  "stories",
  "story",
  "today",
  "top",
  "world"
]);
