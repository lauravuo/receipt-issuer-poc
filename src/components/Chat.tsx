import { useState, useEffect } from "react";
import { GraphQLClient, gql } from "graphql-request";
import query from "./ConnectionQuery";
import type { IConnectionNode, IEventEdge, IMessageNode } from "./Types";

export interface Person {
  img: string;
  name: string;
  role: string;
}

const fetchEvents = async (token: string, connectionId: string) => {
  const endpoint = `${import.meta.env.PUBLIC_API_URL}/query`;

  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  interface Data {
    connection: IConnectionNode;
  }

  const data = await graphQLClient.request<Data>(query, {
    id: connectionId,
  });
  return data.connection.events?.edges;
};

const sendMessage = async (
  token: string,
  connectionId: string,
  message: string,
) => {
  const endpoint = `${import.meta.env.PUBLIC_API_URL}/query`;

  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const query = gql`
    mutation SendMessage($input: MessageInput!) {
      sendMessage(input: $input) {
        ok
      }
    }
  `;

  interface Data {
    sendMessage: {
      ok: boolean;
    };
  }

  const data = await graphQLClient.request<Data>(query, {
    input: {
      message,
      connectionId,
    },
  });
  return data.sendMessage.ok;
};

const markRead = async (token: string, eventId: string) => {
  const endpoint = `${import.meta.env.PUBLIC_API_URL}/query`;

  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const query = gql`
    mutation MarkEventRead($input: MarkReadInput!) {
      markEventRead(input: $input) {
        id
      }
    }
  `;
  interface Data {
    markEventRead: {
      id: boolean;
    };
  }

  const data = await graphQLClient.request<Data>(query, {
    input: {
      id: eventId,
    },
  });
  return data.markEventRead.id;
};

