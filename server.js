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

app.get('/', (_, res) => res.send('🤖 AI Chatbot Bot is running!'));

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text?.trim();

  if (!userMessage) {
    return bot.sendMessage(chatId, '❌ Please send a text message.');
  }

  await bot.sendChatAction(chatId, 'typing');

  try {
    const response = await fetch('https://chat-api-6usi.onrender.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !data.reply) {
      throw new Error('Unexpected API response');
    }

    await bot.sendMessage(chatId, data.reply);

  } catch (error) {
    console.error('Error:', error);
    await bot.sendMessage(chatId, '⚠️ Sorry, something went wrong. Please try again later.');
  }
});
