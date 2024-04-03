import { useEffect, useState } from "react";
import Chat, { type Person } from "./Chat";
import Connect from "./Connect";
import Login from "./Login";

export default function Agent({
  name,
  me,
  friend,
  showInvitation,
}: {
  name: string;
  me: Person;
  friend: Person;
  showInvitation: boolean;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [pwConnectionId, setPWConnectionId] = useState<string | null>(null);
  const [botConnectionId, setBotConnectionId] = useState<string | null>(null);
  useEffect(() => {
    if (token === null) {
      const token = localStorage.getItem(name);
      setToken(token || "");
    }
    if (pwConnectionId === null) {
      const id = localStorage.getItem(name + "_pwId");
      setPWConnectionId(id || "");
    }
    if (botConnectionId === null) {
      const id = localStorage.getItem(name + "_botId");
      setBotConnectionId(id || "");
    }
  });
  return (
    <div>
      <h1>{name} view</h1>
      {token ? (
        <div>
          {pwConnectionId && botConnectionId ? (
            <Chat
              token={token}
              name={name}
              me={me}
              friend={friend}
              connectionId={pwConnectionId}
              botConnectionId={botConnectionId}
              isSeller={showInvitation}
            />
          ) : (
            <Connect
              name={name}
              showInvitation={showInvitation}
              token={token}
            />
          )}
        </div>
      ) : (
        <Login name={name} />
      )}
    </div>
  );
}
