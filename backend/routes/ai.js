import express from 'express';
import { processMessage, analyzeFileContent } from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.get('/message', processMessage);
router.post('/analyze-file', analyzeFileContent);

export default router;