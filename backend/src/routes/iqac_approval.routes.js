import { Router } from 'express';
import { upload } from '../middlewares/multer.middleware.js';
import {
  createIqacApproval,
  decideIqacApproval,
  getCreatedIqacApprovals,
  getMyIqacApprovals
} from '../controllers/iqacApproval.controller.js';

const router = Router();

router.get('/', getCreatedIqacApprovals);
router.get('/mine', getMyIqacApprovals);
router.post('/', upload.any(), createIqacApproval);
router.post('/:id/decision', decideIqacApproval);

export default router;
