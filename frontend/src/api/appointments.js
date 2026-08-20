import { apiRequest } from './client';

export function getSlots(doctorId, date) {
  return apiRequest(`/appointments/slots?doctorId=${doctorId}&date=${date}`);
}

export function holdSlot(data) {
  return apiRequest('/appointments/hold', { method: 'POST', body: data });
}

export function confirmAppointment(id, data) {
  return apiRequest(`/appointments/${id}/confirm`, { method: 'POST', body: data });
}

export function cancelAppointment(id) {
  return apiRequest(`/appointments/${id}/cancel`, { method: 'POST' });
}

export function myAppointments() {
  return apiRequest('/appointments/mine');
}

export function doctorAppointments() {
  return apiRequest('/appointments/doctor/mine');
}
