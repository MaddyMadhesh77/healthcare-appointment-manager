import { apiRequest } from './client';

export function submitVisit(appointmentId, data) {
  return apiRequest(`/visits/${appointmentId}`, { method: 'POST', body: data });
}

export function getVisit(appointmentId) {
  return apiRequest(`/visits/${appointmentId}`);
}
