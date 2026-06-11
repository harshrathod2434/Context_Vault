const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
let GROQ_API_KEY = null;

const jsonSystem = "You are a JSON-only responder. Return ONLY a valid JSON object. No markdown, no backticks, no explanation, no preamble. Just the raw JSON.";

const defaultClassification = {
  title: "Untitled Memory",
  summary: "",
  type: "General Note",
  intent: "",
  topic: "",
  tags: [],
  sensitivity: "low",
  usefulnessScore: 0,
  suggestedNextAction: ""
};

const defaultContextPack = {
  whatImWorkingOn: "",
  relevantBackground: "",
  recentContext: "",
  importantDecisions: "",
  suggestedNextStep: "",
  aiPrompt: ""
};

function setApiKey(key) {
  GROQ_API_KEY = key;
}

function hasApiKey() {
  return Boolean(GROQ_API_KEY);
}

function headers() {
  if (!GROQ_API_KEY) throw new Error("Missing Groq API key");
  return {
    Authorization: `Bearer ${GROQ_API_KEY}`,
    "Content-Type": "application/json"
  };
}

async function chat(messages, { json = false, temperature = 0.2 } = {}) {
  const body = {
    model: MODEL,
    messages,
    temperature
  };
  if (json) body.response_format = { type: "json_object" };
  const response = await axios.post(GROQ_URL, body, { headers: headers(), timeout: 45000 });
  return response.data?.choices?.[0]?.message?.content || "";
}

function cleanJson(text) {
  return String(text || "").replace(/```json|```/g, "").trim();
}

async function jsonCall(messages, fallback, validator) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await chat(messages, { json: true });
      const parsed = JSON.parse(cleanJson(text));
      return validator ? validator(parsed) : parsed;
    } catch (error) {
      if (attempt === 1) {
        console.error("Groq JSON parse/call failed", error);
      }
    }
  }
  return { ...fallback };
}

function validateClassification(parsed) {
  const out = { ...defaultClassification, ...parsed };
  if (!Array.isArray(out.tags)) out.tags = [];
  if (!["low", "medium", "high"].includes(out.sensitivity)) out.sensitivity = "low";
  out.usefulnessScore = Math.max(0, Math.min(10, Number(out.usefulnessScore) || 0));
  return out;
}

function validateContextPack(parsed) {
  return { ...defaultContextPack, ...parsed };
}

async function testApiKey(key) {
  const previous = GROQ_API_KEY;
  GROQ_API_KEY = key;
  try {
    await chat([
      { role: "system", content: "Reply with one short word." },
      { role: "user", content: "ping" }
    ]);
    return true;
  } catch (error) {
    console.error("Groq key test failed", error.message);
    GROQ_API_KEY = previous;
    return false;
  }
}

function stripHeavyFields(rawContext) {
  const { screenshot, ...lightweight } = rawContext || {};
  return lightweight;
}

async function classifyMemory(rawContext) {
  const system = `${jsonSystem} Analyze the provided desktop context and classify it.

IMPORTANT: Write everything in FIRST PERSON as if you ARE the person. Use "I" and "my", never "the user" or "they".
Focus on WHAT is being built/worked on, not on describing actions like "copied" or "clicked".

Return exactly:
{
  "title": "Short title of what I am working on (e.g. 'Building auto-capture feature')",
  "summary": "2-3 sentence first-person summary focused on the project/task context, not actions",
  "type": "Task|Project|Research|Coding|Bug|Meeting|Writing|Design|Decision|Prompt|General Note",
  "intent": "What I am trying to accomplish",
  "topic": "Main subject or domain area",
  "tags": ["tag1", "tag2", "tag3"],
  "sensitivity": "low|medium|high",
  "usefulnessScore": 7,
  "suggestedNextAction": "Specific actionable next step"
}

Sensitivity rules:
- "high" if content contains passwords, API keys, tokens, personal health info, financial data, private messages, credentials, SSNs, or card numbers
- "medium" if content contains names, emails, internal project names, or phone numbers
- "low" for everything else`;

  return jsonCall([
    { role: "system", content: system },
    { role: "user", content: JSON.stringify(stripHeavyFields(rawContext)) }
  ], defaultClassification, validateClassification);
}

async function summarizeContext(rawContext) {
  return chat([
    { role: "system", content: "Write one clean paragraph in FIRST PERSON summarizing what I am working on. Focus on the project/task context, not on actions like 'I copied' or 'I clicked'. Use 'I' and 'my'. No markdown." },
    { role: "user", content: JSON.stringify(stripHeavyFields(rawContext)) }
  ], { temperature: 0.2 });
}

