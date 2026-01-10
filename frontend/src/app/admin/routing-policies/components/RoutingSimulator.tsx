'use client';

import { useState, useMemo } from 'react';
import { Play, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Mock data for simulation
const MOCK_SERVERS = [
  { id: '1', name: 'OpenAI GPT-4', provider: 'openai', cost: 0.9, speed: 0.4, availability: 1.0 },
  { id: '2', name: 'Claude 3 Opus', provider: 'anthropic', cost: 0.95, speed: 0.3, availability: 1.0 },
  { id: '3', name: 'Llama 3 70B', provider: 'ollama', cost: 0.1, speed: 0.8, availability: 0.9 },
  { id: '4', name: 'Mistral Large', provider: 'vllm', cost: 0.2, speed: 0.9, availability: 0.95 },
  { id: '5', name: 'DeepSeek Coder', provider: 'ollama', cost: 0.05, speed: 0.95, availability: 0.8 },
];

interface RoutingSimulatorProps {
  initialWeights?: {
    costWeight: number;
    performanceWeight: number;
    availabilityWeight: number;
  };
  modelPreferences?: Record<string, string[]>;
}

export function RoutingSimulator({ initialWeights, modelPreferences }: RoutingSimulatorProps) {
  const [prompt, setPrompt] = useState('Create a React component for a user dashboard');
  const [promptType, setPromptType] = useState('code');
  const [weights, setWeights] = useState(initialWeights || {
    costWeight: 0.3,
    performanceWeight: 0.4,
    availabilityWeight: 0.3,
  });

  // Simulation Logic (Client-side mirror of backend logic)
  const simulationResults = useMemo(() => {
    return MOCK_SERVERS.map(server => {
      // 1. Calculate base scores (normalized 0-1)
      const costScore = 1 - server.cost; // Lower cost is better
      const perfScore = server.speed;   // Higher speed is better (simplified)
      const availScore = server.availability;

      // 2. Check preference bonus
      const preferredModels = modelPreferences?.[promptType] || [];
      const isPreferred = preferredModels.length === 0 || 
                         preferredModels.some(pm => server.name.toLowerCase().includes(pm.toLowerCase()));

      // 3. Calculate weighted total
      let totalScore = 
        (costScore * weights.costWeight) +
        (perfScore * weights.performanceWeight) +
        (availScore * weights.availabilityWeight);

      // Apply penalty if not preferred (simulating "filtering" or heavy penalty)
      if (!isPreferred && preferredModels.length > 0) {
        totalScore *= 0.1; // Heavy penalty
      }

      return {
        ...server,
        scores: {
          cost: costScore,
          perf: perfScore,
          avail: availScore,
          total: totalScore,
        },
        isPreferred
      };
    }).sort((a, b) => b.scores.total - a.scores.total);
  }, [weights, promptType, modelPreferences]);

  const winner = simulationResults[0];

  return (
    <div className="flex flex-col h-full border rounded-lg bg-card overflow-hidden">
      <div className="p-4 border-b bg-muted/40 flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Routing Simulator
        </h3>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
          Client-side Simulation
        </span>
      </div>

      <div className="flex flex-1 min-h-[500px]">
        {/* Left: Controls */}
        <div className="w-1/3 p-6 border-r space-y-6 bg-background">
          <div className="space-y-2">
             <label className="text-sm font-medium">Test Prompt</label>
             <textarea 
               className="w-full text-sm p-3 rounded border bg-muted h-24 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
               value={prompt}
               onChange={e => setPrompt(e.target.value)}
             />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Task Type</label>
            <select 
              className="w-full text-sm p-2 rounded border"
              value={promptType}
              onChange={e => setPromptType(e.target.value)}
            >
              <option value="code">Code Generation</option>
              <option value="refactor">Refactoring</option>
              <option value="explain">Explanation</option>
              <option value="review">Code Review</option>
              <option value="fix">Bug Fix</option>
              <option value="test">Test Generation</option>
            </select>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Adjust Weights to Test</h4>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3"/> Cost</span>
                <span>{(weights.costWeight * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={weights.costWeight * 100}
                onChange={e => setWeights({...weights, costWeight: parseInt(e.target.value) / 100})}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3"/> Performance</span>
                <span>{(weights.performanceWeight * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={weights.performanceWeight * 100}
                onChange={e => setWeights({...weights, performanceWeight: parseInt(e.target.value) / 100})}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1">
               <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1"><Activity className="h-3 w-3"/> Availability</span>
                <span>{(weights.availabilityWeight * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={weights.availabilityWeight * 100}
                onChange={e => setWeights({...weights, availabilityWeight: parseInt(e.target.value) / 100})}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="w-2/3 p-6 bg-muted/10 space-y-6 overflow-y-auto">
          {/* Winner Card */}
          <Card className="p-4 border-primary/50 bg-primary/5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-primary mb-1">SELECTED MODEL</p>
                <h2 className="text-2xl font-bold">{winner.name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span className="capitalize badge bg-background border px-2 rounded">{winner.provider}</span>
                  <span>Score: {winner.scores.total.toFixed(3)}</span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-primary opacity-50" />
            </div>
          </Card>

          {/* Detailed Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Score Breakdown</h4>
            {simulationResults.map((result, idx) => (
              <div key={result.id} className={`p-3 rounded-lg border bg-card flex items-center justify-between group ${idx === 0 ? 'ring-1 ring-primary' : 'opacity-80'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.name}</span>
                    <span className="text-xs text-muted-foreground">({result.provider})</span>
                    {!result.isPreferred && modelPreferences?.[promptType]?.length > 0 && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded">Not Preferred</span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex flex-col">
                      <span title="Normalized Score">Cost: {result.scores.cost.toFixed(2)}</span>
                      <span className="text-[10px] opacity-70">Weight: {weights.costWeight}</span>
                    </div>
                    <div className="flex flex-col">
                      <span title="Normalized Score">Perf: {result.scores.perf.toFixed(2)}</span>
                       <span className="text-[10px] opacity-70">Weight: {weights.performanceWeight}</span>
                    </div>
                     <div className="flex flex-col">
                      <span title="Normalized Score">Avail: {result.scores.avail.toFixed(2)}</span>
                       <span className="text-[10px] opacity-70">Weight: {weights.availabilityWeight}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                   <div className="text-lg font-bold tabular-nums">{result.scores.total.toFixed(3)}</div>
                   <div className="text-xs text-muted-foreground">Total Score</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
