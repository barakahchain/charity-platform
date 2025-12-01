import { NextResponse } from 'next/server';
import { DatabaseTestService } from '@/db/test-connection';

export async function GET() {
  try {
    console.log('🧪 Starting Turso database connection test...');
    
    // Check environment variables first
    const hasConnectionUrl = !!process.env.TURSO_CONNECTION_URL;
    const hasAuthToken = !!process.env.TURSO_AUTH_TOKEN;
    
    if (!hasConnectionUrl || !hasAuthToken) {
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        success: false,
        error: 'Missing Turso environment variables',
        environment: {
          hasConnectionUrl,
          hasAuthToken,
          connectionUrlLength: process.env.TURSO_CONNECTION_URL?.length || 0,
          authTokenLength: process.env.TURSO_AUTH_TOKEN?.length || 0,
        }
      }, { status: 400 });
    }
    
    const testResult = await DatabaseTestService.testConnection();
    const stats = await DatabaseTestService.getDatabaseStats();
    const tursoFeatures = await DatabaseTestService.testTursoSpecificFeatures();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      testResult,
      stats,
      tursoFeatures,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasConnectionUrl,
        hasAuthToken,
        connectionUrlLength: process.env.TURSO_CONNECTION_URL?.length || 0,
        authTokenLength: process.env.TURSO_AUTH_TOKEN?.length || 0,
        databaseType: 'turso'
      }
    });

  } catch (error: any) {
    console.error('❌ Turso database test API failed:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasConnectionUrl: !!process.env.TURSO_CONNECTION_URL,
        hasAuthToken: !!process.env.TURSO_AUTH_TOKEN,
        databaseType: 'turso'
      },
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}