const chatComponent = (event: IEventEdge, me: Person, friend: Person) => {
  const content = event.node.job?.node.output.message?.node.message.includes(
    "rcvr_arriwed",
  )
    ? "Receipt sent successfully"
    : event.node.job?.node.output.message?.node.message;
  return (
    <div>
      {event.node.job?.node.output.message?.node.sentByMe ? (
        <div
          className="chat-message"
          key={event.node.job?.node.output.message?.node.id}
        >
          <div className="flex items-end justify-end">
            <div className="flex flex-col space-y-2 text-xs max-w-xs mx-2 order-1 items-end">
              <div>
                <span className="px-4 py-2 rounded-lg inline-block rounded-br-none bg-blue-600 text-white ">
                  {content}
                </span>
              </div>
            </div>
            <img
              src={me.img}
              alt="My profile"
              className="w-6 h-6 rounded-full order-2"
            />
          </div>
        </div>
      ) : (
        <div
          className="chat-message"
          key={
            event.node.job?.node.output.message?.node &&
            event.node.job?.node.output.message?.node.id
          }
        >
          <div className="flex items-end">
            <div className="flex flex-col space-y-2 text-xs max-w-xs mx-2 order-2 items-start">
              <div>
                <span className="px-4 py-2 rounded-lg inline-block rounded-bl-none bg-gray-300 text-gray-600">
                  {content}
                </span>
              </div>
            </div>
            <img
              src={friend.img}
              alt="My profile"
              className="w-6 h-6 rounded-full order-1"
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default function Chat({
  token,
  name,
  connectionId,
  botConnectionId,
  isSeller,
  me,
  friend,
}: {
  token: string;
  name: string;
  connectionId: string;
  botConnectionId: string;
  isSeller: boolean;
  me: Person;
  friend: Person;
}) {
  const [events, setEvents] = useState<IEventEdge[] | undefined>([]);
  const [botEvents, setBotEvents] = useState<IEventEdge[] | undefined>([]);
  const [message, setMessage] = useState("");

  const doSendMessage = async () => {
    sendMessage(token, connectionId, message);
    setMessage("");
  };

  const doIssueCredential = async () => {
    await sendMessage(token, botConnectionId, connectionId);
    await sendMessage(token, botConnectionId, "issuer");
    await sendMessage(token, botConnectionId, "special shop");
    await sendMessage(token, connectionId, `BOT_CMD:${connectionId}`);
  };

  useEffect(() => {
    const poll = async () => {
      setEvents(await fetchEvents(token, connectionId));
      setBotEvents(await fetchEvents(token, botConnectionId));
    };
    setInterval(poll, 5000);
    poll();
  }, []);

  useEffect(() => {
    const receiveCredential = async () => {
      if (!events) return;
      const botMessages = events
        .filter(
          (event) =>
            !event.node.read &&
            event.node.job?.node.protocol === "BASIC_MESSAGE" &&
            event.node.job?.node.output.message?.node.message.startsWith(
              "BOT_CMD",
            ),
        )
        .map((event) => ({
          eventId: event.node.id,
          botSessionId:
            event.node.job?.node.output.message?.node.message.split(":")[1],
        }));
      for (const message of botMessages) {
        await markRead(token, message.eventId);
        if (message.botSessionId) {
          await sendMessage(token, botConnectionId, message.botSessionId);
          await sendMessage(token, botConnectionId, "rcvr");
        }
      }
    };
    receiveCredential();
  }, [events]);

  const messages = [...(events ? events : []), ...(botEvents ? botEvents : [])]
    ?.sort((a, b) =>
      (a.node.job?.node.updatedMs || 0) < (b.node.job?.node.updatedMs || 0)
        ? -1
        : 1,
    )
    .filter(
      (event) =>
        (event.node.connection?.id == connectionId &&
          event.node.job?.node.protocol === "BASIC_MESSAGE" &&
          event.node.job?.node.output.message?.node) ||
        (event.node.connection?.id == botConnectionId &&
          event.node.job?.node.protocol === "BASIC_MESSAGE" &&
          event.node.job?.node.output.message?.node.message.includes(
            "rcvr_arriwed",
          )) ||
        (event.node.connection?.id == botConnectionId &&
          event.node.job?.node.protocol === "CREDENTIAL"),
    );

  return (
    <div className="flex-1 p:2 sm:p-6 justify-between flex flex-col h-screen">
      <div className="flex sm:items-center justify-between py-3 border-b-2 border-gray-200">
        <div className="relative flex items-center space-x-4">
          <div className="relative">
            <span className="absolute text-green-500 right-0 bottom-0">
              <svg width="20" height="20">
                <circle cx="8" cy="8" r="8" fill="currentColor"></circle>
              </svg>
            </span>
            <img
              src={friend.img}
              alt=""
              className="w-10 sm:w-16 h-10 sm:h-16 rounded-full"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <div className="text-2xl mt-1 flex items-center">
              <span className="text-gray-700 mr-3">{friend.name}</span>
            </div>
            <span className="text-lg text-gray-600">{friend.role}</span>
          </div>
        </div>
      </div>
      <div
        id="messages"
        className="flex flex-col space-y-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch"
      >
        {messages
          ?.filter(
            (event) =>
              !event.node.job?.node.output.message?.node ||
              !event.node.job?.node.output.message?.node.message.startsWith(
                "BOT_CMD",
              ),
          )
          .map((event) => (
            <div key={event.node.id}>
              {event.node.job?.node.output.message?.node ? (
                chatComponent(event, me, friend)
              ) : (
                <div className="p-10 bg-blue-200">
                  <div>{event.node.description}</div>
                  <div>
                    {event.node.job?.node.output.credential?.node.credDefId}
                  </div>
                  <div>
                    {event.node.job?.node.output.credential?.node.schemaId}
                  </div>
                  <div>
                    {event.node.job?.node.output.credential?.node.attributes.map(
                      (attr) => (
                        <div key={attr.id}>
                          <span>
                            {attr.name}:{attr.value}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
      <div className="border-t-2 border-gray-200 px-4 pt-4 mb-2 sm:mb-0">
        {isSeller && (
          <div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg px-4 py-3 transition duration-500 ease-in-out text-white bg-blue-500 hover:bg-blue-400 focus:outline-none"
              onClick={doIssueCredential}
            >
              <span className="font-bold">Issue</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-6 w-6 ml-2 transform rotate-90"
              >
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
              </svg>
            </button>
          </div>
        )}
        <div className="relative flex">
          <input
            type="text"
            value={message}
            placeholder="Write your message!"
            className="w-full focus:outline-none focus:placeholder-gray-400 text-gray-600 placeholder-gray-600 pl-12 bg-gray-200 rounded-md py-3"
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="absolute right-0 items-center inset-y-0 hidden sm:flex">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg px-4 py-3 transition duration-500 ease-in-out text-white bg-blue-500 hover:bg-blue-400 focus:outline-none"
              onClick={doSendMessage}
            >
              <span className="font-bold">Send</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-6 w-6 ml-2 transform rotate-90"
              >
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
