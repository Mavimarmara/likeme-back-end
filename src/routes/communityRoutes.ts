import { Router } from 'express';
import { 
  createPost, 
  getPosts, 
  getPost, 
  updatePost, 
  deletePost, 
  likePost, 
  createComment, 
  deleteComment 
} from '@/controllers/communityController';
import { 
  createPostSchema, 
  updatePostSchema, 
  searchSchema, 
  idParamSchema 
} from '@/utils/validationSchemas';
import { validate, validateQuery, validateParams } from '@/middleware/validation';
import { authenticateToken, requireAuth } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken, requireAuth);

// Post routes
router.post('/', validate(createPostSchema), createPost);
router.get('/', validateQuery(searchSchema), getPosts);
router.get('/:id', validateParams(idParamSchema), getPost);
router.put('/:id', validateParams(idParamSchema), validate(updatePostSchema), updatePost);
router.delete('/:id', validateParams(idParamSchema), deletePost);

// Like routes
router.post('/:id/like', validateParams(idParamSchema), likePost);

// Comment routes
router.post('/:id/comments', validateParams(idParamSchema), validate(createPostSchema), createComment);
router.delete('/comments/:commentId', validateParams(idParamSchema), deleteComment);

export default router;
