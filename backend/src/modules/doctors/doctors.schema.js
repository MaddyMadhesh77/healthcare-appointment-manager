const { z } = require('zod');

const timeRange = z
  .object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:MM 24h format'),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:MM 24h format'),
  })
  .refine((r) => r.start < r.end, { message: 'start must be before end' });

const workingHoursSchema = z
  .object({
    mon: timeRange.nullable(),
    tue: timeRange.nullable(),
    wed: timeRange.nullable(),
    thu: timeRange.nullable(),
    fri: timeRange.nullable(),
    sat: timeRange.nullable(),
    sun: timeRange.nullable(),
  })
  .refine((wh) => Object.values(wh).some((v) => v !== null), {
    message: 'At least one working day is required',
  });

const createDoctorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  specialisation: z.string().min(1),
  workingHours: workingHoursSchema,
  slotDurationMinutes: z.number().int().min(5).max(240).default(30),
});

const updateDoctorSchema = z.object({
  specialisation: z.string().min(1).optional(),
  workingHours: workingHoursSchema.optional(),
  slotDurationMinutes: z.number().int().min(5).max(240).optional(),
});

const leaveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  reason: z.string().max(500).optional(),
});

module.exports = { workingHoursSchema, createDoctorSchema, updateDoctorSchema, leaveSchema };
