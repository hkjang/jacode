import { io, Socket } from 'socket.io-client';

// Determine Socket URL (default to localhost:4000/agent for dev)
// Should ideally come from env vars
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const socket: Socket = io(`${SOCKET_URL}/agent`, {
  autoConnect: false, // We'll connect manually in the provider
  transports: ['websocket'],
});
