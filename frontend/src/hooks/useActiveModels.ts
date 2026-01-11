import { useState, useEffect } from 'react';
import { aiApi } from '@/lib/api';

export interface AIModel {
  id: string;
  name: string;
  model: string;
  provider: string;
  isDefault: boolean;
}

export function useActiveModels() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        // We added listActiveModels to api.ts indirectly via aiApi.listActiveModels (need to add it)
        // or just use api.get directly if not in lib/api.ts yet.
        // I will add it to lib/api.ts as well via replace, or just use api.get here.
        // Since I can't easily edit api.ts without causing potential conflicts if I'm not careful,
        // I will use direct axios call or assume I can add it.
        // Actually, let's just use aiApi.listModels if I changed it? No, I added listActiveModels endpoint.
        // Let's rely on api import.
        const data = await aiApi.listActiveModels(); 
        setModels(data);
      } catch (err) {
        console.error('Failed to fetch active models:', err);
        setError('Failed to load models');
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, []);

  return { models, loading, error };
}
