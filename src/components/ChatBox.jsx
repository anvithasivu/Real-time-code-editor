import React, { useState, useEffect, useRef } from 'react';

const ChatBox = ({ socket, roomId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on('new-message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off('new-message');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      socket.emit('send-message', { roomId, message: newMessage });
      setNewMessage('');
    }
  };

  return (
    <div className="chat-container">
      <h3 className="sidebar-title">Room Chat</h3>
      <div className="messages-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.system ? 'system-message' : ''}`}>
            {!msg.system && <span className="message-sender">{msg.sender}: </span>}
            <span className="message-text">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="chat-input"
        />
        <button type="submit" className="chat-send-btn">Send</button>
      </form>
    </div>
  );
};

export default ChatBox;
