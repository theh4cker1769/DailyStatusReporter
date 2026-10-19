// Pulls the activity list back out of a generated / manually edited email body.
// The generated body separates activities with a blank line, and a long
// activity can be wrapped across lines, so both cases are handled here.
export const parseActivitiesFromBody = (bodyText) => {
  if (!bodyText) return [];

  const lines = bodyText.split(/\r?\n/);
  const start = lines.findIndex((line) => /^ACTIVITIES\s*:*$/i.test(line.trim()));

  if (start === -1) return [];

  const activities = [];
  let current = "";
  let afterBlank = true;

  for (let i = start + 1; i < lines.length; i++) {
    const raw = lines[i].trim();

    if (!raw) {
      afterBlank = true;
      continue;
    }

    const marker = raw.match(/^(?:\d+[.)]|[-*•])\s*(.*)$/);

    if (marker || afterBlank) {
      // numbering, a bullet, or a fresh block after a blank line = new activity
      if (current) activities.push(current);
      current = marker ? marker[1].trim() : raw;
    } else {
      // adjacent line with no marker = continuation of a wrapped activity
      current = `${current} ${raw}`;
    }

    afterBlank = false;
  }

  if (current) activities.push(current);

  return activities.filter(Boolean);
};
