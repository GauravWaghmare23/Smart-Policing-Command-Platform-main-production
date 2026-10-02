import apiClient from './apiClient';

// Note: If backend APIs /api/emergency-contacts exist, these calls connect to them.
export const getEmergencyContacts = async () => {
  try {
    const res = await apiClient.get('/emergency-contacts');
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const addEmergencyContact = async (contactData) => {
  const res = await apiClient.post('/emergency-contacts', contactData);
  return res.data;
};

export const updateEmergencyContact = async (id, contactData) => {
  const res = await apiClient.patch(`/emergency-contacts/${id}`, contactData);
  return res.data;
};

export const deleteEmergencyContact = async (id) => {
  const res = await apiClient.delete(`/emergency-contacts/${id}`);
  return res.data;
};
