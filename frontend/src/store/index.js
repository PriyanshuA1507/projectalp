import { configureStore } from '@reduxjs/toolkit';
import authReducer, { initializeSession } from './slices/authSlice.js';
import aparAuthReducer, { aparInitializeSession } from './slices/aparAuthSlice.js';
import { Api } from '../api/Api.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    aparAuth: aparAuthReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

const isAparPath = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/apar');
};

Api.setRoleProvider(() => {
  try {
    const state = store.getState();
    if (isAparPath()) {
      return (state.aparAuth && state.aparAuth.baseRole) || null;
    }
    return (state.auth && state.auth.baseRole) || null;
  } catch (e) {
    return null;
  }
});

if (isAparPath()) {
  store.dispatch(aparInitializeSession());
} else {
  store.dispatch(initializeSession());
}
