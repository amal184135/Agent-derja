import React, { createContext, useState, useEffect } from "react";
import { verifyToken } from "../services/api";

export const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: any) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // pour savoir si on a fini de vérifier le token stocké

  useEffect(() => {
    const checkStoredToken = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUsername = localStorage.getItem("username");

      if (storedToken) {
        const isValid = await verifyToken(storedToken);
        if (isValid) {
          setToken(storedToken);
          setUsername(storedUsername);
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("username");
        }
      }
      setLoading(false);
    };
    checkStoredToken();
  }, []);

  const loginUser = (t: string, u: string) => {
    setToken(t);
    setUsername(u);
    localStorage.setItem("token", t);
    localStorage.setItem("username", u);
  };

  const logoutUser = () => {
    setToken(null);
    setUsername(null);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  };

  return (
    <AuthContext.Provider value={{ token, username, loading, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}