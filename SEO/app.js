const STORAGE_KEY = "rankpilot-ai-state";

const templates = {
  "higher-ed": {
    label: "Higher education",
    modifier: 1.15,
    audiences: ["working professionals", "international students", "career switchers"],
    proof: ["accreditation", "placement data", "faculty credibility"]
  },
  "test-prep": {
    label: "Test preparation",
    modifier: 1.05,
    audiences: ["exam aspirants", "parents", "repeat test takers"],
    proof: ["score improvement", "mock tests", "mentor support"]
  },
  professional: {
    label: "Professional courses",
    modifier: 1.12,
    audiences: ["job seekers", "upskillers", "team leaders"],
    proof: ["certification value", "hands-on projects", "career support"]
  },
  k12: {
    label: "K-12 learning",
    modifier: 0.96,
    audiences: ["parents", "students", "school counselors"],
    proof: ["personalized learning", "teacher quality", "progress tracking"]
  }
};

const marketSignals = {
  us: { label: "United States", volume: 1.18, suffixes: ["in the US", "online", "accredited"] },
  india: { label: "India", volume: 1.28, suffixes: ["in India", "fees", "online"] },
  uk: { label: "United Kingdom", volume: 0.82, suffixes: ["in the UK", "requirements", "distance learning"] },
  global: { label: "Global", volume: 1, suffixes: ["online", "international", "remote"] }
};

const clusterBlueprints = [
  {
    id: "admissions",
    name: "Admissions and Eligibility",
    pageType: "Admission guide",
    stage: "Consideration",
    intentBias: "transactional",
    angle: "reduce uncertainty around entry requirements and application steps",
    variants: ["eligibility", "requirements", "admission process", "application deadline", "apply online", "documents needed", "entry criteria"]
  },
  {
    id: "fees",
    name: "Fees and ROI",
    pageType: "Comparison article",
    stage: "Decision",
    intentBias: "commercial",
    angle: "connect tuition, scholarship options, and career return",
    variants: ["fees", "cost", "scholarships", "financial aid", "affordable", "payment plans", "return on investment"]
  },
  {
    id: "comparison",
    name: "Program Comparisons",
    pageType: "Best-of list",
    stage: "Evaluation",
    intentBias: "commercial",
    angle: "help searchers compare providers, formats, and credibility signals",
    variants: ["best", "ranking", "top colleges", "reviews", "online vs offline", "duration", "syllabus"]
  },
  {
    id: "outcomes",
    name: "Career Outcomes",
    pageType: "Career guide",
    stage: "Awareness",
    intentBias: "informational",
    angle: "show job roles, salary expectations, and career mobility",
    variants: ["salary", "career scope", "jobs after", "placement", "skills gained", "job roles", "career growth"]
  }
];

const state = {
  keywords: [],
  clusters: [],
  selectedClusterId: "admissions",
  planner: [],
  form: {
    seedKeyword: "online MBA programs",
    segment: "higher-ed",
    market: "us",
    goal: "lead",
    intentFocus: "balanced"
  }
};

const els = {
  form: document.querySelector("#analysisForm"),
  seedKeyword: document.querySelector("#seedKeyword"),
  segment: document.querySelector("#segment"),
  market: document.querySelector("#market"),
  goal: document.querySelector("#goal"),
  resetBtn: document.querySelector("#resetBtn"),
  tabs: document.querySelectorAll(".tab"),
  views: {
    research: document.querySelector("#researchView"),
    clusters: document.querySelector("#clustersView"),
    brief: document.querySelector("#briefView"),
    planner: document.querySelector("#plannerView")
  },
  scoreMetric: document.querySelector("#scoreMetric"),
  scoreHint: document.querySelector("#scoreHint"),
  keywordMetric: document.querySelector("#keywordMetric"),
  keywordHint: document.querySelector("#keywordHint"),
  intentMetric: document.querySelector("#intentMetric"),
  intentBars: document.querySelector("#intentBars"),
  keywordRows: document.querySelector("#keywordRows"),
  keywordSearch: document.querySelector("#keywordSearch"),
  intentFilter: document.querySelector("#intentFilter"),
  clusterGrid: document.querySelector("#clusterGrid"),
  clusterOptions: document.querySelector("#clusterOptions"),
  briefTitle: document.querySelector("#briefTitle"),
  briefOutput: document.querySelector("#briefOutput"),
  copyBriefBtn: document.querySelector("#copyBriefBtn"),
  downloadBriefBtn: document.querySelector("#downloadBriefBtn"),
  addPlanBtn: document.querySelector("#addPlanBtn"),
  plannerGrid: document.querySelector("#plannerGrid"),
  toast: document.querySelector("#toast")
};

