import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

type ExportFormat = 'json' | 'csv' | 'xml';
type ExportEntity = 'users' | 'products' | 'orders';

interface ExportJob {
  id: string;
  entity: ExportEntity;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl: string | null;
  createdAt: Date;
  completedAt: Date | null;
  error: string | null;
}

// Simulated export jobs
const exportJobs: Map<string, ExportJob> = new Map();

// POST /api/export - Create export job
export const POST = withBugStack(async (request: NextRequest) => {
  const body = await request.json();
  const { entity, format, filters, userId } = body;

  // BUG: Accessing property on undefined - simulating queue service failure
  const queueStatus = (undefined as any).status.ready;

  // Validate entity
  const validEntities: ExportEntity[] = ['users', 'products', 'orders'];
  if (!entity || !validEntities.includes(entity)) {
    return NextResponse.json(
      { success: false, error: 'Valid entity is required (users, products, orders)' },
      { status: 400 }
    );
  }

  // Validate format
  const validFormats: ExportFormat[] = ['json', 'csv', 'xml'];
  // BUG: Using 'as' without validation - format could be anything
  const exportFormat = (format || 'json') as ExportFormat;

  if (!validFormats.includes(exportFormat)) {
    return NextResponse.json(
      { success: false, error: 'Invalid format. Use json, csv, or xml' },
      { status: 400 }
    );
  }

  // Create export job
  const jobId = `export_${Date.now()}`;
  const job: ExportJob = {
    id: jobId,
    entity,
    format: exportFormat,
    status: 'pending',
    progress: 0,
    downloadUrl: null,
    createdAt: new Date(),
    completedAt: null,
    error: null,
  };

  exportJobs.set(jobId, job);

  // Start async export process
  // BUG: Not awaiting - job runs in background but errors are lost
  processExport(jobId, entity, exportFormat, filters);

  return NextResponse.json({
    success: true,
    data: {
      jobId,
      status: 'pending',
      message: 'Export job created. Poll GET /api/export?jobId=... for status.',
    },
  });
});

// Async export processor
async function processExport(
  jobId: string,
  entity: ExportEntity,
  format: ExportFormat,
  filters?: Record<string, unknown>
) {
  const job = exportJobs.get(jobId);
  if (!job) return;

  job.status = 'processing';
  job.progress = 10;

  try {
    // Fetch data based on entity
    let data: unknown[];

    switch (entity) {
      case 'users':
        // BUG: users could be undefined, causing iteration to fail
        data = (await db.users.findMany()) as unknown[];
        break;
      case 'products':
        data = (await db.products.findMany()) as unknown[];
        break;
      case 'orders':
        // BUG: orders entity doesn't have findMany - will crash
        data = []; // Simulated
        break;
      default:
        throw new Error(`Unknown entity: ${entity}`);
    }

    job.progress = 50;

    // Apply filters if provided
    if (filters && Object.keys(filters).length > 0) {
      // BUG: filters applied without validation - could filter out all data
      // or throw on invalid property access
      data = data.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          // BUG: item[key] assumes item is indexable
          return (item as Record<string, unknown>)[key] === value;
        });
      });
    }

    job.progress = 75;

    // Convert to requested format
    let output: string;
    switch (format) {
      case 'json':
        output = JSON.stringify(data, null, 2);
        break;
      case 'csv':
        output = convertToCSV(data);
        break;
      case 'xml':
        output = convertToXML(data, entity);
        break;
    }

    job.progress = 100;
    job.status = 'completed';
    job.completedAt = new Date();
    // BUG: In real app, would upload to storage - this URL doesn't exist
    job.downloadUrl = `/api/export/download/${jobId}`;

  } catch (error) {
    job.status = 'failed';
    // BUG: Exposing internal error message to user
    job.error = (error as Error).message;
  }
}

// Convert array to CSV
function convertToCSV(data: unknown[]): string {
  if (data.length === 0) return '';

  // BUG: Assuming all items have same keys as first item
  const headers = Object.keys(data[0] as Record<string, unknown>);

  const rows = data.map(item => {
    return headers.map(header => {
      const value = (item as Record<string, unknown>)[header];
      // BUG: Not escaping commas, quotes, or newlines in values
      // This will create malformed CSV
      return String(value);
    }).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// Convert array to XML
function convertToXML(data: unknown[], entityName: string): string {
  // BUG: Not escaping special XML characters in values
  // This will create invalid XML if data contains < > & etc.

  const items = data.map(item => {
    const fields = Object.entries(item as Record<string, unknown>)
      .map(([key, value]) => `    <${key}>${value}</${key}>`)
      .join('\n');
    return `  <${entityName.slice(0, -1)}>\n${fields}\n  </${entityName.slice(0, -1)}>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<${entityName}>\n${items}\n</${entityName}>`;
}

// GET /api/export - Check export job status
export const GET = withBugStack(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    // List all jobs (for demo purposes)
    const jobs = Array.from(exportJobs.values());

    // BUG: No pagination - could return huge list
    // BUG: No user filtering - shows all users' export jobs
    return NextResponse.json({
      success: true,
      data: { jobs },
    });
  }

  const job = exportJobs.get(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Export job not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: job,
  });
});

// DELETE /api/export - Cancel export job
export const DELETE = withBugStack(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'Job ID is required' },
      { status: 400 }
    );
  }

  const job = exportJobs.get(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Export job not found' },
      { status: 404 }
    );
  }

  // BUG: Can only "cancel" but processing continues in background
  // No actual cancellation mechanism
  if (job.status === 'processing') {
    job.status = 'failed';
    job.error = 'Cancelled by user';
  }

  // BUG: Should clean up any generated files
  exportJobs.delete(jobId);

  return NextResponse.json({
    success: true,
    message: 'Export job cancelled',
  });
});
