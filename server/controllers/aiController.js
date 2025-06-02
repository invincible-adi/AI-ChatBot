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
    const { chatId, message } = req.body;

    if (!message || !chatId) {
      return res.status(400).json({
        success: false,
        message: 'Message and chat ID are required'
      });
    }

    // Check if chat exists and user is participant
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

    // Format previous messages for context (limit to last 10 for token efficiency)
    const previousMessages = chat.messages
      .slice(-10)
      .map(msg => ({
        role: msg.isAI ? 'assistant' : 'user',
        content: msg.content
      }));

    // Add current message
    previousMessages.push({
      role: 'user',
      content: message
    });

    try {
      // Call OpenAI API with timeout and retry logic
      const response = await Promise.race([
        openai.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that provides concise, accurate information.'
            },
            ...previousMessages
          ],
          temperature: 0.7,
          max_tokens: 500
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OpenAI API timeout')), 30000)
        )
      ]);

      // Get AI response
      const aiResponse = response.choices[0].message.content;

      // Add AI response to chat
      const aiMessage = {
        sender: undefined, // Use undefined, not null
        content: aiResponse,
        isAI: true,
        timestamp: new Date()
      };

      chat.messages.push(aiMessage);
      await chat.save();

      // Return sender as { username: "AI" } for frontend display
      res.status(200).json({
        success: true,
        data: {
          ...aiMessage,
          sender: { username: "AI" }
        }
      });
    } catch (error) {
      console.error('OpenAI API error:', error);

      // Send a fallback response
      const fallbackMessage = {
        sender: undefined,
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        isAI: true,
        timestamp: new Date()
      };

      chat.messages.push(fallbackMessage);
      await chat.save();

      res.status(200).json({
        success: true,
        data: {
          ...fallbackMessage,
          sender: { username: "AI" }
        },
        warning: 'Used fallback response due to AI service error'
      });
    }
  } catch (error) {
    console.error('AI processing error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing AI request'
    });
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