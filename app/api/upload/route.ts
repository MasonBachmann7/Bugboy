import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  url: string;
}

// Allowed file types and size limits
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Simulated file storage
const uploadedFiles: UploadedFile[] = [];

// POST /api/upload - Handle file upload
export const POST = withBugStack(async (request: NextRequest) => {
  const contentType = request.headers.get('content-type');

  // Check if it's a multipart form
  if (!contentType?.includes('multipart/form-data')) {
    return NextResponse.json(
      { success: false, error: 'Content-Type must be multipart/form-data' },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // BUG: file.type could be empty string for unknown types
    // ALLOWED_TYPES.includes('') returns false, but error message is misleading
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `File type not allowed: ${file.type}`,
          allowedTypes: ALLOWED_TYPES,
        },
        { status: 415 }
      );
    }

    // Check file size
    // BUG: file.size could be 0 for empty files, which passes validation
    // but causes issues downstream
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          actualSize: file.size,
        },
        { status: 413 }
      );
    }

    // Generate unique filename
    // BUG: Not sanitizing original filename - could contain path traversal characters
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `${userId || 'anonymous'}_${timestamp}.${extension}`;

    // BUG: extension could be undefined if filename has no dot
    // resulting in filename ending with '.undefined'

    // Simulate file processing
    const bytes = await file.arrayBuffer();

    // BUG: Not validating file contents match declared MIME type
    // User could upload malicious file with fake extension

    const uploadedFile: UploadedFile = {
      id: `file_${timestamp}`,
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: bytes.byteLength,
      uploadedAt: new Date(),
      url: `/uploads/${filename}`, // BUG: Assuming this path exists
    };

    uploadedFiles.push(uploadedFile);

    return NextResponse.json({
      success: true,
      data: uploadedFile,
    });
  } catch (error) {
    // BUG: Exposing internal error details to client
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
});

// GET /api/upload - List uploaded files
export const GET = withBugStack(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const mimeType = searchParams.get('type');

  let files = [...uploadedFiles];

  if (userId) {
    // BUG: String matching on filename is fragile
    // userId could match partial strings incorrectly
    files = files.filter(f => f.filename.startsWith(userId));
  }

  if (mimeType) {
    files = files.filter(f => f.mimeType === mimeType);
  }

  // BUG: No pagination - could return massive array
  // Sort by upload date descending
  files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

  // Calculate total storage used
  // Fixed: Add initial value to reduce to handle empty arrays
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return NextResponse.json({
    success: true,
    data: {
      files,
      count: files.length,
      totalSize,
      totalSizeFormatted: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
    },
  });
});

// DELETE /api/upload - Delete a file
export const DELETE = withBugStack(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const fileId = searchParams.get('id');

  if (!fileId) {
    return NextResponse.json(
      { success: false, error: 'File ID is required' },
      { status: 400 }
    );
  }

  const fileIndex = uploadedFiles.findIndex(f => f.id === fileId);

  // BUG: No authorization check - any user can delete any file
  if (fileIndex === -1) {
    return NextResponse.json(
      { success: false, error: 'File not found' },
      { status: 404 }
    );
  }

  // BUG: splice returns removed elements, not remaining array
  // This doesn't affect functionality but is conceptually wrong
  const deleted = uploadedFiles.splice(fileIndex, 1);

  return NextResponse.json({
    success: true,
    data: { deleted: deleted[0] },
  });
});