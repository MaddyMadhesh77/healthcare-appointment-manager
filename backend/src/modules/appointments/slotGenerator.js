const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// All scheduling is UTC-based: workingHours "HH:MM" values and the date
// string are interpreted as UTC wall-clock time. This keeps slot math
// timezone-free; a real deployment would pin it to the clinic's timezone.
function generateSlotsForDay(workingHours, slotDurationMinutes, dateStr) {
  const dow = new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();
  const range = workingHours[DAY_KEYS[dow]];
  if (!range) return [];

  const slots = [];
  let cursor = new Date(`${dateStr}T${range.start}:00.000Z`);
  const end = new Date(`${dateStr}T${range.end}:00.000Z`);
  const durationMs = slotDurationMinutes * 60000;

  while (cursor.getTime() + durationMs <= end.getTime()) {
    const slotEnd = new Date(cursor.getTime() + durationMs);
    slots.push({ start: new Date(cursor), end: slotEnd });
    cursor = slotEnd;
  }
  return slots;
}

module.exports = { generateSlotsForDay };
