import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Code2, Sparkles, Workflow, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">JaCode</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            AI-Powered
            <span className="text-primary"> Coding Assistant</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10">
            Experience the future of software development with intelligent agents
            that understand, plan, and generate code for you.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                <Sparkles className="h-5 w-5" />
                Start Coding
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline">
                Watch Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="p-6 rounded-lg border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Code2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Monaco Editor</h3>
            <p className="text-muted-foreground">
              VS Code-level editing experience with syntax highlighting, 
              IntelliSense, and multi-file support.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Agents</h3>
            <p className="text-muted-foreground">
              Autonomous agents that plan, generate, and modify code 
              based on natural language instructions.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Safe & Controlled</h3>
            <p className="text-muted-foreground">
              Review all changes with diff view before applying. 
              Full version history and rollback support.
            </p>
          </div>
        </div>

        {/* Workflow preview */}
        <div className="mt-24 p-8 rounded-2xl border bg-card/50">
          <div className="flex items-center gap-3 mb-6">
            <Workflow className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Describe', desc: 'Tell the agent what you need in natural language' },
              { step: '2', title: 'Plan', desc: 'Agent creates an implementation plan for your review' },
              { step: '3', title: 'Generate', desc: 'Code is generated with explanations and diff view' },
              { step: '4', title: 'Apply', desc: 'Review and approve changes to apply them' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 font-bold">
                  {item.step}
                </div>
                <h4 className="font-semibold mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            <span>JaCode © 2024</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="hover:text-foreground">Documentation</Link>
            <Link href="/github" className="hover:text-foreground">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
