/* eslint-disable camelcase */
import type { Model as LlamaModel } from 'llama-stack-client/resources/models';
import axios from '../utils/axios';

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

export type TurnRequest = {
  messages: ChatMessage[];
  stream?: boolean;
};

export type TurnResponse = Turn;

export const listModels = (): Promise<LlamaModel[]> => {
  const url = '/api/llama-stack/v1/models';
  return axios
    .get(url)
    .then((response) => response.data.data)
    .catch((e) => {
      const errorMessage = e.response?.data?.message || e.message || 'Failed to fetch models';
      throw new Error(errorMessage);
    });
};

export const completeChat = (messages: ChatMessage[], model_id: string): Promise<string> => {
  const url = '/api/llama-stack/v1/inference/chat-completion';

  const formattedMessages = messages.map((msg) => {
    if (msg.role === 'assistant' && !msg.stop_reason) {
      return { ...msg, stop_reason: 'stop' };
    }
    return msg;
  });

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: formattedMessages, model_id }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((msg) => {
          throw new Error(msg || 'Failed to fetch chat completion');
        });
      }
      return response.text();
    })
    .catch((error) => {
      throw new Error(error.message || 'Chat completion error');
    });
};

// Agent API functions using SDK and axios where needed

/**
 * List all available agents
 * NOTE: Using axios since SDK doesn't expose agents.list()
 */
export const listAgents = (): Promise<Agent[]> => {
  const url = '/api/llama-stack/v1/agents';
  return axios
    .get(url)
    .then((response) => response.data.data)
    .catch((e) => {
      const errorMessage = e.response?.data?.message || e.message || 'Failed to fetch agents';
      throw new Error(errorMessage);
    });
};

/**
 * Create a new session for an agent
 * Using HTTP API with better error handling
 */
export const createSession = async (agentId: string, sessionName: string = 'Chat Session'): Promise<AgentSession> => {
  const url = `/api/llama-stack/v1/agents/${agentId}/session`;
  
  try {
    const response = await axios.post(url, {
      session_name: sessionName
    });
    
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create session';
    throw new Error(errorMessage);
  }
};

/**
 * Send a turn in an agent session (non-streaming)
 * Using HTTP API with proper agent turn message format
 */
export const sendTurn = async (
  agentId: string,
  sessionId: string,
  messages: ChatMessage[]
): Promise<Turn> => {
  const url = `/api/llama-stack/v1/agents/${agentId}/session/${sessionId}/turn`;
  
  try {
    // Format messages for agent turn API - only send the latest user message
    // Agent sessions maintain context, so we only send the new input for this turn
    const userMessages = messages.filter(msg => msg.role === 'user');
    const latestUserMessage = userMessages[userMessages.length - 1];
    
    if (!latestUserMessage) {
      throw new Error('No user message found');
    }

    const turnMessages = [{
      role: 'user',
      content: latestUserMessage.content
    }];

    const response = await axios.post(url, {
      messages: turnMessages,
      stream: false
    });
    
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to send turn';
    throw new Error(errorMessage);
  }
};

/**
 * Send a turn in an agent session (streaming)
 * Using fetch for streaming support with proper agent turn message format
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
    role: 'user',
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
 * Using HTTP API with better error handling
 */
export const getSession = async (agentId: string, sessionId: string): Promise<AgentSession> => {
  const url = `/api/llama-stack/v1/agents/${agentId}/session/${sessionId}`;
  
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to retrieve session';
    throw new Error(errorMessage);
  }
};
