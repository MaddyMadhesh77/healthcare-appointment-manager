import { apiRequest } from './client';

export function getCalendarStatus() {
  return apiRequest('/calendar/status');
}

export function getCalendarAuthUrl() {
  return apiRequest('/calendar/oauth/url');
}

export function disconnectCalendar() {
  return apiRequest('/calendar/disconnect', { method: 'DELETE' });
}
