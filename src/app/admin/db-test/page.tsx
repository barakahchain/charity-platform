import { DatabaseTest } from '@/components/DatabaseTest';

export default function DatabaseTestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Database Connection Test</h1>
          <p className="text-muted-foreground">
            Verify your database connection and schema operations
          </p>
        </div>
        
        <DatabaseTest />
        
        <div className="text-sm text-muted-foreground max-w-2xl mx-auto">
          <h3 className="font-semibold mb-2">What this test does:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Tests basic database connection</li>
            <li>Verifies all required tables exist</li>
            <li>Tests CRUD operations (Create, Read, Update, Delete)</li>
            <li>Tests database relationships</li>
            <li>Shows current database statistics</li>
            <li>Cleans up all test data after completion</li>
          </ul>
        </div>
      </div>
    </div>
  );
}