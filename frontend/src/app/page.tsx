export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">API Reverse Engineering Tool</h1>
          <p className="text-muted-foreground mb-8">
            Upload a HAR file, describe an API, and get a functional curl command
          </p>
          
          {/* Component orchestration will go here */}
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6 bg-card">
              <p className="text-sm text-muted-foreground">
                Components will be wired here in the next step...
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
