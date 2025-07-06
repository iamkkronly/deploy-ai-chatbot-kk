const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch'); // For Node < 18, install: npm i node-fetch@2

const app = express();
const PORT = process.env.PORT || 10000;
const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
  console.error('Error: BOT_TOKEN environment variable is missing!');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

app.get('/', (_, res) => res.send('🤖 AI Chatbot with Memory is running!'));

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// Store last 5 messages per chatId
const chatHistory = new Map();

// Helper to add message to history (user or bot)
function addToHistory(chatId, role, content) {
  if (!chatHistory.has(chatId)) {
    chatHistory.set(chatId, []);
  }
  const history = chatHistory.get(chatId);
  history.push({ role, content });
  // Keep only last 5 messages total (user + bot combined)
  while (history.length > 10) history.shift(); // 10 = 5 user + 5 bot messages roughly
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text?.trim();

  if (!userMessage) {
    return bot.sendMessage(chatId, '❌ Please send a text message.');
  }

  // Add user message to history
  addToHistory(chatId, 'user', userMessage);

  await bot.sendChatAction(chatId, 'typing');

  try {
    // Prepare message context to send — flatten all messages content in sequence
    const history = chatHistory.get(chatId) || [];
    // We'll just send an array of message strings concatenated (or you can send objects if your API supports)
    // Here, we send a single concatenated string separated by newlines as the prompt:
    const systemPrompt = history.map(m => (m.role === 'user' ? `User: ${m.content}` : `Bot: ${m.content}`)).join('\n') + `\nUser: ${userMessage}\nBot:`;

    const response = await fetch('https://chat-api-6usi.onrender.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: systemPrompt }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !data.reply) {
      throw new Error('Unexpected API response');
    }

    // Send reply to user
    await bot.sendMessage(chatId, data.reply);

    // Add bot reply to history
    addToHistory(chatId, 'bot', data.reply);

  } catch (error) {
    console.error('Error:', error);
    await bot.sendMessage(chatId, '⚠️ Sorry, something went wrong. Please try again later.');
  }
});