function hashText(value) {
  return Array.from(value).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function readForm() {
  const formData = new FormData(els.form);
  state.form = {
    seedKeyword: els.seedKeyword.value.trim() || "online MBA programs",
    segment: els.segment.value,
    market: els.market.value,
    goal: els.goal.value,
    intentFocus: formData.get("intentFocus") || "balanced"
  };
}

function applyFormValues() {
  els.seedKeyword.value = state.form.seedKeyword;
  els.segment.value = state.form.segment;
  els.market.value = state.form.market;
  els.goal.value = state.form.goal;
  const focusInput = document.querySelector(`input[name="intentFocus"][value="${state.form.intentFocus}"]`);
  if (focusInput) focusInput.checked = true;
}

function classifyIntent(keyword, fallback) {
  const value = keyword.toLowerCase();
  const transactionalSignals = ["apply", "admission", "deadline", "enroll", "documents", "near me"];
  const commercialSignals = ["best", "fees", "cost", "scholarship", "affordable", "ranking", "reviews", "top", "roi"];

  if (transactionalSignals.some((signal) => value.includes(signal))) return "transactional";
  if (commercialSignals.some((signal) => value.includes(signal))) return "commercial";
  if (fallback) return fallback;
  return "informational";
}

function makeKeyword(seed, variant, blueprint, index, context) {
  const market = marketSignals[context.market];
  const segment = templates[context.segment];
  const suffix = market.suffixes[index % market.suffixes.length];
  const prefix = ["best", "how to choose", "accredited", "top"][index % 4];
  const phrase = variant === "best"
    ? `${prefix} ${seed}`
    : `${seed} ${variant}`;
  const keyword = index % 3 === 0 ? `${phrase} ${suffix}` : phrase;
  const intent = classifyIntent(keyword, blueprint.intentBias);
  const noise = Math.abs(hashText(`${keyword}-${context.goal}`)) % 900;
  const baseVolume = Math.round((850 + noise * 6) * market.volume * segment.modifier);
  const difficulty = clamp(28 + (Math.abs(hashText(keyword)) % 52), 18, 84);
  const conversionWeight = intent === "transactional" ? 1.18 : intent === "commercial" ? 1.08 : 0.92;
  const authorityWeight = intent === "informational" ? 1.16 : intent === "commercial" ? 1.03 : 0.94;
  const focusWeight = context.intentFocus === "conversion"
    ? conversionWeight
    : context.intentFocus === "authority"
      ? authorityWeight
      : 1;
  const goalWeight = context.goal === "lead" && intent !== "informational" ? 1.08 : context.goal === "authority" && intent === "informational" ? 1.1 : 1;
  const volumeScore = clamp(baseVolume / 95, 14, 58);
  const difficultyScore = 42 - difficulty * 0.36;
  const priority = Math.round(clamp((volumeScore + difficultyScore + 28) * focusWeight * goalWeight, 32, 96));

  return {
    id: `${blueprint.id}-${slugify(keyword)}`,
    keyword,
    intent,
    clusterId: blueprint.id,
    clusterName: blueprint.name,
    pageType: blueprint.pageType,
    volume: baseVolume,
    difficulty,
    priority
  };
}

function buildProject() {
  const context = state.form;
  const seed = context.seedKeyword.toLowerCase();
  const keywords = [];

  clusterBlueprints.forEach((blueprint) => {
    blueprint.variants.forEach((variant, index) => {
      keywords.push(makeKeyword(seed, variant, blueprint, index, context));
    });
  });

  state.keywords = keywords.sort((a, b) => b.priority - a.priority);
  state.clusters = clusterBlueprints.map((blueprint) => {
    const clusterKeywords = state.keywords.filter((keyword) => keyword.clusterId === blueprint.id);
    const avgPriority = Math.round(clusterKeywords.reduce((sum, keyword) => sum + keyword.priority, 0) / clusterKeywords.length);
    const totalVolume = clusterKeywords.reduce((sum, keyword) => sum + keyword.volume, 0);
    const avgDifficulty = Math.round(clusterKeywords.reduce((sum, keyword) => sum + keyword.difficulty, 0) / clusterKeywords.length);
    const topKeywords = clusterKeywords.slice(0, 5);

    return {
      ...blueprint,
      avgPriority,
      totalVolume,
      avgDifficulty,
      topKeywords
    };
  }).sort((a, b) => b.avgPriority - a.avgPriority);

  if (!state.clusters.some((cluster) => cluster.id === state.selectedClusterId)) {
    state.selectedClusterId = state.clusters[0].id;
  }
}

function getSelectedCluster() {
  return state.clusters.find((cluster) => cluster.id === state.selectedClusterId) || state.clusters[0];
}

function renderSummary() {
  const score = Math.round(state.clusters.reduce((sum, cluster) => sum + cluster.avgPriority, 0) / state.clusters.length);
  const highIntentCount = state.keywords.filter((keyword) => keyword.intent !== "informational").length;
  const intentCoverage = Math.round((highIntentCount / state.keywords.length) * 100);
  const bestCluster = state.clusters[0];

  els.scoreMetric.textContent = score;
  els.scoreHint.textContent = `${bestCluster.name} leads the plan`;
  els.keywordMetric.textContent = state.keywords.length;
  els.keywordHint.textContent = `Across ${state.clusters.length} clusters`;
  els.intentMetric.textContent = `${intentCoverage}%`;

  const intentCounts = ["informational", "commercial", "transactional"].map((intent) => ({
    intent,
    count: state.keywords.filter((keyword) => keyword.intent === intent).length
  }));

  const colorMap = {
    informational: "#3867d6",
    commercial: "#2f9b6d",
    transactional: "#d99228"
  };

  els.intentBars.innerHTML = intentCounts.map(({ intent, count }) => {
    const percent = Math.round((count / state.keywords.length) * 100);
    return `
      <div class="bar-line">
        <span>${titleCase(intent)}</span>
        <div class="bar-track"><div class="bar-fill" style="--value: ${percent}%; --color: ${colorMap[intent]}"></div></div>
        <b>${percent}%</b>
      </div>
    `;
  }).join("");
}

function renderKeywordRows() {
  const query = els.keywordSearch.value.trim().toLowerCase();
  const intent = els.intentFilter.value;
  const filtered = state.keywords.filter((keyword) => {
    const matchesQuery = keyword.keyword.toLowerCase().includes(query) || keyword.clusterName.toLowerCase().includes(query);
    const matchesIntent = intent === "all" || keyword.intent === intent;
    return matchesQuery && matchesIntent;
  });

  els.keywordRows.innerHTML = filtered.map((keyword) => `
    <tr>
      <td>
        <div class="keyword-cell">
          <strong>${keyword.keyword}</strong>
          <small>${keyword.pageType}</small>
        </div>
      </td>
      <td><span class="pill intent-${keyword.intent}">${titleCase(keyword.intent)}</span></td>
      <td>${keyword.clusterName}</td>
      <td>${formatNumber(keyword.volume)}</td>
      <td>${keyword.difficulty}</td>
      <td>
        <div class="priority">
          <span>${keyword.priority}</span>
          <div class="priority-track"><div class="priority-fill" style="--value: ${keyword.priority}%"></div></div>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderClusters() {
  els.clusterGrid.innerHTML = state.clusters.map((cluster) => `
    <article class="cluster-card">
      <header>
        <div>
          <p class="eyebrow">${cluster.pageType}</p>
          <h3>${cluster.name}</h3>
        </div>
        <span class="pill intent-${cluster.intentBias}">${cluster.avgPriority}</span>
      </header>
      <p>${cluster.angle}.</p>
      <div class="cluster-meta">
        <span>Total volume <strong>${formatNumber(cluster.totalVolume)}</strong></span>
        <span>Difficulty <strong>${cluster.avgDifficulty}</strong></span>
        <span>Stage <strong>${cluster.stage}</strong></span>
      </div>
      <div class="keyword-chips">
        ${cluster.topKeywords.map((keyword) => `<span class="pill intent-${keyword.intent}">${keyword.keyword}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

function renderClusterOptions() {
  els.clusterOptions.innerHTML = state.clusters.map((cluster) => `
    <button class="cluster-option ${cluster.id === state.selectedClusterId ? "active" : ""}" type="button" data-cluster="${cluster.id}">
      <strong>${cluster.name}</strong>
      <span>${formatNumber(cluster.totalVolume)} searches | ${cluster.pageType}</span>
    </button>
  `).join("");

  els.clusterOptions.querySelectorAll(".cluster-option").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedClusterId = button.dataset.cluster;
      renderClusterOptions();
      renderBrief();
      saveState();
    });
  });
}

function createBrief(cluster) {
  const segment = templates[state.form.segment];
  const market = marketSignals[state.form.market];
  const seed = state.form.seedKeyword.toLowerCase();
  const topKeyword = cluster.topKeywords[0]?.keyword || `${seed} guide`;
  const supportKeywords = cluster.topKeywords.slice(1, 5).map((keyword) => keyword.keyword);
  const audience = segment.audiences[Math.abs(hashText(cluster.id + seed)) % segment.audiences.length];
  const proof = segment.proof[Math.abs(hashText(seed + cluster.id)) % segment.proof.length];

  return {
    title: `${titleCase(topKeyword)}: Complete ${market.label} Guide`,
    meta: `Compare ${seed} options, costs, requirements, and outcomes with a practical guide built for ${audience}.`,
    h1: `${titleCase(topKeyword)} Guide for ${titleCase(market.label)}`,
    audience,
    angle: `Position the article around ${cluster.angle}, then use ${proof} as the credibility anchor.`,
    outline: [
      `Search intent snapshot for ${topKeyword}`,
      `Who should consider ${seed}`,
      `${titleCase(cluster.name)} factors to compare`,
      `Shortlist framework with cost, credibility, and outcomes`,
      "Next steps, lead magnet, and consultation CTA"
    ],
    faqs: [
      `What is the best way to evaluate ${seed}?`,
      `How much does ${seed} usually cost?`,
      `What requirements should applicants check first?`,
      `Which outcomes matter most before enrolling?`
    ],
    draft: `Searchers comparing ${seed} are usually past casual research and looking for practical confidence. This content should answer the core query quickly, show the tradeoffs behind each option, and move readers toward a shortlist. Use clear comparison tables, proof points, and a focused CTA so the page can rank for ${supportKeywords[0] || topKeyword} while still supporting lead generation.`,
    internalLinks: [
      `/${slugify(seed)}/admissions`,
      `/${slugify(seed)}/fees`,
      `/${slugify(seed)}/career-outcomes`
    ]
  };
}

function renderBrief() {
  const cluster = getSelectedCluster();
  const brief = createBrief(cluster);

  els.briefTitle.textContent = brief.title;
  els.briefOutput.innerHTML = `
    <section class="brief-block">
      <h3>Meta Description</h3>
      <p>${brief.meta}</p>
    </section>
    <section class="brief-block">
      <h3>H1</h3>
      <p>${brief.h1}</p>
    </section>
    <section class="brief-block">
      <h3>Audience and Angle</h3>
      <p><strong>${titleCase(brief.audience)}</strong> - ${brief.angle}</p>
    </section>
    <section class="brief-block">
      <h3>Outline</h3>
      <ol>${brief.outline.map((item) => `<li>${item}</li>`).join("")}</ol>
    </section>
    <section class="brief-block">
      <h3>FAQs</h3>
      <ul>${brief.faqs.map((item) => `<li>${item}</li>`).join("")}</ul>
    </section>
    <section class="brief-block">
      <h3>Article Draft</h3>
      <p>${brief.draft}</p>
    </section>
    <section class="brief-block">
      <h3>Internal Links</h3>
      <ul>${brief.internalLinks.map((item) => `<li>${item}</li>`).join("")}</ul>
    </section>
  `;
}

function briefToMarkdown() {
  const cluster = getSelectedCluster();
  const brief = createBrief(cluster);
  const keywordList = cluster.topKeywords.map((keyword) => `- ${keyword.keyword} (${titleCase(keyword.intent)}, priority ${keyword.priority})`).join("\n");

  return `# ${brief.title}

## Meta Description
${brief.meta}

## H1
${brief.h1}

## Target Keywords
${keywordList}

## Audience and Angle
${titleCase(brief.audience)} - ${brief.angle}

## Outline
${brief.outline.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## FAQs
${brief.faqs.map((item) => `- ${item}`).join("\n")}

## Article Draft
${brief.draft}

## Internal Links
${brief.internalLinks.map((item) => `- ${item}`).join("\n")}
`;
}

async function copyBrief() {
  const text = briefToMarkdown();

  try {
    await navigator.clipboard.writeText(text);
    showToast("Brief copied to clipboard.");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    showToast("Brief copied to clipboard.");
  }
}

function downloadBrief() {
  const cluster = getSelectedCluster();
  const blob = new Blob([briefToMarkdown()], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rankpilot-${slugify(cluster.name)}-brief.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Markdown brief exported.");
}

function buildDefaultPlanner() {
  return state.clusters.slice(0, 4).map((cluster, index) => ({
    id: `${cluster.id}-${Date.now()}-${index}`,
    title: `${cluster.pageType}: ${cluster.name}`,
    clusterId: cluster.id,
    status: index === 0 ? "Brief ready" : index === 1 ? "Outline" : "Research",
    priority: cluster.avgPriority,
    due: formatDateOffset((index + 1) * 7),
    channel: index % 2 === 0 ? "Blog" : "Landing page"
  }));
}

function formatDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function addSelectedBriefToPlanner() {
  const cluster = getSelectedCluster();
  const existing = state.planner.some((item) => item.clusterId === cluster.id && item.title.includes(cluster.name));
  if (existing) {
    showToast("That cluster is already in the publishing plan.");
    return;
  }

  state.planner.unshift({
    id: `${cluster.id}-${Date.now()}`,
    title: `${cluster.pageType}: ${cluster.name}`,
    clusterId: cluster.id,
    status: "Brief ready",
    priority: cluster.avgPriority,
    due: formatDateOffset(5),
    channel: cluster.intentBias === "transactional" ? "Landing page" : "Blog"
  });
  renderPlanner();
  saveState();
  showToast("Brief added to the publishing plan.");
}

function renderPlanner() {
  els.plannerGrid.innerHTML = state.planner.map((item) => {
    const cluster = state.clusters.find((entry) => entry.id === item.clusterId) || state.clusters[0];
    return `
      <article class="panel plan-card">
        <div>
          <p class="eyebrow">${item.status}</p>
          <h3>${item.title}</h3>
        </div>
        <p>${cluster.angle}.</p>
        <div class="plan-meta">
          <span class="pill intent-${cluster.intentBias}">${item.channel}</span>
          <span class="pill intent-commercial">Priority ${item.priority}</span>
          <span class="pill intent-informational">${item.due}</span>
        </div>
      </article>
    `;
  }).join("");
}

function switchView(view) {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  Object.entries(els.views).forEach(([name, element]) => {
    element.classList.toggle("active", name === view);
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    form: state.form,
    selectedClusterId: state.selectedClusterId,
    planner: state.planner
  }));
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;

  try {
    const parsed = JSON.parse(stored);
    state.form = { ...state.form, ...parsed.form };
    state.selectedClusterId = parsed.selectedClusterId || state.selectedClusterId;
    state.planner = Array.isArray(parsed.planner) ? parsed.planner : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function renderAll() {
  renderSummary();
  renderKeywordRows();
  renderClusters();
  renderClusterOptions();
  renderBrief();
  renderPlanner();
}

function resetDemo() {
  localStorage.removeItem(STORAGE_KEY);
  state.form = {
    seedKeyword: "online MBA programs",
    segment: "higher-ed",
    market: "us",
    goal: "lead",
    intentFocus: "balanced"
  };
  state.selectedClusterId = "admissions";
  applyFormValues();
  buildProject();
  state.planner = buildDefaultPlanner();
  renderAll();
  showToast("Demo workspace reset.");
}

function init() {
  loadState();
  applyFormValues();
  buildProject();
  if (!state.planner.length) {
    state.planner = buildDefaultPlanner();
  }
  renderAll();

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    readForm();
    buildProject();
    state.planner = buildDefaultPlanner();
    renderAll();
    saveState();
    showToast("Keyword map and content brief refreshed.");
  });

  els.resetBtn.addEventListener("click", resetDemo);
  els.keywordSearch.addEventListener("input", renderKeywordRows);
  els.intentFilter.addEventListener("change", renderKeywordRows);
  els.copyBriefBtn.addEventListener("click", copyBrief);
  els.downloadBriefBtn.addEventListener("click", downloadBrief);
  els.addPlanBtn.addEventListener("click", addSelectedBriefToPlanner);
  els.tabs.forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
}

init();
