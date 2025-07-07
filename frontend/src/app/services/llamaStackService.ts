/* eslint-disable camelcase */
import type { Model as LlamaModel } from 'llama-stack-client/resources/models';
import axios from '../utils/axios';

// ============================================================================
// TYPES
// ============================================================================

// Roles must be 'user' and 'assistant' according to the Llama Stack API
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  stop_reason?: string;
};

// Agent types
export type Agent = {
  agent_id: string;
  agent_config: {
    name: string | null;
    instructions: string;
    model: string;
    toolgroups: Array<{
      name: string;
      args: {
        vector_db_ids: string[];
        top_k: number;
        similarity_threshold: number;
      };
    }>;
    sampling_params: {
      strategy: {
        type: string;
      };
      max_tokens: number;
      repetition_penalty: number;
      stop: string | null;
    };
    input_shields: string[];
    output_shields: string[];
    client_tools: string[];
    tool_choice: string | null;
    tool_prompt_format: string | null;
    tool_config: {
      tool_choice: string;
      tool_prompt_format: string | null;
      system_message_behavior: string;
    };
    max_infer_iters: number;
    enable_session_persistence: boolean;
    response_format: string | null;
  };
  created_at: string;
};

export type AgentSession = {
  session_id: string;
  session_name: string;
  started_at: string;
  turns: Turn[];
};

export type Turn = {
  turn_id: string;
  session_id: string;
  input_messages: ChatMessage[];
  output_message: ChatMessage;
  started_at: string;
  completed_at?: string;
};

// Stream event types for real-time processing
export interface AgentStreamPayload {
  event_type: string;
  delta?: {
    text?: string;
  };
  step_details?: {
    step_type: string;
    tool_responses?: Array<{
      tool_name: string;
      content?: Array<{
        type: string;
        text?: string;
      }>;
    }>;
  };
  turn?: {
    output_message?: {
      content: string;
    };
  };
}

export interface DirectLLMStreamEvent {
  event_type: string;
  delta?: {
    text?: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Standardized error handling for API responses
 */
const handleApiError = (error: any, defaultMessage: string): Error => {
  const errorMessage = error.response?.data?.message || error.message || defaultMessage;
  return new Error(errorMessage);
};

/**
 * Format messages for API requests
 */
const formatMessages = (messages: ChatMessage[], stopReason: string = 'end_of_message'): ChatMessage[] => {
  return messages.map((msg) => ({
    ...msg,
    ...(msg.role === 'assistant' && !msg.stop_reason ? { stop_reason: stopReason } : {}),
  }));
};

// ============================================================================
// MODELS API
// ============================================================================

/**
 * List all available models
 */
export const listModels = async (): Promise<LlamaModel[]> => {
  const url = '/api/llama-stack/v1/models';
  
  try {
    const response = await axios.get(url);
    return response.data.data;
  } catch (error: any) {
    throw handleApiError(error, 'Failed to fetch models');
  }
};

// ============================================================================
// INFERENCE API
// ============================================================================

/**
 * Complete chat with streaming support
 * Using fetch for streaming responses
 */
export const completeChatStreaming = async (messages: ChatMessage[], modelId: string): Promise<Response> => {
  const url = '/api/llama-stack/v1/inference/chat-completion';
  const formattedMessages = formatMessages(messages);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: formattedMessages,
      model_id: modelId,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to fetch streaming chat completion');
  }

  return response;
};

// ============================================================================
// AGENTS API
// ============================================================================

/**
 * List all available agents
 */
export const listAgents = async (): Promise<Agent[]> => {
  const url = '/api/llama-stack/v1/agents';
  
  try {
    const response = await axios.get(url);
    return response.data.data;
  } catch (error: any) {
    throw handleApiError(error, 'Failed to fetch agents');
  }
};

/**
 * Create a new session for an agent
 */
export const createSession = async (agentId: string, sessionName: string = 'Chat Session'): Promise<AgentSession> => {
  const url = `/api/llama-stack/v1/agents/${agentId}/session`;
  
  try {
    const response = await axios.post(url, {
      session_name: sessionName
    });
    return response.data;
  } catch (error: any) {
    throw handleApiError(error, 'Failed to create session');
  }
};

/**
 * Send a turn in an agent session (streaming)
 * Using fetch for streaming support
 */
export const sendTurnStreaming = async (
  agentId: string,
  sessionId: string,
  messages: ChatMessage[]
): Promise<Response> => {
  const url = `/api/llama-stack/v1/agents/${agentId}/session/${sessionId}/turn`;
  
  // Format messages for agent turn API - only send the latest user message
  // Agent sessions maintain context, so we only send the new input for this turn
  const userMessages = messages.filter(msg => msg.role === 'user');
  const latestUserMessage = userMessages[userMessages.length - 1];
  
  if (!latestUserMessage) {
    throw new Error('No user message found');
  }

  const turnMessages = [{
    role: 'user' as const,
    content: latestUserMessage.content
  }];

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: turnMessages,
      stream: true
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to send streaming turn');
  }

  return response;
};

/**
 * Retrieve a session by ID
 */
export const getSession = async (agentId: string, sessionId: string): Promise<AgentSession> => {
  const url = `/api/llama-stack/v1/agents/${agentId}/session/${sessionId}`;
  
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error: any) {
    throw handleApiError(error, 'Failed to retrieve session');
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a display name for an agent
 * If agent has a name, use that. Otherwise create a composite name from model + toolgroups
 */
export const getAgentDisplayName = (agent: Agent): string => {
  // If agent has a name, use it
  if (agent.agent_config.name) {
    return agent.agent_config.name;
  }
  
  // Create composite name from model + toolgroups
  const modelName = agent.agent_config.model;
  const toolgroups = agent.agent_config.toolgroups || [];
  
  let compositeName = modelName;
  
  if (toolgroups.length > 0) {
    const toolNames = toolgroups.map(tg => {
      const toolName = typeof tg === 'string' ? tg : tg.name;
      // Clean up tool names for display
      return toolName
        .replace('builtin::', '')
        .replace('/', ' ')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    });
    
    compositeName += ' + ' + toolNames.join(' + ');
  }
  
  return compositeName;
};
