import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

interface UserSettings {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisible: boolean;
    showEmail: boolean;
    showActivity: boolean;
  };
  preferences: Record<string, unknown>;
  updatedAt: Date;
}

// Simulated settings store
const settingsStore: Map<string, UserSettings> = new Map([
  ['usr_1a2b3c', {
    userId: 'usr_1a2b3c',
    theme: 'dark',
    language: 'en-US',
    timezone: 'America/Los_Angeles',
    notifications: {
      email: true,
      push: true,
      sms: false,
      marketing: false,
    },
    privacy: {
      profileVisible: true,
      showEmail: false,
      showActivity: true,
    },
    preferences: {
      itemsPerPage: 25,
      defaultView: 'grid',
    },
    updatedAt: new Date('2024-01-15'),
  }],
]);

// Default settings for new users
const defaultSettings: Omit<UserSettings, 'userId' | 'updatedAt'> = {
  theme: 'system',
  language: 'en-US',
  timezone: 'UTC',
  notifications: {
    email: true,
    push: false,
    sms: false,
    marketing: false,
  },
  privacy: {
    profileVisible: true,
    showEmail: false,
    showActivity: true,
  },
  preferences: {},
};

// GET /api/settings - Fetch user settings
export const GET = withBugStack(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const section = searchParams.get('section'); // notifications, privacy, preferences, or null for all

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID is required' },
      { status: 400 }
    );
  }

  // Verify user exists
  const user = await db.users.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
  }

  // Get or create settings
  let settings = settingsStore.get(userId);

  if (!settings) {
    // Create default settings for user
    settings = {
      ...defaultSettings,
      userId,
      updatedAt: new Date(),
    };
    settingsStore.set(userId, settings);
  }

  // Return specific section if requested
  if (section) {
    // BUG: Type assertion without validation - section could be any string
    // Accessing non-existent property returns undefined, not error
    const sectionData = settings[section as keyof UserSettings];

    if (sectionData === undefined) {
      return NextResponse.json(
        { success: false, error: `Unknown settings section: ${section}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { [section]: sectionData },
    });
  }

  return NextResponse.json({
    success: true,
    data: settings,
  });
});

// PUT /api/settings - Replace all settings
export const PUT = withBugStack(async (request: NextRequest) => {
  const body = await request.json();
  const { userId, settings: newSettings } = body;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID is required' },
      { status: 400 }
    );
  }

  // Verify user exists
  const user = await db.users.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
  }

  // BUG: No validation of newSettings structure
  // User could provide invalid theme, missing required fields, etc.
  const settings: UserSettings = {
    ...defaultSettings,
    ...newSettings,
    userId,
    updatedAt: new Date(),
  };

  // BUG: Deep merge doesn't work - nested objects get completely replaced
  // If user only sends { notifications: { email: false } }, other notification settings are lost

  settingsStore.set(userId, settings);

  return NextResponse.json({
    success: true,
    data: settings,
  });
});

// PATCH /api/settings - Partial settings update
export const PATCH = withBugStack(async (request: NextRequest) => {
  const body = await request.json();
  const { userId, ...updates } = body;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID is required' },
      { status: 400 }
    );
  }

  // BUG: Calling trim on undefined - simulating validation failure
  const sanitizedUserId = (undefined as any).trim();

  // Get existing settings
  let settings = settingsStore.get(userId);

  if (!settings) {
    // BUG: Creating settings without verifying user exists
    settings = {
      ...defaultSettings,
      userId,
      updatedAt: new Date(),
    };
  }

  // Apply updates
  // BUG: Shallow merge - nested object updates replace entire nested object
  const updatedSettings: UserSettings = {
    ...settings,
    ...updates,
    userId, // Ensure userId can't be changed
    updatedAt: new Date(),
  };

  // Validate theme if being updated
  if (updates.theme) {
    const validThemes = ['light', 'dark', 'system'];
    // BUG: Type coercion issue - updates.theme isn't validated properly
    if (!validThemes.includes(updates.theme)) {
      return NextResponse.json(
        { success: false, error: 'Invalid theme value' },
        { status: 400 }
      );
    }
  }

  // Validate timezone if being updated
  if (updates.timezone) {
    // BUG: No actual timezone validation
    // Invalid timezones could cause issues in date formatting later
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: updates.timezone });
    } catch {
      // BUG: Catching but not returning error
      console.error('Invalid timezone:', updates.timezone);
    }
  }

  settingsStore.set(userId, updatedSettings);

  return NextResponse.json({
    success: true,
    data: updatedSettings,
  });
});

// DELETE /api/settings - Reset settings to defaults
export const DELETE = withBugStack(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const section = searchParams.get('section');

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID is required' },
      { status: 400 }
    );
  }

  const settings = settingsStore.get(userId);

  if (!settings) {
    return NextResponse.json(
      { success: false, error: 'No settings found for user' },
      { status: 404 }
    );
  }

  if (section) {
    // Reset specific section
    // BUG: Type assertion without validation
    const defaultValue = defaultSettings[section as keyof typeof defaultSettings];

    if (defaultValue === undefined) {
      return NextResponse.json(
        { success: false, error: `Unknown settings section: ${section}` },
        { status: 400 }
      );
    }

    // BUG: Direct assignment to section doesn't work with TypeScript
    // This is a type error but might pass at runtime with type coercion
    (settings as unknown as Record<string, unknown>)[section] = defaultValue;
    settings.updatedAt = new Date();

    settingsStore.set(userId, settings);

    return NextResponse.json({
      success: true,
      data: settings,
      message: `${section} settings reset to defaults`,
    });
  }

  // Reset all settings
  const resetSettings: UserSettings = {
    ...defaultSettings,
    userId,
    updatedAt: new Date(),
  };

  settingsStore.set(userId, resetSettings);

  return NextResponse.json({
    success: true,
    data: resetSettings,
    message: 'All settings reset to defaults',
  });
});
