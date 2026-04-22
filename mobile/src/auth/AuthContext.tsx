import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as authApi from "../api/authApi";
import { ApiError, setAccessToken } from "../api/http";
import type { AuthUser } from "../api/types";
import * as tokenStorage from "../storage/tokenStorage";

type AuthContextValue = {
  user: AuthUser | null;
  isBootstrapping: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const token = await tokenStorage.loadAccessToken();
        if (!token) {
          setAccessToken(null);
          return;
        }

        setAccessToken(token);
        const me = await authApi.fetchMe();
        if (cancelled) {
          return;
        }
        setUser(me.user);
      } catch {
        if (cancelled) {
          return;
        }
        setAccessToken(null);
        setUser(null);
        await tokenStorage.clearAccessToken();
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await authApi.loginAccount(email, password);
    await tokenStorage.saveAccessToken(res.token);
    setAccessToken(res.token);
    setUser(res.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const res = await authApi.registerAccount(email, password);
    await tokenStorage.saveAccessToken(res.token);
    setAccessToken(res.token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    await tokenStorage.clearAccessToken();
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      signIn,
      signUp,
      signOut,
    }),
    [isBootstrapping, signIn, signOut, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Something went wrong";
}
