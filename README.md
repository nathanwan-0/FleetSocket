# FleetSocket

FleetSocket is a lightweight real-time chat application built with WebSockets, Redis, and React. Users can join chat rooms, send messages, and switch between rooms instantly. Messages are persisted in Redis, ensuring chat history is maintained across sessions.

---

## Features

- Real-time chat using WebSocket connections  
- Multiple chat rooms (create, delete, switch)  
- Message persistence via Redis  
- Automatic trimming of old messages (keeps last 1000 messages per room)  
- React frontend with Vite and Tailwind CSS  
- Client-side message deduplication  
- Persistent usernames stored locally  

---

## Project Structure

```
FleetSocket/
├── server/
│   ├── server.js
│   ├── redisClient.js
│   ├── package.json
│   ├── package-lock.json
│   └── node_modules/
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.mjs
│   ├── tailwind.config.mjs
│   ├── vite.config.mjs
│   └── node_modules/
└── docker-compose.yml
```

---

## Requirements

- Node.js 18 or higher  
- Redis (local installation or Docker)  

---

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/fleetsocket.git
cd FleetSocket
```

---

## Backend Setup

1. Navigate to the backend folder:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Start the backend server:
```bash
npm start
```
The WebSocket + Express server will run on `http://localhost:3001` by default.

---

## Frontend Setup

1. Open a new terminal and navigate to the frontend folder:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the frontend build and serve it (production mode):
```bash
npm run build
npx serve dist
```
- This will build the frontend into the `dist` folder.  
- `npx serve dist` will serve the production build at `http://localhost:5000` (default port).  

> You can also run the frontend in development mode using:
```bash
npm run dev
```
- The development server will run at `http://localhost:5173`.  

---

## Environment Variables

| Variable    | Description                        | Default                  |
|------------ |----------------------------------- |------------------------- |
| `VITE_WS_URL` | WebSocket server URL (frontend)   | `ws://localhost:3001`    |
| `REDIS_URL`  | Redis connection string (backend) | `redis://localhost:6379`|
| `PORT`       | Backend server port               | `3001`                   |

---

## Usage

1. Open the frontend URL (`http://localhost:5000` for production or `http://localhost:5173` for dev).  
2. Enter a username to join the chat.  
3. Use the sidebar to:
   - Create new rooms  
   - Delete rooms (except the default "General")  
   - Switch between rooms  
4. Type messages and hit **Enter** or click **Send** to communicate.

---

## Technology Stack

- Frontend: React, Vite, Tailwind CSS  
- Backend: Node.js, Express, WebSocket  
- Data Layer: Redis (Pub/Sub + message storage)

## License
Released under the MIT License.