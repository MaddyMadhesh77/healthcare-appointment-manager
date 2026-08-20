import { apiRequest } from './client';

export function searchDoctors(specialisation) {
  const query = specialisation ? `?specialisation=${encodeURIComponent(specialisation)}` : '';
  return apiRequest(`/doctors${query}`);
}

export function getDoctor(id) {
  return apiRequest(`/doctors/${id}`);
}

export function adminListDoctors() {
  return apiRequest('/admin/doctors');
}

export function adminCreateDoctor(data) {
  return apiRequest('/admin/doctors', { method: 'POST', body: data });
}

export function adminUpdateDoctor(id, data) {
  return apiRequest(`/admin/doctors/${id}`, { method: 'PATCH', body: data });
}

export function adminListLeaves(id) {
  return apiRequest(`/admin/doctors/${id}/leave`);
}

export function adminAddLeave(id, data) {
  return apiRequest(`/admin/doctors/${id}/leave`, { method: 'POST', body: data });
}

export function adminRemoveLeave(id, leaveId) {
  return apiRequest(`/admin/doctors/${id}/leave/${leaveId}`, { method: 'DELETE' });
}
