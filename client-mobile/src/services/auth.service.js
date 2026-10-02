import apiClient from './apiClient';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/api';

export const loginUser = async (email, password) => {
  if (__DEV__) {
    console.log(`[AUTH] API BASE URL: ${API_URL}`);
    console.log(`[AUTH] LOGIN URL: ${API_URL}/auth/login`);
    console.log(`[AUTH] LOGIN METHOD: POST`);
  }
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data;
};

export const fetchCurrentUser = async () => {
  const res = await apiClient.get('/auth/me');
  return res.data;
};

export const registerUser = async (data) => {
  const res = await apiClient.post('/auth/register', data);
  return res.data;
};

export const saveToken = async (token) => {
  await SecureStore.setItemAsync('accessToken', token);
};

export const getStoredToken = async () => {
  return await SecureStore.getItemAsync('accessToken');
};

export const removeStoredToken = async () => {
  await SecureStore.deleteItemAsync('accessToken');
};
