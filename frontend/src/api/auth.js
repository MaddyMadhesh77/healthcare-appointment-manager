import { apiRequest } from './client';

export function register(data) {
  return apiRequest('/auth/register', { method: 'POST', body: data, auth: false });
}

export function login(data) {
  return apiRequest('/auth/login', { method: 'POST', body: data, auth: false });
}
