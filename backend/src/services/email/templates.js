function fmt(date) {
  return new Date(date).toUTCString();
}

function doctorLabel(name) {
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}

// Each template receives { recipient, payload, appointment } — appointment
// is pre-loaded (with patient/doctor.user) by the notification worker when
// the log row has an appointmentId. Templates just render text; the worker
// owns delivery and retry.
const TEMPLATES = {
  booking_confirmation_patient: ({ appointment }) => ({
    subject: 'Your appointment is confirmed',
    text: `Your appointment with ${doctorLabel(appointment.doctor.user.name)} (${appointment.doctor.specialisation}) is confirmed for ${fmt(appointment.slotStart)}.`,
  }),
  booking_confirmation_doctor: ({ appointment }) => ({
    subject: 'New appointment booked',
    text: `You have a new appointment with ${appointment.patient.name} on ${fmt(appointment.slotStart)}.`,
  }),
  appointment_cancelled: ({ appointment }) => ({
    subject: 'Appointment cancelled',
    text: `The appointment scheduled for ${fmt(appointment.slotStart)} has been cancelled.`,
  }),
  appointment_cancelled_leave: ({ appointment, payload }) => ({
    subject: 'Appointment cancelled — doctor unavailable',
    text: `Your appointment with ${doctorLabel(appointment.doctor.user.name)} on ${fmt(appointment.slotStart)} has been cancelled because the doctor is on leave (${payload.reason}). Please rebook at your convenience.`,
  }),
  post_visit_summary_ready: ({ appointment }) => ({
    subject: 'Your visit summary is ready',
    text: `Your post-visit summary for the appointment on ${fmt(appointment.slotStart)} is now available. Log in to view it.`,
  }),
  medication_reminder: ({ payload }) => ({
    subject: `Medication reminder: ${payload.medicationName}`,
    text: `It's time to take your medication: ${payload.medicationName} (${payload.dosage}).`,
  }),
};

module.exports = { TEMPLATES };
