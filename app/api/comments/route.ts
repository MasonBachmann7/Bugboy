import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

interface Comment {
  id: string;
  parentId: string | null;
  entityType: 'product' | 'user' | 'order';
  entityId: string | number;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date | null;
  likes: number;
  replies: Comment[];
}

// Simulated comments store
const commentsStore: Comment[] = [
  {
    id: 'cmt_001',
    parentId: null,
    entityType: 'product',
    entityId: 1001,
    authorId: 'usr_1a2b3c',
    content: 'Great product! Highly recommend.',
    createdAt: new Date('2024-01-15'),
    updatedAt: null,
    likes: 5,
    replies: [],
  },
  {
    id: 'cmt_002',
    parentId: 'cmt_001',
    entityType: 'product',
    entityId: 1001,
    authorId: 'usr_4d5e6f',
    content: 'Agreed! Best purchase I made.',
    createdAt: new Date('2024-01-16'),
    updatedAt: null,
    likes: 2,
    replies: [],
  },
];

// GET /api/comments - Fetch comments for an entity
export const GET = withBugStack(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');
  const includeReplies = searchParams.get('replies') !== 'false';
  const sortBy = searchParams.get('sort') || 'newest';

  if (!entityType || !entityId) {
    return NextResponse.json(
      { success: false, error: 'entityType and entityId are required' },
      { status: 400 }
    );
  }

  // Parse entity ID based on type
  // BUG: parseInt on string entityId for user/order types causes NaN
  const parsedEntityId = entityType === 'product'
    ? parseInt(entityId)
    : entityId;

  // Get root comments (no parent)
  let comments = commentsStore.filter(
    c => c.entityType === entityType &&
         c.entityId === parsedEntityId &&
         c.parentId === null
  );

  // Build reply trees if requested
  if (includeReplies) {
    comments = comments.map(comment => {
      // BUG: Recursive reply building could cause infinite loop
      // if there's a circular reference in parentId
      const replies = buildReplyTree(comment.id);
      return { ...comment, replies };
    });
  }

  // Sort comments
  // BUG: sortBy value not validated - invalid values silently use default
  switch (sortBy) {
    case 'oldest':
      comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      break;
    case 'popular':
      comments.sort((a, b) => b.likes - a.likes);
      break;
    case 'newest':
    default:
      comments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return NextResponse.json({
    success: true,
    data: {
      comments,
      total: comments.length,
      entityType,
      entityId: parsedEntityId,
    },
  });
});

// Helper to build reply tree
function buildReplyTree(parentId: string): Comment[] {
  const replies = commentsStore.filter(c => c.parentId === parentId);

  // BUG: No depth limit - deeply nested replies could cause stack overflow
  return replies.map(reply => ({
    ...reply,
    replies: buildReplyTree(reply.id),
  }));
}

// POST /api/comments - Create new comment
export const POST = withBugStack(async (request: NextRequest) => {
  const body = await request.json();
  const { entityType, entityId, authorId, content, parentId } = body;

  // Validate required fields
  if (!entityType || !entityId || !authorId || !content) {
    return NextResponse.json(
      { success: false, error: 'entityType, entityId, authorId, and content are required' },
      { status: 400 }
    );
  }

  // Validate content length
  // BUG: content.length on non-string could throw or return undefined
  if (content.length < 1 || content.length > 1000) {
    return NextResponse.json(
      { success: false, error: 'Content must be between 1 and 1000 characters' },
      { status: 400 }
    );
  }

  // Verify author exists
  const author = await db.users.findUnique({ where: { id: authorId } });
  if (!author) {
    return NextResponse.json(
      { success: false, error: 'Author not found' },
      { status: 404 }
    );
  }

  // If reply, verify parent comment exists
  if (parentId) {
    const parentComment = commentsStore.find(c => c.id === parentId);
    if (!parentComment) {
      return NextResponse.json(
        { success: false, error: 'Parent comment not found' },
        { status: 404 }
      );
    }

    // BUG: Not checking if parent comment belongs to same entity
    // Could reply to product comment on a user entity
  }

  // BUG: Not sanitizing content - XSS vulnerability
  const comment: Comment = {
    id: `cmt_${Date.now()}`,
    parentId: parentId || null,
    entityType,
    entityId,
    authorId,
    content, // Unsanitized user input
    createdAt: new Date(),
    updatedAt: null,
    likes: 0,
    replies: [],
  };

  commentsStore.push(comment);

  return NextResponse.json({
    success: true,
    data: comment,
  });
});

// PATCH /api/comments - Update or like a comment
export const PATCH = withBugStack(async (request: NextRequest) => {
  const body = await request.json();
  const { commentId, action, content, userId } = body;

  if (!commentId) {
    return NextResponse.json(
      { success: false, error: 'commentId is required' },
      { status: 400 }
    );
  }

  const comment = commentsStore.find(c => c.id === commentId);
  if (!comment) {
    return NextResponse.json(
      { success: false, error: 'Comment not found' },
      { status: 404 }
    );
  }

  if (action === 'like') {
    // BUG: No check to prevent multiple likes from same user
    comment.likes += 1;

    return NextResponse.json({
      success: true,
      data: { likes: comment.likes },
    });
  }

  if (action === 'edit') {
    // BUG: Not verifying userId matches comment authorId
    // Anyone can edit any comment
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required for edit' },
        { status: 400 }
      );
    }

    comment.content = content;
    comment.updatedAt = new Date();

    return NextResponse.json({
      success: true,
      data: comment,
    });
  }

  return NextResponse.json(
    { success: false, error: 'Invalid action' },
    { status: 400 }
  );
});

// DELETE /api/comments - Delete a comment
export const DELETE = withBugStack(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const commentId = searchParams.get('id');
  const userId = searchParams.get('userId');

  if (!commentId) {
    return NextResponse.json(
      { success: false, error: 'Comment ID is required' },
      { status: 400 }
    );
  }

  const commentIndex = commentsStore.findIndex(c => c.id === commentId);
  if (commentIndex === -1) {
    return NextResponse.json(
      { success: false, error: 'Comment not found' },
      { status: 404 }
    );
  }

  // BUG: userId check is optional and not enforced
  // Also not checking if user is admin who could delete any comment
  const comment = commentsStore[commentIndex];
  if (userId && comment.authorId !== userId) {
    return NextResponse.json(
      { success: false, error: 'Not authorized to delete this comment' },
      { status: 403 }
    );
  }

  // BUG: Not deleting child replies - orphaned comments remain
  commentsStore.splice(commentIndex, 1);

  return NextResponse.json({
    success: true,
    message: 'Comment deleted',
  });
});
