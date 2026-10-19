import { getRandomActivities } from "./randomGenerator";

const API_BASE = "http://localhost:5000";

// Entries from the project's hand-written list. When polishing notes these are
// only style anchors, so a handful is enough. When generating from scratch the
// AI rewords entries drawn from this list, so it needs a wider pool to pick
// from — otherwise every generated report looks the same.
const pickExamples = (projectActivities, count) =>
  getRandomActivities(projectActivities, count, count);

// Asks the backend for activities. On any failure the caller still gets a
// usable list from the existing random picker, so the report flow never
// dead-ends on a network error or an exhausted free-tier quota.
export const generateActivitiesWithAI = async ({
  project,
  projectActivities = [],
  notes = "",
  count = 3,
}) => {
  try {
    const response = await fetch(`${API_BASE}/generate-activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project,
        notes,
        count,
        examples: pickExamples(projectActivities, notes.trim() ? 5 : 15),
      }),
    });

    const data = await response.json();

    if (!data.success || !data.activities?.length) {
      throw new Error(data.message || "AI generation failed.");
    }

    return {
      activities: data.activities,
      source: "ai",
      model: data.model,
    };
  } catch (err) {
    console.error("AI generation failed, falling back to preset list:", err);

    return {
      activities: getRandomActivities(projectActivities),
      source: "fallback",
      error: err.message,
    };
  }
};
