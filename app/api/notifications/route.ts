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
  try {
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

    // Fixed: Handle undefined notification channels config safely
    const notificationChannelsConfig = process.env.NOTIFICATION_CHANNELS;
    const notificationChannels = notificationChannelsConfig ? notificationChannelsConfig.split(',') : ['email'];

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
      // Fixed: Validate type value against allowed types
      const validTypes = ['info', 'warning', 'error', 'success'];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
      notifications = notifications.filter(n => n.type === type);
    }

    // Check for expired notifications
    const now = new Date();

    // Fixed: Proper null checking and date comparison
    const validNotifications = notifications.filter(n => {
      if (n.expiresAt === null) return true;
      // Ensure expiresAt is a Date object before comparison
      const expiryDate = n.expiresAt instanceof Date ? n.expiresAt : new Date(n.expiresAt);
      return expiryDate > now;
    });

    // Fixed: Safe date sorting with null checks
    validNotifications.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications: validNotifications,
        unreadCount: validNotifications.filter(n => !n.read).length,
        total: validNotifications.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
});

// POST /api/notifications - Create new notification
export const POST = withBugStack(async (request: NextRequest) => {
  try {
    const body = await request.json();

    const { userId, type, title, message, expiresIn } = body;

    // Validate required fields
    if (!userId || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'userId, title, and message are required' },
        { status: 400 }
      );
    }

    // Fixed: Validate type against allowed values
    const validTypes = ['info', 'warning', 'error', 'success'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (expiresIn) {
      // Fixed: Validate expiresIn is a valid number
      const expiresInHours = Number(expiresIn);
      if (isNaN(expiresInHours) || expiresInHours <= 0) {
        return NextResponse.json(
          { success: false, error: 'expiresIn must be a positive number (hours)' },
          { status: 400 }
        );
      }
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    }

    const notification: Notification = {
      id: `notif_${Date.now()}`,
      userId,
      type: type || 'info',
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
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
});

// PATCH /api/notifications - Mark notifications as read
export const PATCH = withBugStack(async (request: NextRequest) => {
  try {
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

    // Fixed: Require userId to prevent security issue
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required for security' },
        { status: 400 }
      );
    }

    // Fixed: Only update notifications that belong to the requesting user
    let updated = 0;
    for (const id of notificationIds) {
      const notification = notificationsStore.find(n => n.id === id && n.userId === userId);
      if (notification) {
        notification.read = true;
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      data: { updated },
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
});