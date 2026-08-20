-- Prevents double-booking: only one HELD or CONFIRMED appointment can exist
-- for a given doctor at a given slotStart. Postgres enforces this atomically
-- on INSERT, so two concurrent booking requests for the same slot cannot
-- both succeed even under a race (the loser gets a unique-violation error,
-- not a silently overwritten row).
CREATE UNIQUE INDEX "appointment_doctor_active_slot_unique"
ON "Appointment" ("doctorId", "slotStart")
WHERE status IN ('HELD', 'CONFIRMED');
