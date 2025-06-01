# How socket.io works in this project

**Frontend:**
- The frontend uses the `SocketContext.jsx` file to create a socket.io client connection.
- When a user logs in, the client connects to the backend using the user's token for authentication.
- The socket is used to:
  - Join/leave chat rooms (`join_chat`, `leave_chat`)
  - Send messages in real time (`send_message`)
  - Receive new messages instantly (`new_message` event)
  - Show typing indicators (`typing`, `user_typing` events)
  - Update chat lists in real time (`chat_updated` event)

**Backend:**
- The backend sets up a socket.io server in `server/index.js` and handles events in `server/socket/socketHandlers.js`.
- On connection, the backend authenticates the user using the token.
- The backend listens for events from the client:
  - `join_chat`: Adds the user to a chat room.
  - `leave_chat`: Removes the user from a chat room.
  - `send_message`: Saves the message to the database and emits it to all users in the chat.
  - `typing`: Notifies other users in the chat that someone is typing.
- The backend emits events to clients:
  - `new_message`: When a new message is sent in a chat.
  - `user_typing`: When someone is typing in a chat.
  - `chat_updated`: When a chat's last message or metadata changes.

**Summary:**
- socket.io enables real-time chat, typing indicators, and chat updates between users and the server.
- All socket.io logic is encapsulated in the context and handler files for maintainability.
