"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Database, RefreshCw, Server } from 'lucide-react';

interface TestResult {
  timestamp: string;
  testResult: {
    success: boolean;
    error?: string;
    details?: any;
  };
  stats?: any;
  tursoFeatures?: any;
  environment?: any;
}

export function DatabaseTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/db/test');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Test failed');
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Test error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Turso Database Test
        </CardTitle>
        <CardDescription>
          Test your Turso database connection and verify schema operations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Button 
          onClick={runTest} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testing Turso Database...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Run Turso Database Test
            </>
          )}
        </Button>

        {error && (
          <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-semibold">Error:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Environment Info */}
            {result.environment && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Turso Environment
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Database Type:</span>
                      <Badge variant="outline" className="ml-2">
                        {result.environment.databaseType}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">NODE_ENV:</span>
                      <Badge variant="outline" className="ml-2">
                        {result.environment.nodeEnv}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Has Connection URL:</span>
                      <Badge 
                        variant={result.environment.hasConnectionUrl ? "default" : "destructive"} 
                        className="ml-2"
                      >
                        {result.environment.hasConnectionUrl ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Has Auth Token:</span>
                      <Badge 
                        variant={result.environment.hasAuthToken ? "default" : "destructive"} 
                        className="ml-2"
                      >
                        {result.environment.hasAuthToken ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Connection URL Length:</span>
                      <Badge variant="outline" className="ml-2">
                        {result.environment.connectionUrlLength} chars
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Auth Token Length:</span>
                      <Badge variant="outline" className="ml-2">
                        {result.environment.authTokenLength} chars
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Result */}
            <div className={`p-4 border rounded-lg ${
              result.testResult.success 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.testResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-semibold ${
                  result.testResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.testResult.success ? 'Turso Test Passed' : 'Turso Test Failed'}
                </span>
                <Badge variant={result.testResult.success ? "default" : "destructive"}>
                  {result.testResult.success ? 'TURSO OK' : 'TURSO FAILED'}
                </Badge>
              </div>
              
              {result.testResult.details && (
                <div className="mt-2">
                  <div className="text-sm font-medium mb-1">Details:</div>
                  <pre className="text-sm p-2 bg-white rounded border max-h-40 overflow-auto">
                    {JSON.stringify(result.testResult.details, null, 2)}
                  </pre>
                </div>
              )}
              
              {result.testResult.error && (
                <div className="mt-2 text-sm text-red-700">
                  <strong>Error:</strong> {result.testResult.error}
                </div>
              )}
            </div>

            {/* Turso Features Test */}
            {result.tursoFeatures && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Turso Features</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Batch Operations:</span>
                    <Badge variant={result.tursoFeatures.batchOperations ? "default" : "secondary"} className="ml-2">
                      {result.tursoFeatures.batchOperations ? 'Supported' : 'Not Supported'}
                    </Badge>
                  </div>
                  {result.tursoFeatures.message && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {result.tursoFeatures.message}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Database Stats */}
            {result.stats && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Database Statistics</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Users:</span>
                      <Badge variant="outline" className="ml-2">
                        {result.stats.users}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Wallets:</span>
                      <Badge variant="outline" className="ml-2">
                        {result.stats.userWallets}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Projects:</span>
                      <Badge variant="outline" className="ml-2">
                        {result.stats.projects}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Donations:</span>
                      <Badge variant="outline" className="ml-2">
                        {result.stats.donations}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timestamp */}
            <div className="text-xs text-gray-500 text-center">
              Test run at: {new Date(result.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}