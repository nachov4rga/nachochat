import { renderPage } from "./src/page.mjs";
import {
  askOpenAI,
  buildGeneralFallbackAnswer,
  buildMathAnswer,
  buildNewsFallbackAnswer,
  classifyQuestion,
  getLatestNews,
  getOpenAiModel,
  rankArticles,
  solveMathQuestion
} from "./src/news.mjs";

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/api/news") {
        const forceRefresh = url.searchParams.get("refresh") === "1";
        const news = await getLatestNews(forceRefresh);
        return sendJson(200, {
          fetchedAt: news.fetchedAt,
          openAiConfigured: Boolean(env.OPENAI_API_KEY),
          model: getOpenAiModel(env),
          sourceCount: news.sourceCount,
          articles: news.articles.slice(0, 20),
          sources: news.sources
        });
      }

      if (request.method === "POST" && url.pathname === "/api/chat") {
        const body = await readJsonBody(request);
        const message = typeof body.message === "string" ? body.message.trim() : "";

        if (!message) {
          return sendJson(400, { error: "Please send a question for the chatbot." });
        }

        const mathResult = solveMathQuestion(message);
        if (mathResult) {
          return sendJson(200, {
            answer: buildMathAnswer(mathResult),
            articles: [],
            usedModel: false,
            model: "local math engine",
            openAiConfigured: Boolean(env.OPENAI_API_KEY),
            fallbackReason: "",
            queryType: "math"
          });
        }

        const queryType = classifyQuestion(message);
        let news = null;
        let contextArticles = [];

        if (queryType === "news") {
          news = await getLatestNews(false);
          contextArticles = rankArticles(message, news.articles).slice(0, 8);
        }

        let answer = "";
        let usedModel = false;
        let modelName = queryType === "news" ? "source-grounded fallback" : "general fallback";
        let fallbackReason = "";

        if (env.OPENAI_API_KEY) {
          try {
            answer = await askOpenAI({
              apiKey: env.OPENAI_API_KEY,
              model: getOpenAiModel(env),
              mode: queryType,
              question: message,
              articles: contextArticles,
              fetchedAt: news?.fetchedAt || ""
            });
            usedModel = true;
            modelName = getOpenAiModel(env);
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

        return sendJson(200, {
          answer,
          articles: contextArticles.slice(0, 5),
          usedModel,
          model: modelName,
          openAiConfigured: Boolean(env.OPENAI_API_KEY),
          fallbackReason,
          queryType
        });
      }

      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        return new Response(renderPage(), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=300"
          }
        });
      }

      if (request.method === "GET") {
        return sendJson(404, { error: "Not found." });
      }

      return sendJson(405, { error: "Method not allowed." });
    } catch (error) {
      return sendJson(500, {
        error: "The server hit an unexpected error.",
        details: error.message
      });
    }
  }
};

async function readJsonBody(request) {
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) {
    throw new Error("Request body is too large.");
  }

  return rawBody ? JSON.parse(rawBody) : {};
}

function sendJson(statusCode, payload) {
  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
