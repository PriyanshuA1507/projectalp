let csrfToken = null;
let pendingTokenRequest = null;

export const clearCsrfToken = () => {
  csrfToken = null;
  pendingTokenRequest = null;
};

export const fetchCsrfToken = async (axiosClient) => {
  if (csrfToken) {
    return csrfToken;
  }

  if (!pendingTokenRequest) {
    pendingTokenRequest = axiosClient.get('/csrf-token').then((response) => {
      csrfToken = response.data?.data?.csrfToken || response.data?.csrfToken;
      pendingTokenRequest = null;
      return csrfToken;
    }).catch((error) => {
      pendingTokenRequest = null;
      throw error;
    });
  }

  return pendingTokenRequest;
};
