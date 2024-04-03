import { useState, useEffect, useRef } from "react";
import { GraphQLClient, gql } from "graphql-request";

const createInvitation = async (token: string) => {
  const endpoint = `${import.meta.env.PUBLIC_API_URL}/query`;

  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  interface Data {
    invite: {
      raw: string;
      label: string;
    };
  }

  const query = gql`
    mutation Invitation {
      invite {
        id
        endpoint
        label
        raw
        imageB64
      }
    }
  `;

  const data = await graphQLClient.request<Data>(query);
  console.log(data.invite.label);
  return data.invite.raw;
};

const connect = async (token: string, invitation: string) => {
  const endpoint = `${import.meta.env.PUBLIC_API_URL}/query`;

  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  interface Data {
    connect: {
      ok: boolean;
    };
  }

  const query = gql`
    mutation Connect($input: ConnectInput!) {
      connect(input: $input) {
        ok
      }
    }
  `;

  const data = await graphQLClient.request<Data>(query, {
    input: { invitation },
  });
  return data.connect.ok;
};

const fetchConnections = async (token: string) => {
  const endpoint = `${import.meta.env.PUBLIC_API_URL}/query`;

  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  interface Data {
    connections: {
      edges: [
        {
          node: {
            id: string;
          };
        },
      ];
      pageInfo: {
        startCursor: string;
        endCursor: string;
      };
    };
  }

  const query = gql`
    query GetConnections($cursor: String) {
      connections(last: 100, before: $cursor) {
        edges {
          node {
            id
          }
        }
        pageInfo {
          startCursor
          endCursor
        }
      }
    }
  `;

  const data = await graphQLClient.request<Data>(query);
  return data;
};

const fetchBotInvitation = async () => {
  return (await fetch(`/bot.invitation`)).text();
  // CORS issue
  // return (
  //   await fetch(
  //     `${import.meta.env.PUBLIC_API_URL}/dyn?did=${import.meta.env.PUBLIC_BOT_DID}&url=yes`,
  //   )
  // ).text();
};

export default function Connect({
  name,
  token,
  showInvitation,
}: {
  name: string;
  token: string;
  showInvitation: boolean;
}) {
  const [invitation, setInvitation] = useState("");
  const [firstFetchDone, setFirstFetchDone] = useState(false);
  const [connectionState, setConnectionState] = useState("INITIAL");
  const [cursor, setCursor] = useState("");
  const [pwConnectionId, setPwConnectionId] = useState("");
  const [botConnectionId, setBotConnectionId] = useState("");
  const [connections, setConnections] = useState<any>(null);
  const [intervalId, setIntervalId] = useState(0);

  useEffect(() => {
    if (showInvitation && token && !firstFetchDone) {
      createInvitation(token).then((data) => {
        setInvitation(data);
        setFirstFetchDone(true);
      });
    }
  }, [token, showInvitation, firstFetchDone]);

  useEffect(() => {
    const poll = async () => {
      setConnections(await fetchConnections(token));
    };
    setIntervalId(setInterval(poll, 1000));
  }, []);

  useEffect(() => {
    const updateState = async () => {
      if (!connections) return;
      const conns = connections.connections;
      switch (connectionState) {
        case "INITIAL":
          console.log("Setting cursor", conns.pageInfo.endCursor);
          setCursor(conns.pageInfo.endCursor);
          setConnectionState("WAIT_PW");
          break;
        case "WAIT_PW":
          if (conns.pageInfo.endCursor !== cursor) {
            const len = conns.edges.length;
            const pwId = conns.edges[len - 1].node.id;
            setPwConnectionId(pwId);
            localStorage.setItem(name + "_pwId", pwId);
            setCursor(conns.pageInfo.endCursor);
            const botInvitation = await fetchBotInvitation();
            await connect(token, botInvitation);
            setConnectionState("WAIT_BOT");
          }
          break;
        case "WAIT_BOT":
          if (conns.pageInfo.endCursor !== cursor) {
            const len = conns.edges.length;
            const botId = conns.edges[len - 1].node.id;
            setBotConnectionId(botId);
            localStorage.setItem(name + "_botId", botId);
            setCursor(conns.pageInfo.endCursor);
            clearInterval(intervalId);
          }
          break;
      }
    };
    updateState();
  }, [connections]);

  const doConnect = async () => {
    await connect(token, invitation);
  };

  const connectReady = pwConnectionId !== "" && botConnectionId !== "";
  return (
    <div>
      {connectReady ? (
        <p>Connected! Please refresh window once both sides ready.</p>
      ) : (
        <div className="m-10">
          {showInvitation ? (
            <div>
              <div>My invitation:</div>
              <div className="break-all bg-slate-200 mb-10">{invitation}</div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="basic-url"
                className="mb-2 inline-block text-surface dark:text-white"
              >
                Copy-paste invitation URL here:
              </label>
              <div className="relative mb-4 flex w-full flex-wrap items-stretch">
                <input
                  type="text"
                  className="relative m-0 block flex-auto rounded-e border border-solid border-neutral-200 bg-transparent bg-clip-padding px-3 py-[0.25rem] text-base font-normal leading-[1.6] text-surface outline-none transition duration-200 ease-in-out placeholder:text-neutral-500 focus:z-[3] focus:border-primary focus:shadow-inset focus:outline-none motion-reduce:transition-none dark:border-white/10 dark:text-white dark:placeholder:text-neutral-200 dark:autofill:shadow-autofill dark:focus:border-primary"
                  id="basic-url"
                  aria-describedby="basic-addon3"
                  onChange={(e) => setInvitation(e.target.value)}
                />
                <span
                  className="flex items-center whitespace-nowrap rounded-s border border-e-0 border-solid border-neutral-200 px-3 py-[0.25rem] text-center text-base font-normal leading-[1.6] text-surface dark:border-white/10 dark:text-white"
                  id="basic-addon3"
                >
                  <button onClick={() => doConnect()}>Connect</button>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
