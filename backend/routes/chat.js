import express from 'express';
import {
  getUserChats,
  getChatById,
  createChat,
  addMessage,
  deleteChat,
  updateChatTitle,
  getNewMessages
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route('/')
  .get(getUserChats)
  .post(createChat);

router.route('/:id')
  .get(getChatById)
  .delete(deleteChat)
  .patch(updateChatTitle);

router.route('/:id/messages')
  .post(addMessage)
  .get(getNewMessages);

export default router;