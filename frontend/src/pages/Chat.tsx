import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { username } = useAuth();
  return (
    <div style={{ display: "flex" }}>
      <h1>Bienvenue {username}</h1>
    </div>
  );
}