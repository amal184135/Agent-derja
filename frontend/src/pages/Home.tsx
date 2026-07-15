import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { username, logoutUser } = useAuth();
  return (
    <div>
      <h1>Bienvenue {username}</h1>
      <button onClick={logoutUser}>Se déconnecter</button>
    </div>
  );
}