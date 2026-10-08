const { Server } = require("socket.io");
const { getClient } = require("../config/redisConnet");
const jwt = require("jsonwebtoken");
let io;
const {registerTranscodingEvents} = require("./transcoder.socket");
const SocketIo = async (httpServer) => {
  const client = getClient();
  io = new Server(httpServer, {
    cors: "*", //
    methods: ["GET", "POST"],
    credentials: true,
  });

  
  io.use(async (socket, next) => {
    const cookies = socket.handshake.headers.cookie;
    if (cookies) {
      const token = getCookieValue(cookies, "authToken");
      if (!token) {
        console.error("Authentication error: Token missing");
        return next(new Error("Authentication error: Token missing"));
      }
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        console.log(user);
        socket.user = user;
      } catch (error) {
        console.error("Authentication error: Invalid token", error.message);
        next(new Error("Authentication error: Invalid token"));
      }
    } else {
      socket.user = null;
    }
    next();
  });
  io.on("connection", (socket) => {
    if (socket.user) {
      console.log(`connected: ${socket.user._id}`);
      client.sAdd(`socket:${socket.user._id}`, socket.id); // ✅ fixed
    } else {
      console.log("container connected", socket.id);
    }


    socket.on("disconnect", async(reason) => {
    if (socket.user) {
        console.log(`disconnected: ${socket.user._id} - ${reason}`);
       await client.sRem(`socket:${socket.user._id}`, socket.id);
      }
      else {
        console.log(`container disconnected: ${socket.id} - ${reason}`);
      }
    });
    registerTranscodingEvents(io, socket); 
  });
  return io;
};
function getCookieValue(cookies, cookieName) {
  const match = cookies.match(new RegExp("(^| )" + cookieName + "=([^;]+)"));
  if (match) return match[2];
  return null;
}

const getIo = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized. Call socketIO() first.");
  }
  return io;
};

module.exports = { SocketIo, getIo };
