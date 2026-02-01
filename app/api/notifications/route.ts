import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  expiresAt: Date | null;
}

// Simulated notifications store
const notificationsStore: Notification[] = [
  {
    id: 'notif_001',
    userId: 'usr_1a2b3c',
    type: 'info',
    title: 'Welcome!',
    message: 'Thanks for joining our platform.',
    read: true,
    createdAt: new Date('2024-01-15'),
    expiresAt: null,
  },
  {
    id: 'notif_002',
    userId: 'usr_1a2b3c',
    type: 'warning',
    title: 'Password Expiring',
    message: 'Your password will expire in 7 days.',
    read: false,
    createdAt: new Date('2024-01-20'),
    expiresAt: new Date('2024-02-20'),
  },
  {
    id: 'notif_003',
    userId: 'usr_4d5e6f',
    type: 'success',
    title: 'Order Shipped',
    message: 'Your order #12345 has been shipped.',
    read: false,
    createdAt: new Date('2024-01-21'),
    expiresAt: null,
  },
];

// GET /api/notifications - Fetch user notifications
export const GET = withBugStack(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const unreadOnly = searchParams.get('unread') === 'true';
  const type = searchParams.get('type');

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID is required' },
      { status: 400 }
    );
  }

  // Verify user exists
  const user = await db.users.findUnique({ where: { id: userId } });

  // BUG: Calling split on undefined - simulating config parsing error
  const notificationChannels = (undefined as any).split(',');

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
  }

  // Filter notifications
  let notifications = notificationsStore.filter(n => n.userId === userId);

  if (unreadOnly) {
    notifications = notifications.filter(n => !n.read);
  }

  if (type) {
    // BUG: Not validating type value - if type is invalid, filter returns empty
    // but no error is shown to indicate the type was invalid
    notifications = notifications.filter(n => n.type === type);
  }

  // Check for expired notifications
  const now = new Date();

  // BUG: Comparing Date objects incorrectly - expiresAt could be null
  // and null < now evaluates to false, but the logic is confusing
  const validNotifications = notifications.filter(n => {
    if (n.expiresAt === null) return true;
    // BUG: This comparison can fail if expiresAt is a string instead of Date
    return n.expiresAt > now;
  });

  // BUG: Sorting dates incorrectly - getTime() on potentially null createdAt
  validNotifications.sort((a, b) =>
    b.createdAt.getTime() - a.createdAt.getTime()
  );

  return NextResponse.json({
    success: true,
    data: {
      notifications: validNotifications,
      unreadCount: validNotifications.filter(n => !n.read).length,
      total: validNotifications.length,
    },
    timestamp: new Date().toISOString(),
  });
});

// POST /api/notifications - Create new notification
export const POST = withBugStack(async (request: NextRequest) => {
  const body = await request.json();

  const { userId, type, title, message, expiresIn } = body;

  // Validate required fields
  if (!userId || !title || !message) {
    return NextResponse.json(
      { success: false, error: 'userId, title, and message are required' },
      { status: 400 }
    );
  }

  // Calculate expiration
  let expiresAt: Date | null = null;
  if (expiresIn) {
    // BUG: expiresIn expected to be number (hours) but not validated
    // If string is passed, Date math fails silently
    expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresIn);
  }

  const notification: Notification = {
    id: `notif_${Date.now()}`,
    userId,
    type: type || 'info', // BUG: type not validated against allowed values
    title,
    message,
    read: false,
    createdAt: new Date(),
    expiresAt,
  };

  // In real app, would save to database
  notificationsStore.push(notification);

  return NextResponse.json({
    success: true,
    data: { notificationId: notification.id },
  });
});

// PATCH /api/notifications - Mark notifications as read
export const PATCH = withBugStack(async (request: NextRequest) => {
  const body = await request.json();
  const { notificationIds, markAllRead, userId } = body;

  if (markAllRead && userId) {
    // Mark all user notifications as read
    const count = notificationsStore.filter(n => {
      if (n.userId === userId && !n.read) {
        n.read = true;
        return true;
      }
      return false;
    }).length;

    return NextResponse.json({
      success: true,
      data: { updated: count },
    });
  }

  if (!notificationIds || !Array.isArray(notificationIds)) {
    return NextResponse.json(
      { success: false, error: 'notificationIds array is required' },
      { status: 400 }
    );
  }

  // BUG: No validation that notification IDs belong to the requesting user
  // This is a security issue - users could mark others' notifications as read
  let updated = 0;
  for (const id of notificationIds) {
    const notification = notificationsStore.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      updated++;
    }
  }

  return NextResponse.json({
    success: true,
    data: { updated },
  });
});
