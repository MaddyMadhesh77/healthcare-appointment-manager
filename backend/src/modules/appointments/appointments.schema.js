const { z } = require('zod');

const slotsQuerySchema = z.object({
  doctorId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
});

const holdSchema = z.object({
  doctorId: z.string().uuid(),
  slotStart: z.string().datetime({ message: 'slotStart must be an ISO datetime' }),
});

const confirmSchema = z.object({
  symptoms: z.string().min(1, 'Symptoms are required before confirming').max(4000),
});

module.exports = { slotsQuerySchema, holdSchema, confirmSchema };
