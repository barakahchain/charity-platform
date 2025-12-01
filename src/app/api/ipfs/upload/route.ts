import { NextRequest, NextResponse } from 'next/server';
import { uploadToIPFS, uploadJSONToIPFS, getIPFSGatewayURL } from '@/lib/ipfs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const jsonData = formData.get('json') as string | null;
    const type = formData.get('type') as string || 'file';

    // Handle JSON upload
    if (type === 'json' && jsonData) {
      try {
        const data = JSON.parse(jsonData);
        const filename = formData.get('filename') as string || 'metadata.json';
        
        const cid = await uploadJSONToIPFS(data, filename);
        const url = getIPFSGatewayURL(cid, filename);

        return NextResponse.json({
          success: true,
          cid,
          url,
          type: 'json',
        }, { status: 200 });
      } catch (parseError) {
        return NextResponse.json({
          error: 'Invalid JSON data',
          code: 'INVALID_JSON',
        }, { status: 400 });
      }
    }

    // Handle file upload
    if (!file) {
      return NextResponse.json({
        error: 'No file provided',
        code: 'MISSING_FILE',
      }, { status: 400 });
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File size exceeds 100MB limit',
        code: 'FILE_TOO_LARGE',
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Allowed: images, PDF, Word documents, text files',
        code: 'INVALID_FILE_TYPE',
      }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to IPFS
    const cid = await uploadToIPFS(buffer, file.name);
    const url = getIPFSGatewayURL(cid, file.name);

    // Determine evidence type
    let evidenceType = 'document';
    if (file.type.startsWith('image/')) {
      evidenceType = 'image';
    } else if (file.type === 'application/pdf') {
      evidenceType = 'pdf';
    }

    return NextResponse.json({
      success: true,
      cid,
      url,
      filename: file.name,
      size: file.size,
      type: evidenceType,
      mimeType: file.type,
    }, { status: 200 });

  } catch (error) {
    console.error('IPFS upload error:', error);
    
    // Check for specific web3.storage errors
    if (error instanceof Error) {
      if (error.message.includes('WEB3_STORAGE_TOKEN')) {
        return NextResponse.json({
          error: 'IPFS service not configured. Please contact administrator.',
          code: 'IPFS_NOT_CONFIGURED',
        }, { status: 503 });
      }
    }

    return NextResponse.json({
      error: 'Failed to upload to IPFS: ' + error,
      code: 'UPLOAD_FAILED',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cid = searchParams.get('cid');
  const filename = searchParams.get('filename');

  if (!cid) {
    return NextResponse.json({
      error: 'CID parameter is required',
      code: 'MISSING_CID',
    }, { status: 400 });
  }

  try {
    const url = getIPFSGatewayURL(cid, filename || undefined);
    
    return NextResponse.json({
      success: true,
      cid,
      url,
      filename: filename || null,
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to generate IPFS URL: ' + error,
      code: 'URL_GENERATION_FAILED',
    }, { status: 500 });
  }
}