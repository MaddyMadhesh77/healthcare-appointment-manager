const { z } = require('zod');

const prescriptionItemSchema = z.object({
  medicationName: z.string().min(1),
  dosage: z.string().min(1),
  timesPerDay: z.number().int().min(1).max(6),
  durationDays: z.number().int().min(1).max(90),
});

const createVisitSchema = z.object({
  doctorNotes: z.string().min(1).max(8000),
  prescription: z.array(prescriptionItemSchema).default([]),
});

module.exports = { prescriptionItemSchema, createVisitSchema };
