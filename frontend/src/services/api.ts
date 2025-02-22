const API_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000') + '/api';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

async function fetchApi(endpoint: string, options: ApiOptions = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      credentials: 'include',
      mode: 'cors',
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Handle 401 Unauthorized
    if (response.status === 401 && !options.skipAuth) {
      // Clear user data
      localStorage.removeItem('user');
      // Redirect to login
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'API request failed');
    }

    const data = await response.json();

    // If this is a login/register response and it has user data, store it
    if ((endpoint === '/auth/login' || endpoint === '/auth/register' || endpoint === '/auth/verify') && data.user) {
      // Make sure we store all necessary user properties
      const userData = {
        _id: data.user._id,
        username: data.user.username,
        phone: data.user.phone,
        balance: data.user.balance || 0,
        referralCode: data.user.referralCode,
        isAdmin: data.user.isAdmin || false,
        isActive: data.user.isActive || false,
        createdAt: data.user.createdAt,
        updatedAt: data.user.updatedAt
      };
      localStorage.setItem('user', JSON.stringify(userData));
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Auth API
export const authApi = {
  login: (credentials: { phone: string; password: string }) =>
    fetchApi('/auth/login', { method: 'POST', body: credentials, skipAuth: true }),
  
  register: (userData: { username: string; phone: string; password: string; referralCode?: string }) =>
    fetchApi('/auth/register', { method: 'POST', body: userData, skipAuth: true }),
    
  verify: () => fetchApi('/auth/verify', { skipAuth: true }),
  
  logout: () => {
    localStorage.removeItem('user');
    return fetchApi('/auth/logout', { method: 'POST' });
  },
};

// User API
export const userApi = {
  getProfile: () => fetchApi('/auth/verify'),
  updateProfile: (data: any) => fetchApi('/users/profile', { method: 'PUT', body: data }),
};

// Transaction API
export const transactionApi = {
  getTransactions: () => fetchApi('/transactions'),
  
  initiateDeposit: (amount: number) =>
    fetchApi('/transactions/deposit', { method: 'POST', body: { amount } }),
  
  initiateWithdrawal: (amount: number) =>
    fetchApi('/transactions/withdraw', { method: 'POST', body: { amount } }),
  
  confirmDeposit: (transactionId: string) =>
    fetchApi(`/transactions/deposit/${transactionId}/confirm`, { method: 'POST' }),
};

// Investment API
export const investmentApi = {
  createInvestment(data: { pair: string; amount: number; dailyROI: number }) {
    return fetchApi('/investments', {
      method: 'POST',
      body: data,
    });
  },

  getInvestments() {
    return fetchApi('/investments');
  },

  getEarnings() {
    return fetchApi('/investments/earnings');
  },

  getHistory() {
    return fetchApi('/investments/history');
  },
};

// Referral API
export const referralApi = {
  getStats: () => fetchApi('/referral/stats'),
  getHistory: () => fetchApi('/referral/history'),
};

export const adminApi = {
  getPendingTransactions: async () => {
    const response = await fetch(`${API_URL}/admin/transactions/pending`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch pending transactions');
    return response.json();
  },

  getPendingVerifications: async () => {
    const response = await fetch(`${API_URL}/admin/verifications/pending`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch pending verifications');
    return response.json();
  },

  getStats: async () => {
    const response = await fetch(`${API_URL}/admin/stats`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch admin stats');
    return response.json();
  },

  approveTransaction: async (transactionId: string) => {
    const response = await fetch(`${API_URL}/admin/transactions/${transactionId}/approve`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to approve transaction');
    return response.json();
  },

  rejectTransaction: async (transactionId: string) => {
    const response = await fetch(`${API_URL}/admin/transactions/${transactionId}/reject`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to reject transaction');
    return response.json();
  },

  verifyUser: async (userId: string) => {
    const response = await fetch(`${API_URL}/admin/users/${userId}/verify`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to verify user');
    return response.json();
  },

  getUsers: async () => {
    const response = await fetch(`${API_URL}/admin/users`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  deleteUser: async (userId: string) => {
    const response = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  },

  resetPassword: async (phone: string) => {
    const response = await fetch(`${API_URL}/admin/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ phone }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reset password');
    }
    return response.json();
  },

  getPasswordResetHistory: async () => {
    const response = await fetch(`${API_URL}/admin/reset-password/history`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch password reset history');
    return response.json();
  },

  getTransactions: async (params: { page?: number; limit?: number; status?: string; type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.status) searchParams.append('status', params.status);
    if (params.type) searchParams.append('type', params.type);
    
    const response = await fetch(`${API_URL}/admin/transactions?${searchParams.toString()}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },
};
