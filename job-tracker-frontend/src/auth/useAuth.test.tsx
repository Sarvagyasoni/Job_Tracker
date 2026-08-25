import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth';
import { authApi } from '../api';

// Mock authApi
vi.mock('../api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

const mockAuthApi = vi.mocked(authApi);

describe('useAuth', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('returns unauthenticated state initially', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('handles login success', async () => {
    mockAuthApi.login.mockResolvedValueOnce({
      data: { access_token: 'fake-token', token_type: 'bearer' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const response = await result.current.login('test@example.com', 'password123');
      expect(response.success).toBe(true);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('fake-token');
  });

  it('handles login failure', async () => {
    mockAuthApi.login.mockRejectedValueOnce({
      message: 'Invalid credentials',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const response = await result.current.login('test@example.com', 'wrongpassword');
      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid credentials');
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles logout', async () => {
    mockAuthApi.login.mockResolvedValueOnce({
      data: { access_token: 'fake-token', token_type: 'bearer' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });
});