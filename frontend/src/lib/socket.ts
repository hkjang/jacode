import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

// Determine Socket URL (default to localhost:4000/agent for dev)
// Should ideally come from env vars
const SOCKET_URL = API_BASE_URL;

export const socket: Socket = io(`${SOCKET_URL}/agent`, {
  autoConnect: false, // We'll connect manually in the provider
  transports: ['websocket'],
});
