import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  loginUser,
  fetchCurrentUser,
  registerUser,
  saveToken,
  getStoredToken,
  removeStoredToken,
} from '../services/auth.service';
import { setUnauthorizedHandler } from '../services/apiClient';

const AuthContext = createContext(null);

import {
  startOfficerLocationTracking,
  stopOfficerLocationTracking,
} from '../services/officerLocation.service';

const isOfficerRole = (role) => {
  if (!role) return false;
  const r = role.toUpperCase();
  return (
    r === 'FIELD_OFFICER' ||
    r === 'STATION_HEAD' ||
    r === 'INVESTIGATING_OFFICER' ||
    r === 'POLICE'
  );
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = async () => {
    try {
      await stopOfficerLocationTracking();
      await removeStoredToken();
    } catch (_) {}
    setUser(null);
    setAccessToken(null);
  };

  useEffect(() => {
    // Register 401 callback in apiClient to automatically clear session
    setUnauthorizedHandler(clearSession);
    restoreSession();
  }, []);

  const extractUser = (resData) => {
    return resData?.data?.user || resData?.user || resData?.data || resData;
  };

  const extractToken = (resData) => {
    return resData?.data?.accessToken || resData?.accessToken || resData?.data?.token || resData?.token;
  };

  const restoreSession = async () => {
    try {
      setIsLoading(true);
      const token = await getStoredToken();
      if (token) {
        setAccessToken(token);
        const meRes = await fetchCurrentUser();
        const currentUser = extractUser(meRes);

        if (currentUser && currentUser.email) {
          setUser(currentUser);
          if (isOfficerRole(currentUser.role)) {
            startOfficerLocationTracking();
          }
        } else {
          await clearSession();
        }
      } else {
        setUser(null);
        setAccessToken(null);
      }
    } catch (err) {
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    const loginRes = await loginUser(email, password);
    const token = extractToken(loginRes);

    if (!token) {
      throw new Error('No authentication token received from server.');
    }

    await saveToken(token);
    setAccessToken(token);

    const meRes = await fetchCurrentUser();
    const currentUser = extractUser(meRes);

    setUser(currentUser);
    if (isOfficerRole(currentUser?.role)) {
      startOfficerLocationTracking();
    }
    return currentUser;
  };

  const register = async (registerData) => {
    const regRes = await registerUser(registerData);
    const token = extractToken(regRes);

    if (token) {
      await saveToken(token);
      setAccessToken(token);
      const meRes = await fetchCurrentUser();
      const currentUser = extractUser(meRes);
      setUser(currentUser);
      return currentUser;
    } else {
      return await login(registerData.email, registerData.password);
    }
  };

  const logout = async () => {
    await clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
