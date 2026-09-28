/* ========================================
   Apartment Care - Socket.IO Client
   ======================================== */
let socket = null;

function initSocket() {
  if (!window.io) return null;
  const token = AuthStore.getToken();
  socket = io(API_BASE_URL, { auth: { token } });
  socket.on('connect_error', () => {
    console.warn('Socket connection failed, polling fallback active.');
  });
  return socket;
}

function getSocket() {
  if (socket) return socket;
  return initSocket();
}

/* Generic realtime listeners: register handlers for known events.
   handlerMap: { eventName: fn(data) } */
function onRealtimeEvents(handlerMap) {
  const client = getSocket();
  if (!client) return;
  Object.keys(handlerMap).forEach((event) => {
    client.on(event, handlerMap[event]);
  });
}
