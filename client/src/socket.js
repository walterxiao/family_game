import { io } from 'socket.io-client';

// In dev, Vite proxies /socket.io to localhost:3000.
// In production, the server serves the client, so origin is the same.
const socket = io(window.location.origin, {
  transports: ['websocket'],
  autoConnect: true,
});

export default socket;
