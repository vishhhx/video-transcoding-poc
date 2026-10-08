import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
const SocketContext = createContext();
const backend_websocket_url =import.meta.env.backendUrl || "http://localhost:5000";
export const useSocket = () => useContext(SocketContext);
export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [socket, setSocket] = useState(null);
  useEffect(() => {
    if (isAuthenticated) {
      const newSocket = io(backend_websocket_url, {
        transports: ["websocket"],
        withCredentials: true,
        autoConnect: true,
      });
      setSocket(newSocket);
      return () => {
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
