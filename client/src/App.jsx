import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Send, LogOut, Circle, Plus, Trash2 } from 'lucide-react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

function useFleetSocket({ roomId, name }) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const outboxRef = useRef([]);

  useEffect(() => {
    if (!name) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'setName', name }));
      ws.send(JSON.stringify({ type: 'join', roomId }));

      while (outboxRef.current.length) {
        const item = outboxRef.current.shift();
        ws.send(JSON.stringify(item));
      }
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        if (msg.type === 'history') {
          const newMessages = msg.messages || [];
          setMessages(newMessages);
        } else if (msg.type === 'message') {
          const incoming = msg.payload || msg.message;

          setMessages((prev) => {
            // check by content + from + roomId + timestamp tolerance (1s)
            const alreadyExists = prev.some((m) => {
              const sameContent = m.content === incoming.content;
              const sameFrom = m.from === incoming.from;
              const sameRoom = m.roomId === incoming.roomId;
              const closeTime = Math.abs(m.ts - incoming.ts) < 1000; // within 1 second
              return sameContent && sameFrom && sameRoom && closeTime;
            });

            if (alreadyExists) return prev;
            return [...prev, incoming];
          });
        }
      } catch (e) {
        console.error('bad message', e);
      }
    };

    ws.onclose = () => setConnected(false);
    return () => ws.close();
  }, [roomId, name]);

  function send(content) {
    if (!content.trim()) return;
    const payload = {
      type: 'send',
      roomId,
      content,
      id: uuidv4(),
      ts: Date.now(),
      from: name,
    };
    setMessages((prev) => [...prev, payload]);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
    else outboxRef.current.push(payload);
  }

  return { connected, messages, send };
}

export default function App() {
  const storedName = localStorage.getItem('fleetName') || '';
  const [name, setName] = useState(storedName);
  const [typedName, setTypedName] = useState('');
  const [rooms, setRooms] = useState(['General']);
  const [roomId, setRoomId] = useState('General');
  const [text, setText] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const chatEndRef = useRef(null);
  const { connected, messages, send } = useFleetSocket({ roomId, name });

  function setUserName() {
    if (!typedName.trim()) return;
    localStorage.setItem('fleetName', typedName.trim());
    setName(typedName.trim());
  }

  function logout() {
    localStorage.removeItem('fleetName');
    setName('');
    setTypedName('');
  }

  function addRoom() {
    const trimmed = newRoom.trim();
    if (!trimmed || rooms.includes(trimmed)) return;
    setRooms([...rooms, trimmed]);
    setNewRoom('');
  }

  function deleteRoom(r) {
    if (r === 'General') return; // protect default room
    setRooms((prev) => prev.filter((room) => room !== r));
    if (roomId === r) setRoomId('General');
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!name) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#2B2D31] text-white">
        <h2 className="text-3xl font-semibold mb-6">Welcome to FleetSocket</h2>
        <input
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder="Enter your name"
          onKeyDown={(e) => e.key === 'Enter' && setUserName()}
          className="bg-[#1E1F22] border border-gray-600 rounded px-3 py-2 mb-4 w-72 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={setUserName}
          className="bg-indigo-600 text-white px-5 py-2 rounded hover:bg-indigo-700 flex items-center gap-2"
        >
          Join Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen font-sans bg-[#313338] text-gray-100">
      {/* Sidebar */}
      <div className="w-60 bg-[#2B2D31] border-r border-[#202225] p-4 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold mb-4">FleetSocket</h2>
          <div className="space-y-2">
            <div className="text-gray-400 text-sm uppercase">Rooms</div>
            {rooms.map((r) => (
              <div
                key={r}
                className={`flex justify-between items-center px-3 py-2 rounded cursor-pointer ${
                  r === roomId ? 'bg-[#404249] text-white' : 'hover:bg-[#383A40]'
                }`}
                onClick={() => setRoomId(r)}
              >
                <span>{r}</span>
                {r !== 'General' && (
                  <Trash2
                    size={14}
                    className="text-gray-400 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRoom(r);
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Add room input */}
          <div className="mt-4 flex items-center gap-2">
            <input
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder="New room"
              className="bg-[#1E1F22] border border-gray-600 rounded px-2 py-1 text-sm flex-1 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && addRoom()}
            />
            <button
              onClick={addRoom}
              className="p-1 bg-indigo-600 rounded hover:bg-indigo-700"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#202225]">
          <div className="flex items-center gap-2">
            <Circle
              size={10}
              className={connected ? 'text-green-500 fill-green-500' : 'text-red-500 fill-red-500'}
            />
            <span className="text-sm">{name}</span>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-red-400 transition"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="border-b border-[#202225] px-6 py-3 bg-[#313338] flex items-center text-lg font-semibold">
          {roomId}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-[#313338]">
          {messages.map((m) => (
            <div key={m.id || `${m.from}-${m.ts}-${m.content}`} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
                {m.from[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-gray-100">{m.from}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(m.ts).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-gray-200 mt-1">{m.content}</div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#202225] bg-[#2B2D31] flex gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${roomId}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                send(text);
                setText('');
              }
            }}
            className="flex-1 bg-[#1E1F22] border border-[#3C3F43] rounded px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => {
              send(text);
              setText('');
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-1"
          >
            <Send size={18} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
