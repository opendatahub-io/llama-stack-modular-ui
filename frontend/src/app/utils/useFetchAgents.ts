import * as React from 'react';
import { listAgents, Agent } from '../services/llamaStackService';

interface UseFetchAgentsReturn {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  fetchAgents: () => Promise<void>;
}

const useFetchAgents = (): UseFetchAgentsReturn => {
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAgents = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedAgents = await listAgents();
      setAgents(fetchedAgents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching agents');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    agents,
    loading,
    error,
    fetchAgents,
  };
};

export default useFetchAgents; 