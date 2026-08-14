let accessToken: string | null = null;
let tokenChangeListeners: ((token: string | null) => void)[] = [];

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  tokenChangeListeners.forEach((listener) => {
    try {
      listener(token);
    } catch (err) {
      console.error('[TokenStore] Subscriber change listener error:', err);
    }
  });
};

export const addTokenChangeListener = (listener: (token: string | null) => void) => {
  tokenChangeListeners.push(listener);
  return () => {
    tokenChangeListeners = tokenChangeListeners.filter((l) => l !== listener);
  };
};
