import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    let newSocket;

    if (currentUser) {
      // Get token from cookies
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
      const token = tokenCookie ? tokenCookie.split('=')[1] : '';

      if (!token) {
        // Don't connect if token is missing
        setSocket(null);
        setConnected(false);
        return;
      }

      // Use backend URL for socket connection
      const backendUrl =
        import.meta.env.VITE_BACKEND_URL ||
        (window.location.hostname === 'localhost'
          ? 'http://localhost:5000'
          : window.location.origin);

      newSocket = io(backendUrl, {
        auth: { token },
        withCredentials: true,
        path: '/socket.io',
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        setConnected(true);
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      setSocket(newSocket);
    } else {
      setSocket(null);
      setConnected(false);
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [currentUser]);

  const joinChat = (chatId) => {
    if (socket && chatId) {
      socket.emit('join_chat', chatId);
    }
  };

  const leaveChat = (chatId) => {
    if (socket && chatId) {
      socket.emit('leave_chat', chatId);
    }
  };

  const sendMessage = (chatId, content, attachments = []) => {
    if (socket) {
      socket.emit('send_message', {
        chatId,
        content,
        attachments
      });
    }
  };

  const emitTyping = (chatId, isTyping) => {
    if (socket) {
      socket.emit('typing', {
        chatId,
        isTyping
      });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      joinChat,
      leaveChat,
      sendMessage,
      emitTyping
    }}>
      {children}
    </SocketContext.Provider>
  );
};