import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
import Chat from '../models/Chat.js';


const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1'
});

// Debug: Log environment variables to verify dotenv is working
// console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY);

// Process message with AI and return response
export const processMessage = async (req, res) => {
  try {
    const { chatId, message } = req.query;

    if (!message || !chatId) {
      return res.status(400).json({
        success: false,
        message: 'Message and chat ID are required'
      });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat'
      });
    }

    const previousMessages = chat.messages
      .slice(-10)
      .map(msg => ({
        role: msg.isAI ? 'assistant' : 'user',
        content: msg.content
      }));

    previousMessages.push({
      role: 'user',
      content: message
    });

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Flush the headers to establish the connection

    try {
      const stream = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that provides concise, accurate information.'
          },
          ...previousMessages
        ],
        temperature: 0.7,
        max_tokens: 4096, // Increased max_tokens for longer responses
        stream: true,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // When the stream is finished, save the full message
      if (fullResponse) {
        const aiMessage = {
          content: fullResponse,
          isAI: true,
          timestamp: new Date()
        };
        await chat.addMessage(aiMessage);
      }
      
      // Send a final event to signal the end of the stream
      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error) {
      console.error('OpenAI API stream error:', error);
      // Send an error event to the client
      res.write(`data: ${JSON.stringify({ error: "I apologize, but I'm having trouble processing your request right now." })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('AI processing error:', error);
    // This part will likely not be reached if headers are already sent,
    // but it's good for catching initial setup errors.
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error processing AI request'
      });
    } else {
      res.end();
    }
  }
};

// Analyze uploaded file content
export const analyzeFileContent = async (req, res) => {
  try {
    const { fileContent, fileName, fileType } = req.body;

    if (!fileContent) {
      return res.status(400).json({
        success: false,
        message: 'File content is required'
      });
    }

    // Truncate content if too long
    const maxContentLength = 4000;
    const truncatedContent = fileContent.length > maxContentLength
      ? fileContent.substring(0, maxContentLength) + '... (content truncated)'
      : fileContent;

    // Create a prompt based on file type
    let prompt = `Analyze this ${fileType} file named "${fileName}". Provide a concise summary and any key insights:\n\n${truncatedContent}`;

    try {
      // Call OpenAI API with timeout
      const response = await Promise.race([
        openai.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that analyzes files and provides helpful insights.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 500
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OpenAI API timeout')), 30000)
        )
      ]);

      const analysis = response.choices[0].message.content;

      res.status(200).json({
        success: true,
        data: {
          fileName,
          fileType,
          analysis
        }
      });
    } catch (error) {
      console.error('OpenAI API error during file analysis:', error);
      res.status(200).json({
        success: true,
        data: {
          fileName,
          fileType,
          analysis: "I apologize, but I'm having trouble analyzing this file right now. Please try again in a moment."
        },
        warning: 'Used fallback response due to AI service error'
      });
    }
  } catch (error) {
    console.error('File analysis error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error analyzing file'
    });
  }
};