import * as React from 'react';
import type { Model as LlamaModel } from 'llama-stack-client/resources/models';
import { listModels } from '../services/llamaStackService';

const useFetchLlamaModels = (): {
  models: LlamaModel[];
  loading: boolean;
  error: string | null;
  fetchLlamaModels: () => Promise<void>;
} => {
  const [models, setModels] = React.useState<LlamaModel[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchLlamaModels = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const modelList: LlamaModel[] = await listModels();

      setModels(modelList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  }, []);

  return { models, loading, error, fetchLlamaModels };
};

export default useFetchLlamaModels;