async function generateContextPack(memoriesArray) {
  const system = `${jsonSystem}

You are generating a VERY DETAILED context pack from captured work memories. Be thorough and comprehensive — the user will paste this into an AI assistant and needs FULL context to continue their work effectively.

IMPORTANT: Write everything in FIRST PERSON. Use "I" and "my", never "the user".

Return exactly:
{
  "whatImWorkingOn": "A detailed 3-5 sentence description of the project/task. Include the tech stack, frameworks, languages, tools, and specific features being built. Be specific — mention file names, function names, and component names if available.",
  "relevantBackground": "4-6 sentences of background context. Include architecture decisions, dependencies, APIs being used, design patterns, and any constraints or requirements discovered. Mention specific URLs, documentation, or resources referenced.",
  "recentContext": "5-8 sentences covering the most recent work in detail. What files were edited, what problems were encountered, what solutions were tried, what code was written or modified. Include specific technical details.",
  "importantDecisions": "3-5 sentences about key decisions made during the session. Include trade-offs considered, alternatives rejected, and rationale for chosen approaches.",
  "suggestedNextStep": "2-3 specific, actionable next steps with enough detail that someone could immediately start working on them.",
  "aiPrompt": "A comprehensive, ready-to-paste prompt (at least 300 words) for ChatGPT/Claude/Gemini. Start with 'I am working on...' and include: full project description, tech stack, current state, what was accomplished, specific problems or questions, and what help is needed. Include all relevant technical details, file names, URLs, and code patterns. This should give the AI enough context to provide immediately useful help without asking clarifying questions."
}`;

  const lightweight = (memoriesArray || []).map((m) => ({
    title: m.title,
    summary: m.summary,
    type: m.type,
    intent: m.intent,
    topic: m.topic,
    tags: m.tags,
    sourceApp: m.sourceApp,
    windowTitle: m.windowTitle,
    url: m.url,
    createdAt: m.createdAt,
    captureCount: m.captureCount,
  }));

  return jsonCall([
    { role: "system", content: system },
    { role: "user", content: JSON.stringify(lightweight) }
  ], defaultContextPack, validateContextPack);
}

async function summarizeSession(subMemories) {
  const entries = subMemories.map((m) => {
    const time = new Date(m.createdAt).toLocaleTimeString();
    if (m.type === "Clipboard" || m.type === "Selection") {
      return `[${time}] Relevant text: ${m.summary}`;
    }
    return `[${time}] ${m.sourceApp || ""} — ${m.title}: ${m.summary}`;
  });

  const prompt = `Here is a chronological log from my work session:\n\n${entries.join("\n")}\n\nWrite a VERY DETAILED first-person context summary (at least 250 words) that I can paste into ChatGPT/Claude/Gemini. Include:\n1. What I am building — project name, tech stack, frameworks, specific features\n2. All key technical details — file names, function names, APIs, URLs, component names\n3. What I accomplished in this session — specific changes, code written, problems solved\n4. Important information I referenced or found — documentation, code snippets, research\n5. Current state — where exactly I left off, what's working, what's not\n6. Specific next steps — actionable items with enough detail to continue immediately\n\nDo NOT describe actions like 'I copied' or 'I opened'. Focus on the PROJECT CONTEXT and technical details. Be comprehensive — the AI reading this should be able to help me immediately without asking clarifying questions.`;

  return chat([
    {
      role: "system",
      content: "Write a comprehensive, detailed first-person project context summary (250+ words). Start with 'I am building/working on...' and include every technical detail available — tech stack, file names, URLs, APIs, specific code patterns. Focus on WHAT is being built and the full technical context, NOT on narrating actions. Never say 'the user'. No markdown. Be thorough."
    },
    { role: "user", content: prompt }
  ], { temperature: 0.3 });
}

async function chatWithMemories(query, memories) {
  const context = memories.map((m) => {
    const date = new Date(m.createdAt).toLocaleString();
    const parts = [`[${date}]`];
    if (m.sourceApp) parts.push(`App: ${m.sourceApp}`);
    if (m.url) parts.push(`URL: ${m.url}`);
    parts.push(`${m.title}: ${m.summary}`);
    if (m.captureCount > 0) parts.push(`(Session with ${m.captureCount} captures)`);
    return parts.join(" | ");
  }).join("\n");

  return chat([
    {
      role: "system",
      content: `You are an AI assistant embedded inside a productivity app called ContextVault. You have access to the user's captured memories — screenshots, clipboard entries, browser activity, and app usage. Answer their questions about what they worked on, when, and with what tools. Be specific, reference dates and apps. Write in a friendly, concise style. No markdown.

Here are the relevant memories:\n${context}`
    },
    { role: "user", content: query }
  ], { temperature: 0.4 });
}

module.exports = {
  setApiKey,
  hasApiKey,
  testApiKey,
  classifyMemory,
  summarizeContext,
  generateContextPack,
  summarizeSession,
  chatWithMemories,
};
