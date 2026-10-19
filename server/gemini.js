// ======================================
// Gemini Activity Generator
// ======================================
// Turns either rough developer notes ("polish" mode) or just a project name
// ("generate" mode) into formal status-report sentences.
//
// Node 22 has global fetch, so this talks to the REST endpoint directly and
// needs no SDK. The API key stays here on the server and is never sent to the
// browser.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Tried in order. The newest flash models intermittently return 503 under
// load, so a couple of alternates keep the feature usable when that happens.
// gemini-3.1-flash-lite answers in ~1s; gemini-3.6-flash is slower but sturdier.
const DEFAULT_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
];

const REQUEST_TIMEOUT_MS = 20000;

const SYSTEM_INSTRUCTION = `You write the "ACTIVITIES" lines of a software engineer's daily status report at an Indian IT services company.

Rules for every sentence you produce:
- Formal, professional business English.
- Past tense, starting with a verb such as Implemented, Developed, Enhanced, Integrated, Resolved, Refactored, Optimized, Worked on.
- Exactly one sentence, ending with a full stop.
- Between 12 and 30 words. Specific about the module or feature, never vague filler.
- No numbering, no bullet characters, no markdown, no leading or trailing whitespace.
- Never mention AI, prompts, or that the text was generated.
- Do not address anyone or add any preamble.`;

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// Models occasionally sneak in numbering or stray bullets despite the schema.
const cleanSentence = (raw) => {
  if (typeof raw !== "string") return "";

  let text = raw.replace(/\s+/g, " ").trim();
  text = text.replace(/^(?:\d+[.)]|[-*•])\s*/, "");
  text = text.trim();

  if (text && !/[.!?]$/.test(text)) {
    text += ".";
  }

  return text;
};

const buildPrompt = ({ project, notes, count, examples }) => {
  const lines = [];

  lines.push(`Project name: ${project}`);
  lines.push("");

  if (notes) {
    // Polish mode. The examples are style anchors only — the substance has to
    // come from the engineer's own notes.
    if (examples.length) {
      lines.push(
        "Match the tone, length and level of detail of these existing entries from this project:"
      );
      examples.forEach((example) => lines.push(`- ${example}`));
      lines.push("");
    }

    lines.push("The engineer's rough notes for today:");
    lines.push(notes);
    lines.push("");
    lines.push(
      `Rewrite these notes into exactly ${count} polished status sentences. Stay faithful to what the notes actually say — do not invent work that is not mentioned. If a single note covers several distinct tasks you may split it; if there are more notes than ${count} sentences, combine the closely related ones.`
    );

    return lines.join("\n");
  }

  // Generate mode. Free-form invention drifts badly — a small model asked for
  // "a typical day on WHRP" will happily report work on an Inventory module
  // that does not exist. So it picks from the project's real activity list and
  // only rewords, which keeps every sentence grounded in a real module.
  lines.push("Here is the list of real activities carried out on this project:");
  examples.forEach((example, index) => lines.push(`${index + 1}. ${example}`));
  lines.push("");
  lines.push(
    `Choose exactly ${count} different entries from the list above and rewrite each one in your own words. Keep the same module, feature and type of work as the entry you chose — only the wording should change. Do not merge entries, and do not mention any module or feature that does not appear in the list.`
  );

  return lines.join("\n");
};

const requestBody = (prompt, count) => ({
  systemInstruction: {
    parts: [{ text: SYSTEM_INSTRUCTION }],
  },
  contents: [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ],
  generationConfig: {
    temperature: 0.9,
    responseMimeType: "application/json",
    responseSchema: {
      type: "array",
      items: { type: "string" },
      minItems: count,
      maxItems: count,
    },
  },
});

const callModel = async (model, apiKey, body) => {
  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = (data.error && data.error.message) || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(text);
};

// Overloaded / rate-limited models are worth retrying on the next candidate.
// A 400 or 404 means the request itself is wrong, so retrying is pointless.
const isRetryable = (status) => status === 429 || status === 500 || status === 503;

const generateActivities = async ({
  project,
  notes = "",
  count = 3,
  examples = [],
  apiKey,
  models = DEFAULT_MODELS,
}) => {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  if (!project) {
    throw new Error("A project name is required.");
  }

  const safeCount = clamp(Number(count) || 3, 1, 8);
  const safeNotes = String(notes || "").trim().slice(0, 2000);
  const safeExamples = (Array.isArray(examples) ? examples : [])
    .filter((item) => typeof item === "string" && item.trim())
    .slice(0, 20);

  // Generate mode rewords entries from this list, so it cannot run without one.
  if (!safeNotes && !safeExamples.length) {
    throw new Error(
      "No activities available for this project to generate from. Add notes and try again."
    );
  }

  const prompt = buildPrompt({
    project,
    notes: safeNotes,
    count: safeCount,
    examples: safeExamples,
  });

  const body = requestBody(prompt, safeCount);

  let lastError;

  for (const model of models) {
    try {
      const raw = await callModel(model, apiKey, body);

      const activities = (Array.isArray(raw) ? raw : [])
        .map(cleanSentence)
        .filter(Boolean)
        .filter((item, index, all) => all.indexOf(item) === index)
        .slice(0, safeCount);

      if (!activities.length) {
        throw new Error("Gemini returned no usable sentences.");
      }

      return {
        activities,
        model,
        mode: safeNotes ? "polish" : "generate",
      };
    } catch (err) {
      lastError = err;

      // TimeoutError from AbortSignal has no .status but is worth another go.
      const retryable = isRetryable(err.status) || err.name === "TimeoutError";

      if (!retryable) break;

      console.warn(`⚠️  Gemini model ${model} unavailable (${err.message}) — trying next.`);
    }
  }

  throw lastError || new Error("Gemini request failed.");
};

module.exports = { generateActivities, DEFAULT_MODELS };
