export function renderPage() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Nacho is a navy-and-gold AI chatbot for live news, general questions, and math help."
    />
    <title>Nacho | Live News Chatbot</title>
    <style>
      :root {
        --navy-1: #04101d;
        --navy-2: #0b1b31;
        --navy-3: #132a49;
        --gold: #d4af37;
        --line: rgba(255, 255, 255, 0.08);
        --text: #edf3fb;
        --muted: #aebfd3;
        --panel: rgba(8, 20, 35, 0.82);
        --radius: 24px;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", system-ui, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(212, 175, 55, 0.12), transparent 28%),
          linear-gradient(160deg, var(--navy-1), var(--navy-2) 40%, var(--navy-3));
      }

      a { color: inherit; }

      .shell {
        width: min(1180px, calc(100% - 28px));
        margin: 0 auto;
        padding: 28px 0 36px;
      }

      .hero,
      .panel,
      .chip,
      .message { backdrop-filter: blur(16px); }

      .hero {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 18px;
        margin-bottom: 18px;
      }

      .hero-copy,
      .hero-side,
      .panel {
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: linear-gradient(180deg, rgba(14, 30, 52, 0.92), var(--panel));
        box-shadow: 0 22px 54px rgba(0, 0, 0, 0.24);
      }

      .hero-copy { padding: 28px; }
      .hero-side { padding: 24px; }

      .eyebrow {
        display: inline-flex;
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid rgba(212, 175, 55, 0.28);
        background: rgba(212, 175, 55, 0.08);
        color: #f4d67a;
        font-size: 12px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }

      h1,
      h2 {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
      }

      h1 {
        margin-top: 16px;
        font-size: clamp(38px, 6vw, 62px);
        line-height: 0.98;
        max-width: 11ch;
      }

      h2 {
        font-size: 30px;
        margin-bottom: 6px;
      }

      .lead,
      .subtle,
      .headline-card p,
      .message pre { color: var(--muted); }

      .lead {
        max-width: 46rem;
        line-height: 1.7;
        margin: 16px 0 22px;
      }

      .actions,
      .chips,
      .sources {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .button,
      .chip,
      .source-pill {
        border-radius: 999px;
        padding: 12px 16px;
        font: inherit;
      }

      .button {
        border: 0;
        cursor: pointer;
        text-decoration: none;
      }

      .button-primary {
        background: linear-gradient(135deg, var(--gold), #f0ca64);
        color: #08101a;
        font-weight: 700;
      }

      .button-secondary,
      .chip,
      .source-pill {
        border: 1px solid rgba(212, 175, 55, 0.18);
        background: rgba(212, 175, 55, 0.08);
        color: #f1d577;
      }

      .hero-stats {
        display: grid;
        gap: 12px;
        margin-top: 12px;
      }

      .stat {
        padding: 14px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: rgba(6, 15, 27, 0.55);
      }

      .stat-label {
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #f1d577;
      }

      .stat strong {
        display: block;
        margin-top: 8px;
        font-size: 19px;
      }

      .grid {
        display: grid;
        grid-template-columns: 1.08fr 0.92fr;
        gap: 18px;
      }

      .panel { padding: 22px; }

      .panel-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .status {
        border-radius: 999px;
        border: 1px solid rgba(212, 175, 55, 0.22);
        background: rgba(212, 175, 55, 0.08);
        color: #f1d577;
        padding: 9px 13px;
        font-size: 14px;
      }

      .status.offline {
        border-color: rgba(174, 191, 211, 0.18);
        background: rgba(174, 191, 211, 0.08);
        color: var(--muted);
      }

      .suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 16px;
      }

      .feed-tools {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 14px;
      }

      .chat-log {
        min-height: 360px;
        display: grid;
        gap: 12px;
        margin-bottom: 14px;
      }

      .message {
        border: 1px solid var(--line);
        border-radius: 20px;
        background: rgba(6, 15, 27, 0.74);
        padding: 14px;
      }

      .message.user { background: rgba(20, 44, 74, 0.8); }

      .role {
        margin-bottom: 8px;
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #f1d577;
      }

      .message pre {
        margin: 0;
        white-space: pre-wrap;
        font: inherit;
        line-height: 1.7;
      }

      .sources { margin-top: 10px; }

      .source-pill {
        text-decoration: none;
        font-size: 13px;
      }

      form {
        display: grid;
        gap: 10px;
      }

      textarea {
        width: 100%;
        min-height: 112px;
        resize: vertical;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: rgba(5, 12, 22, 0.8);
        color: var(--text);
        padding: 14px;
        font: inherit;
      }

      .headline-list {
        display: grid;
        gap: 12px;
      }

      .headline-card {
        border-radius: 20px;
        border: 1px solid var(--line);
        background: rgba(6, 15, 27, 0.7);
        padding: 14px;
      }

      .headline-meta {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        color: var(--muted);
        font-size: 13px;
        margin-bottom: 8px;
      }

      .headline-card h3 {
        margin: 0 0 8px;
        font-size: 18px;
        line-height: 1.4;
      }

      .headline-card a { text-decoration: none; }

      .empty {
        color: var(--muted);
        padding: 14px;
        border-radius: 18px;
        border: 1px dashed rgba(174, 191, 211, 0.2);
      }

      @media (max-width: 960px) {
        .hero,
        .grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Current News + General AI</span>
          <h1>Nacho answers live headlines, general questions, and math.</h1>
          <p class="lead">
            Ask about current events from BBC, CNN, Al Jazeera, NPR, The Guardian, CBS News, and Sky News. You can
            also ask general knowledge questions and arithmetic-style math, all from one Cloudflare Worker deployment.
          </p>
          <div class="actions">
            <a class="button button-secondary" href="#chat-panel">Start chatting</a>
          </div>
          <div class="chips">
            <span class="chip">Live News</span>
            <span class="chip">General Questions</span>
            <span class="chip">Math Help</span>
            <span class="chip">Source-Linked Headlines</span>
          </div>
        </div>
        <div class="hero-side">
          <div class="eyebrow">Worker Snapshot</div>
          <div class="hero-stats">
            <div class="stat">
              <span class="stat-label">Coverage</span>
              <strong id="coverage-count">8 sources</strong>
              <div class="subtle">Credible feed-backed outlets</div>
            </div>
            <div class="stat">
              <span class="stat-label">Mode</span>
              <strong id="model-status">Checking AI setup...</strong>
              <div id="model-detail" class="subtle">Preparing live context</div>
            </div>
            <div class="stat">
              <span class="stat-label">Freshness</span>
              <strong id="last-updated">Loading...</strong>
              <div class="subtle">Auto-cached for 5 minutes</div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid">
        <div class="panel" id="chat-panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">Ask Nacho</div>
              <h2>Chat workspace</h2>
              <div class="subtle">Press Enter to send. Use Shift+Enter for a new line.</div>
            </div>
            <div id="chat-status" class="status">Connecting...</div>
          </div>
          <div id="suggestions" class="suggestions"></div>
          <div id="chat-log" class="chat-log"></div>
          <form id="chat-form">
            <textarea id="chat-input" placeholder="Ask about the latest news, a general topic, or a math problem..." required></textarea>
            <button class="button button-primary" type="submit">Ask Nacho</button>
          </form>
        </div>

        <aside class="panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">Live Feed</div>
              <h2>Current headlines</h2>
            </div>
          </div>
          <div class="feed-tools">
            <button id="refresh-news" class="button button-primary" type="button">Refresh live feed</button>
          </div>
          <div id="source-badges" class="sources" style="margin-bottom: 14px;"></div>
          <div id="headline-list" class="headline-list"><div class="empty">Loading current headlines...</div></div>
        </aside>
      </section>
    </div>

    <script>
      const state = { articles: [], openAiConfigured: false };
      const suggestions = [
        "What are the biggest world headlines right now?",
        "Summarize the latest developments in global markets.",
        "Explain inflation in simple terms.",
        "What is (24 * 17) / 3?",
        "What is happening in the Middle East today?"
      ];

      const refreshButton = document.getElementById("refresh-news");
      const coverageCount = document.getElementById("coverage-count");
      const modelStatus = document.getElementById("model-status");
      const modelDetail = document.getElementById("model-detail");
      const lastUpdated = document.getElementById("last-updated");
      const chatStatus = document.getElementById("chat-status");
      const sourceBadges = document.getElementById("source-badges");
      const headlineList = document.getElementById("headline-list");
      const chatLog = document.getElementById("chat-log");
      const chatForm = document.getElementById("chat-form");
      const chatInput = document.getElementById("chat-input");
      const suggestionsContainer = document.getElementById("suggestions");

      renderSuggestions();
      setupSubmitShortcut();
      bootstrap();

      refreshButton.addEventListener("click", function () {
        loadNews(true);
      });

      chatForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const message = chatInput.value.trim();

        if (!message) return;

        appendMessage("You", message, [], true);
        chatInput.value = "";
        setStatus("Thinking...", false);

        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
          });
          const data = await response.json();

          if (!response.ok) throw new Error(data.error || "The chatbot request failed.");

          appendMessage("Nacho", data.answer, data.articles || [], false);
          applyChatStatus(data);
        } catch (error) {
          appendMessage("Nacho", "I ran into a server issue: " + error.message, [], false);
          setStatus("Connection issue", true);
        }
      });

      function setupSubmitShortcut() {
        chatInput.addEventListener("keydown", function (event) {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            chatForm.requestSubmit();
          }
        });
      }

      function renderSuggestions() {
        suggestionsContainer.innerHTML = "";
        for (const suggestion of suggestions) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "button button-secondary";
          button.textContent = suggestion;
          button.addEventListener("click", function () {
            chatInput.value = suggestion;
            chatInput.focus();
          });
          suggestionsContainer.appendChild(button);
        }
      }

      async function bootstrap() {
        appendMessage(
          "Nacho",
          "I'm ready for live news, general questions, and arithmetic-style math. Press Enter to send a message, or use Shift+Enter for a new line.",
          [],
          false
        );
        await loadNews(false);
      }

      async function loadNews(forceRefresh) {
        refreshButton.disabled = true;
        refreshButton.textContent = forceRefresh ? "Refreshing..." : "Refresh live feed";
        headlineList.innerHTML = '<div class="empty">Loading current headlines from reliable sources...</div>';

        try {
          const response = await fetch("/api/news" + (forceRefresh ? "?refresh=1" : ""));
          const data = await response.json();

          if (!response.ok) throw new Error(data.error || "Unable to load live news.");

          state.articles = data.articles || [];
          state.openAiConfigured = Boolean(data.openAiConfigured);

          coverageCount.textContent = data.sourceCount + " sources";
          modelStatus.textContent = data.openAiConfigured ? "AI reasoning enabled" : "Live news + local math";
          modelDetail.textContent = data.openAiConfigured
            ? "Using " + data.model + " for news, general questions, and math support"
            : "Add OPENAI_API_KEY to unlock richer general-question answers";
          lastUpdated.textContent = formatTimestamp(data.fetchedAt);
          setStatus(data.openAiConfigured ? "Ready for news, general, and math" : "News + math ready", !data.openAiConfigured);

          renderSources(data.sources || []);
          renderHeadlines(state.articles);
        } catch (error) {
          headlineList.innerHTML = '<div class="empty">Unable to load live headlines: ' + escapeHtml(error.message) + "</div>";
          modelStatus.textContent = "Feed error";
          modelDetail.textContent = "Check the server connection and try again.";
          setStatus("Feed error", true);
        } finally {
          refreshButton.disabled = false;
          refreshButton.textContent = "Refresh live feed";
        }
      }

      function setStatus(text, offline) {
        chatStatus.textContent = text;
        chatStatus.classList.toggle("offline", Boolean(offline));
      }

      function applyChatStatus(data) {
        if (data.queryType === "math") return setStatus("Math mode", true);
        if (data.usedModel && data.queryType === "general") return setStatus("General AI: " + data.model, false);
        if (data.usedModel && data.queryType === "news") return setStatus("Live news AI: " + data.model, false);
        if (data.queryType === "general") return setStatus("General mode needs API key", true);
        return setStatus("Source-grounded news mode", true);
      }

      function renderSources(sources) {
        sourceBadges.innerHTML = "";
        for (const source of sources) {
          const link = document.createElement("a");
          link.className = "source-pill";
          link.href = source.siteUrl;
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = source.name;
          sourceBadges.appendChild(link);
        }
      }

      function renderHeadlines(articles) {
        if (!articles.length) {
          headlineList.innerHTML = '<div class="empty">No headlines were returned from the configured feeds.</div>';
          return;
        }

        headlineList.innerHTML = "";
        for (const article of articles.slice(0, 12)) {
          const card = document.createElement("article");
          card.className = "headline-card";
          card.innerHTML =
            '<div class="headline-meta"><span>' +
            escapeHtml(article.source) +
            "</span><span>" +
            escapeHtml(formatTimestamp(article.publishedAt)) +
            '</span></div><a href="' +
            escapeAttribute(article.link) +
            '" target="_blank" rel="noreferrer"><h3>' +
            escapeHtml(article.title) +
            "</h3></a><p>" +
            escapeHtml(article.summary) +
            "</p>";
          headlineList.appendChild(card);
        }
      }

      function appendMessage(role, text, sources, isUser) {
        const article = document.createElement("article");
        article.className = "message" + (isUser ? " user" : "");
        article.innerHTML = '<div class="role">' + escapeHtml(role) + '</div><pre>' + escapeHtml(text) + "</pre>";

        if (sources.length) {
          const wrap = document.createElement("div");
          wrap.className = "sources";
          for (const source of sources) {
            const link = document.createElement("a");
            link.className = "source-pill";
            link.href = source.link;
            link.target = "_blank";
            link.rel = "noreferrer";
            link.textContent = source.source + ": " + source.title;
            wrap.appendChild(link);
          }
          article.appendChild(wrap);
        }

        chatLog.appendChild(article);
        chatLog.scrollTop = chatLog.scrollHeight;
      }

      function formatTimestamp(value) {
        if (!value) return "Unknown time";
        return new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        }).format(new Date(value));
      }

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function escapeAttribute(value) {
        return escapeHtml(value);
      }
    </script>
  </body>
</html>`;
}
