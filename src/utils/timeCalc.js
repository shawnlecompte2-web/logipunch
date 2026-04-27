/**
 * Calculates the rounded (to nearest 15 min) net hours for a punch entry.
 * Includes break bonus. Returns hours as a number.
 */
export function calcEntryHoursRounded(entry) {
  const breaksTaken = entry.breaks_taken ?? 2;
  const breakBonus = (2 - breaksTaken) * 15; // minutes
  let exactMins;
  if (entry.punch_in && entry.punch_out) {
    const diffMs = new Date(entry.punch_out) - new Date(entry.punch_in);
    const lunch = entry.lunch_break || 0;
    exactMins = Math.round(diffMs / 60000) - lunch + breakBonus;
  } else {
    exactMins = Math.round((entry.total_hours || 0) * 60) + breakBonus;
  }
  return Math.round(exactMins / 15) * 15 / 60;
}

/**
 * Sum of calcEntryHoursRounded for an array of entries.
 */
export function calcTotalHoursRounded(entries) {
  return entries.reduce((sum, e) => sum + calcEntryHoursRounded(e), 0);
}