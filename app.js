const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const state = {
  articles: [],
  openAiConfigured: false
};

const suggestions = [
  "What are the biggest world headlines right now?",
  "Summarize the latest developments in global markets.",
  "Explain inflation in simple terms.",
  "What is (24 * 17) / 3?",
  "What is happening in the Middle East today?"
];

const refreshButton = document.querySelector("#refresh-news");
const coverageCount = document.querySelector("#coverage-count");
const modelStatus = document.querySelector("#model-status");
const modelDetail = document.querySelector("#model-detail");
const lastUpdated = document.querySelector("#last-updated");
const chatStatus = document.querySelector("#chat-status");
const sourceBadges = document.querySelector("#source-badges");
const headlineList = document.querySelector("#headline-list");
const chatLog = document.querySelector("#chat-log");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const suggestionsContainer = document.querySelector("#suggestions");
const messageTemplate = document.querySelector("#message-template");

renderSuggestions();
setupCursorGlow();
setupRevealAnimations();
setupTextareaSubmitShortcut();
bootstrap();

refreshButton.addEventListener("click", () => {
  loadNews(true);
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = chatInput.value.trim();

  if (!message) {
    return;
  }

  appendMessage("You", message, [], true);
  chatInput.value = "";
  chatStatus.textContent = "Thinking...";
  chatStatus.classList.remove("offline");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "The chatbot request failed.");
    }

    appendMessage("Nacho", data.answer, data.articles || []);
    applyChatStatus(data);
  } catch (error) {
    appendMessage("Nacho", `I ran into a server issue: ${error.message}`, []);
    chatStatus.textContent = "Connection issue";
    chatStatus.classList.add("offline");
  }
});

function setupTextareaSubmitShortcut() {
  chatInput.addEventListener("keydown", (event) => {
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
    button.className = "suggestion-chip";
    button.textContent = suggestion;
    button.addEventListener("click", () => {
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
    []
  );

  await loadNews(false);
}

async function loadNews(forceRefresh) {
  refreshButton.disabled = true;
  refreshButton.textContent = forceRefresh ? "Refreshing..." : "Refresh live feed";
  headlineList.innerHTML = `<div class="empty-state">Loading current headlines from reliable sources...</div>`;

  try {
    const response = await fetch(`/api/news${forceRefresh ? "?refresh=1" : ""}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load live news.");
    }

    state.articles = data.articles || [];
    state.openAiConfigured = Boolean(data.openAiConfigured);

    coverageCount.textContent = `${data.sourceCount} sources`;
    modelStatus.textContent = data.openAiConfigured ? "AI reasoning enabled" : "Live news + local math";
    modelDetail.textContent = data.openAiConfigured
      ? `Using ${data.model} for news, general questions, and math support`
      : "Add OPENAI_API_KEY to unlock richer general-question answers";
    lastUpdated.textContent = formatTimestamp(data.fetchedAt);
    chatStatus.textContent = data.openAiConfigured ? "Ready for news, general, and math" : "News + math ready";
    chatStatus.classList.toggle("offline", !data.openAiConfigured);

    renderSources(data.sources || []);
    renderHeadlines(state.articles);
  } catch (error) {
    headlineList.innerHTML = `<div class="empty-state">Unable to load live headlines: ${escapeHtml(error.message)}</div>`;
    modelStatus.textContent = "Feed error";
    modelDetail.textContent = "Check the server connection and try again.";
    chatStatus.textContent = "Feed error";
    chatStatus.classList.add("offline");
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh live feed";
  }
}

function applyChatStatus(data) {
  if (data.queryType === "math") {
    chatStatus.textContent = "Math mode";
    chatStatus.classList.add("offline");
    return;
  }

  if (data.usedModel && data.queryType === "general") {
    chatStatus.textContent = `General AI: ${data.model}`;
    chatStatus.classList.remove("offline");
    return;
  }

  if (data.usedModel && data.queryType === "news") {
    chatStatus.textContent = `Live news AI: ${data.model}`;
    chatStatus.classList.remove("offline");
    return;
  }

  if (data.queryType === "general") {
    chatStatus.textContent = "General mode needs API key";
    chatStatus.classList.add("offline");
    return;
  }

  chatStatus.textContent = "Source-grounded news mode";
  chatStatus.classList.add("offline");
}

function renderSources(sources) {
  sourceBadges.innerHTML = "";

  for (const source of sources) {
    const link = document.createElement("a");
    link.className = "source-chip";
    link.href = source.siteUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.name;
    sourceBadges.appendChild(link);
  }
}

function renderHeadlines(articles) {
  if (!articles.length) {
    headlineList.innerHTML = `<div class="empty-state">No headlines were returned from the configured feeds.</div>`;
    return;
  }

  headlineList.innerHTML = "";

  for (const article of articles.slice(0, 12)) {
    const card = document.createElement("article");
    card.className = "headline-card";
    card.innerHTML = `
      <div class="headline-meta">
        <span>${escapeHtml(article.source)}</span>
        <span>${escapeHtml(formatTimestamp(article.publishedAt))}</span>
      </div>
      <a href="${escapeAttribute(article.link)}" target="_blank" rel="noreferrer">
        <h3>${escapeHtml(article.title)}</h3>
      </a>
      <p>${escapeHtml(article.summary)}</p>
    `;
    headlineList.appendChild(card);
  }
}

function appendMessage(role, text, sources, isUser = false) {
  const fragment = messageTemplate.content.cloneNode(true);
  const message = fragment.querySelector(".message");
  const roleElement = fragment.querySelector(".message-role");
  const bodyElement = fragment.querySelector(".message-body");
  const sourcesElement = fragment.querySelector(".message-sources");

  if (isUser) {
    message.classList.add("user");
  }

  roleElement.textContent = role;
  bodyElement.textContent = text;
  sourcesElement.innerHTML = "";

  for (const source of sources) {
    const link = document.createElement("a");
    link.className = "source-link";
    link.href = source.link;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `${source.source}: ${source.title}`;
    sourcesElement.appendChild(link);
  }

  if (!sources.length) {
    sourcesElement.style.display = "none";
  }

  chatLog.appendChild(fragment);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function setupCursorGlow() {
  const cursorGlow = document.querySelector(".cursor-glow");

  if (!cursorGlow || prefersReducedMotion.matches) {
    return;
  }

  let rafId = null;
  let pointer = { x: 0, y: 0 };

  const render = () => {
    cursorGlow.style.left = `${pointer.x}px`;
    cursorGlow.style.top = `${pointer.y}px`;
    rafId = null;
  };

  document.addEventListener("mousemove", (event) => {
    pointer = { x: event.clientX, y: event.clientY };

    if (rafId === null) {
      rafId = window.requestAnimationFrame(render);
    }
  });
}

function setupRevealAnimations() {
  const targets = document.querySelectorAll(".reveal");

  if (!targets.length) {
    return;
  }

  if (prefersReducedMotion.matches) {
    targets.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -40px 0px"
    }
  );

  targets.forEach((element) => observer.observe(element));
}

function formatTimestamp(value) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
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
