/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DropEvent,
  Flex,
  FlexItem,
  Label,
  Select,
  SelectOption,
  Spinner,
  Title,
} from '@patternfly/react-core';
import {
  Chatbot,
  ChatbotContent,
  ChatbotDisplayMode,
  ChatbotFooter,
  ChatbotFootnote,
  ChatbotHeader,
  ChatbotHeaderActions,
  ChatbotHeaderMain,
  ChatbotHeaderTitle,
  ChatbotWelcomePrompt,
  MessageBar,
  MessageBox,
  MessageProps,
} from '@patternfly/chatbot';
import '@patternfly/chatbot/dist/css/main.css';
import useFetchLlamaModels from '@app/utils/useFetchLlamaModels';
import useFetchAgents from '@app/utils/useFetchAgents';
import { getId } from '@app/utils/utils';
import { ChatMessage, completeChatStreaming } from '@app/services/llamaStackService';
import { ChatbotSourceSettings, ChatbotSourceSettingsModal } from './sourceUpload/ChatbotSourceSettingsModal';
import { ChatbotSourceUploadPanel } from './sourceUpload/ChatbotSourceUploadPanel';
import { ShareSquareIcon } from '@patternfly/react-icons';
import userAvatar from '../bgimages/user_avatar.svg';
import botAvatar from '../bgimages/bot_avatar.svg';
import { ChatbotMessages } from './ChatbotMessagesList';
import { ChatbotShareModal } from './ChatbotShareModal';
import { 
  Agent, 
  AgentSession, 
  createSession,
  getAgentDisplayName,
  sendTurnStreaming
} from '../services/llamaStackService';

const getInitialBotMessage = (hasAgent: boolean, agentName?: string): MessageProps => ({
  id: getId(),
  role: 'bot',
  content: hasAgent 
    ? `Hello! I'm ${agentName || 'your AI agent'}. I have access to documents and can help answer questions based on my knowledge base. What would you like to know?`
    : 'Hello! Please select an agent to start chatting, or choose a model for direct chat.',
  name: hasAgent ? (agentName || 'Agent') : 'Bot',
  avatar: botAvatar,
});

const ChatbotMain: React.FunctionComponent = () => {
  const [alertKey, setAlertKey] = React.useState<number>(0);
  const displayMode = ChatbotDisplayMode.embedded;
  const typingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const [showPopover, setShowPopover] = React.useState(false);
  const [isShareChatbotOpen, setIsShareChatbotOpen] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  
  // Document upload state (from main branch)
  const [isSourceSettingsOpen, setIsSourceSettingsOpen] = React.useState(false);
  const [selectedSource, setSelectedSource] = React.useState<File[]>([]);
  const [selectedSourceSettings, setSelectedSourceSettings] = React.useState<ChatbotSourceSettings | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = React.useState(false);
  
  // Model-related state
  const { models, loading: modelsLoading, error: modelsError, fetchLlamaModels } = useFetchLlamaModels();
  const [selectedModelId, setSelectedModelId] = React.useState<string | undefined>(undefined);
  const [isModelSelectOpen, setIsModelSelectOpen] = React.useState(false);
  
  // Agent-related state (from feature branch)
  const { agents, loading: agentsLoading, error: agentsError, fetchAgents } = useFetchAgents();
  const [selectedAgent, setSelectedAgent] = React.useState<Agent | undefined>(undefined);
  const [currentSession, setCurrentSession] = React.useState<AgentSession | undefined>(undefined);
  const [isAgentSelectOpen, setIsAgentSelectOpen] = React.useState(false);
  const [sessionError, setSessionError] = React.useState<string | null>(null);
  
  // Chat mode: 'agent', 'direct', or 'document'
  const [chatMode, setChatMode] = React.useState<'agent' | 'direct' | 'document'>('agent');
  const [messages, setMessages] = React.useState<MessageProps[]>([getInitialBotMessage(false)]);

  const footnoteProps = {
    label: 'Always review AI generated content prior to use',
    popover: {
      title: 'Verify information',
      description:
        'While ChatBot strives for accuracy, AI is experimental and can make mistakes. We cannot guarantee that all information provided by ChatBot is up to date or without error. You should always verify responses using reliable sources, especially for crucial information and decision making.',
      bannerImage: {
        src: 'https://cdn.dribbble.com/userupload/10651749/file/original-8a07b8e39d9e8bf002358c66fce1223e.gif',
        alt: 'Image for footnote popover',
      },
      isVisible: showPopover,
      cta: {
        label: 'Dismiss',
        onClick: () => setShowPopover(!showPopover),
      },
      link: {
        label: 'View AI policy',
        url: 'https://www.redhat.com/',
      },
    },
  };

  const successAlert = showSuccessAlert ? (
    <Alert
      key={`source-upload-success-${alertKey}`}
      isInline
      variant="success"
      title="Source uploaded"
      timeout={4000}
      actionClose={<AlertActionCloseButton onClose={() => setShowSuccessAlert(false)} />}
      onTimeout={() => setShowSuccessAlert(false)}
    >
      <p>
        This source must be chunked and embedded before it is available for retrieval. This may take a few minutes
        depending on the size.
      </p>
    </Alert>
  ) : (
    <></>
  );

  React.useEffect(() => {
    fetchLlamaModels();
    fetchAgents();

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  React.useEffect(() => {
    if (models.length && !selectedModelId) {
      setSelectedModelId(models[0].identifier);
    }
  }, [models, selectedModelId]);

  React.useEffect(() => {
    if (selectedSource.length > 0) {
      setIsSourceSettingsOpen(true);
    }
  }, [selectedSource]);

  // Update welcome message when agent is selected
  React.useEffect(() => {
    if (selectedAgent && currentSession && chatMode === 'agent') {
      const agentName = getAgentDisplayName(selectedAgent);
      setMessages([getInitialBotMessage(true, agentName)]);
    } else if (!selectedAgent && chatMode === 'agent') {
      setMessages([getInitialBotMessage(false)]);
    }
  }, [selectedAgent, currentSession, chatMode]);

  // Handle agent selection and session creation
  const handleAgentSelect = async (agentId: string) => {
    const agent = agents.find(a => a.agent_id === agentId);
    if (!agent) {
      console.error('Agent not found:', agentId);
      return;
    }

    console.log('Selected agent:', agent);
    setSelectedAgent(agent);
    setSessionError(null);
    
    // Clear messages when switching to agent mode
    if (chatMode !== 'agent') {
      setMessages([getInitialBotMessage(true, getAgentDisplayName(agent))]);
    }
    
    try {
      console.log('Creating session for agent:', agentId);
      const session = await createSession(agentId, `Chat with ${getAgentDisplayName(agent)}`);
      console.log('Session created successfully:', session);
      setCurrentSession(session);
      setChatMode('agent');
    } catch (error: unknown) {
      console.error('Session creation failed:', error);
      setSessionError(error instanceof Error ? error.message : 'Unknown error occurred');
      setCurrentSession(undefined);
    }
  };

  // Document upload functions (from main branch)
  const handleSourceDrop = (event: DropEvent, source: File[]) => {
    setSelectedSource(source);
    setSelectedSourceSettings(null);
    setChatMode('document');
  };

  const removeUploadedSource = (sourceName: string) => {
    setSelectedSource((sources) => sources.filter((f) => f.name !== sourceName));
  };

  const showAlert = () => {
    setAlertKey((key) => key + 1);
    setShowSuccessAlert(true);
  };

  const handleSourceSettingsSubmit = (settings: ChatbotSourceSettings | null) => {
    setSelectedSourceSettings(settings);
    setIsSourceSettingsOpen(!isSourceSettingsOpen);

    if (settings?.chunkOverlap && settings?.maxChunkLength) {
      showAlert();
    } else {
      setSelectedSource([]);
    }
  };

  if (modelsLoading || agentsLoading) {
    return <Spinner size="sm" />;
  }

  if (modelsError && agentsError) {
    return (
      <Alert variant="warning" isInline title="Cannot fetch data">
        Models: {modelsError} | Agents: {agentsError}
      </Alert>
    );
  }

  const handleMessageSend = async (userInput: string) => {
    if (!userInput) {
      console.log('No user input provided');
      return;
    }

    // Check if we have the required setup for the selected chat mode
    if (chatMode === 'agent' && (!selectedAgent || !currentSession)) {
      console.log('Agent mode selected but no agent or session available');
      return;
    }

    if (chatMode === 'direct' && !selectedModelId) {
      console.log('Direct mode selected but no model available');
      return;
    }

    setIsMessageSendButtonDisabled(true);

    const userMessage: MessageProps = {
      id: getId(),
      role: 'user',
      content: userInput,
      name: 'User',
      avatar: userAvatar,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    const assistantMessageId = getId();
    const assistantName = chatMode === 'agent' && selectedAgent 
      ? getAgentDisplayName(selectedAgent)
      : 'Bot';
    
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'bot',
        content: '',
        name: assistantName,
        avatar: botAvatar,
      },
    ]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      let response: Response;

      if (chatMode === 'agent' && selectedAgent && currentSession) {
        // Agent-based chat using turns
        console.log('Agent mode - Agent ID:', selectedAgent.agent_id, 'Session ID:', currentSession.session_id);
        
        if (!selectedAgent.agent_id || !currentSession.session_id) {
          throw new Error('Missing agent ID or session ID for agent chat');
        }

        const chatMessages: ChatMessage[] = updatedMessages.map((msg) => ({
          role: msg.role === 'bot' ? 'assistant' : 'user',
          content: msg.content ?? '',
          ...(msg.role === 'bot' ? { stop_reason: 'end_of_message' } : {}),
        }));

        console.log('Sending turn with messages:', chatMessages);

        response = await sendTurnStreaming(
          selectedAgent.agent_id,
          currentSession.session_id,
          chatMessages
        );
        console.log('Agent turn response received:', response.status, response.statusText);
      } else {
        // Direct chat completion using service
        const chatMessages: ChatMessage[] = updatedMessages.map((msg) => ({
          role: msg.role === 'bot' ? 'assistant' : 'user',
          content: msg.content ?? '',
          ...(msg.role === 'bot' ? { stop_reason: 'end_of_message' } : {}),
        }));

        console.log('Sending direct chat completion with messages:', chatMessages);
        response = await completeChatStreaming(chatMessages, selectedModelId!);
        console.log('Direct chat completion response received:', response.status, response.statusText);
      }

      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';
      let assistantContent = '';
      let streamEnded = false;
      let documentReferences: string[] = [];

      const typingQueue: string[] = [];
      const startTyping = () => {
        if (typingIntervalRef.current) return;

        typingIntervalRef.current = setInterval(() => {
          if (typingQueue.length > 0) {
            const nextChar = typingQueue.shift()!;
            assistantContent += nextChar;
            setMessages((prev) =>
              prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: assistantContent + '▌' } : msg)),
            );
          } else {
            if (typingIntervalRef.current) {
              clearInterval(typingIntervalRef.current);
              typingIntervalRef.current = null;
            }
          }
        }, 10);
      };

      const processStreamEvent = (jsonStr: string) => {
        console.log('Received stream event:', jsonStr);
        try {
          const parsed = JSON.parse(jsonStr);
          console.log('Parsed stream event:', parsed);
          if (!parsed || typeof parsed !== 'object') {
            console.warn('Invalid stream event format:', jsonStr);
            return;
          }

          // Handle agent streaming format (with event.payload structure)
          if (parsed.event?.payload) {
            const payload = parsed.event.payload;
            console.log('Processing agent event type:', payload.event_type);
            
            if (payload.event_type === 'step_progress' && payload.delta?.text) {
              const deltaText = payload.delta.text || '';
              console.log('Adding agent delta text:', deltaText);
              typingQueue.push(...deltaText.split(''));
              startTyping();
            } else if (payload.event_type === 'step_complete') {
              console.log('Agent step complete event received:', payload.event_type);
              
              // Capture document references from tool execution steps
              if (payload.step_details?.step_type === 'tool_execution' && payload.step_details?.tool_responses) {
                const toolResponses = payload.step_details.tool_responses;
                for (const response of toolResponses) {
                  if (response.tool_name === 'knowledge_search' && response.content) {
                    // Extract file names from the content
                    const fileNames = new Set<string>();
                    for (const contentItem of response.content) {
                      if (contentItem.type === 'text' && contentItem.text) {
                        const text = contentItem.text;
                        // Look for file names in metadata patterns
                        const fileNameMatches = text.match(/file_name['"]:\s*['"]([^'"]+)['"]/g);
                        if (fileNameMatches) {
                          for (const match of fileNameMatches) {
                            const fileName = match.replace(/file_name['"]:\s*['"]([^'"]+)['"]/, '$1');
                            if (fileName && fileName !== 'file_name') {
                              fileNames.add(fileName);
                            }
                          }
                        }
                      }
                    }
                    documentReferences = Array.from(fileNames);
                    console.log('Captured document references:', documentReferences);
                  }
                }
              }
            } else if (payload.event_type === 'turn_complete') {
              console.log('Agent turn complete event received:', payload.event_type);
              
              // Only use turn_complete content as fallback if we have no streamed content
              if (payload.turn?.output_message?.content && assistantContent.trim() === '') {
                let finalContent = payload.turn.output_message.content;
                console.log('Using turn_complete fallback content:', finalContent);
                
                // Add document references if any were found
                if (documentReferences.length > 0) {
                  finalContent += '\n\n**Sources:**\n';
                  documentReferences.forEach((ref, index) => {
                    finalContent += `${index + 1}. ${ref}\n`;
                  });
                }
                
                assistantContent = finalContent;
                
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: assistantContent } : msg)),
                );
              }
              
              streamEnded = true;
              const finalize = () => {
                if (typingQueue.length > 0) {
                  setTimeout(finalize, 20);
                } else {
                  // Add document references if any were found
                  let finalContent = assistantContent;
                  if (documentReferences.length > 0) {
                    finalContent += '\n\n**Sources:**\n';
                    documentReferences.forEach((ref, index) => {
                      finalContent += `${index + 1}. ${ref}\n`;
                    });
                  }
                  
                  // Ensure final content is set
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: finalContent }
                        : msg
                    )
                  );
                }
              };
              finalize();
            } else {
              console.log('Unhandled agent event type:', payload.event_type, payload);
            }
          }
          // Handle direct LLM streaming format (simpler event structure)
          else if (parsed.event) {
            const event = parsed.event;
            console.log('Processing direct LLM event type:', event.event_type);
            
            if (event.event_type === 'progress' && event.delta?.text) {
              const deltaText = event.delta.text || '';
              console.log('Adding direct LLM delta text:', deltaText);
              typingQueue.push(...deltaText.split(''));
              startTyping();
            } else if (event.event_type === 'complete') {
              console.log('Direct LLM stream complete event received');
              streamEnded = true;
              const finalize = () => {
                if (typingQueue.length > 0) {
                  setTimeout(finalize, 20);
                } else {
                  // Add document references if any were found (though unlikely for direct LLM)
                  let finalContent = assistantContent;
                  if (documentReferences.length > 0) {
                    finalContent += '\n\n**Sources:**\n';
                    documentReferences.forEach((ref, index) => {
                      finalContent += `${index + 1}. ${ref}\n`;
                    });
                  }
                  
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: finalContent }
                        : msg
                    )
                  );
                }
              };
              finalize();
            } else {
              console.log('Unhandled direct LLM event type:', event.event_type, event);
            }
          } else {
            console.warn('Unknown stream event format:', parsed);
          }
        } catch (e) {
          console.warn('Failed to parse stream event:', jsonStr, e);
        }
      };

      try {
        console.log('Starting to read stream...');
        while (!done && !streamEnded) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            console.log('Received chunk:', chunk);
            buffer += chunk;
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              console.log('Processing line:', trimmed);
              if (trimmed.startsWith('data:')) {
                const jsonStr = trimmed.replace(/^data:\s*/, '');
                if (jsonStr) {
                  processStreamEvent(jsonStr);
                }
              } else if (trimmed) {
                console.log('Non-data line:', trimmed);
              }
            }
          }
        }
        console.log('Stream reading completed. Done:', done, 'StreamEnded:', streamEnded);
      } finally {
        reader.releaseLock();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: getId(),
          role: 'bot',
          content: `An error occurred while generating a response: ${err}`,
          name: 'Bot',
          avatar: botAvatar,
        },
      ]);
    } finally {
      setIsMessageSendButtonDisabled(false);
    }
  };

  const handleModelSelect = (event: React.MouseEvent | React.KeyboardEvent | undefined, value: string) => {
    setSelectedModelId(value);
    setIsModelSelectOpen(false);
    
    // Clear messages when switching to direct mode
    if (chatMode !== 'direct') {
      setMessages([getInitialBotMessage(false)]);
    }
    
    setChatMode('direct');
  };

  const handleAgentSelectDropdown = (event: React.MouseEvent | React.KeyboardEvent | undefined, value: string) => {
    setIsAgentSelectOpen(false);
    handleAgentSelect(value);
  };

  return (
    <>
      {isShareChatbotOpen && <ChatbotShareModal onToggle={() => setIsShareChatbotOpen(!isShareChatbotOpen)} />}
      {isSourceSettingsOpen && (
        <ChatbotSourceSettingsModal
          onToggle={() => setIsSourceSettingsOpen(!isSourceSettingsOpen)}
          onSubmitSettings={handleSourceSettingsSubmit}
        />
      )}
      <Drawer isExpanded={true} isInline={true} position="right">
        <DrawerContent
          panelContent={
            <ChatbotSourceUploadPanel
              alert={successAlert}
              handleSourceDrop={handleSourceDrop}
              selectedSource={selectedSource}
              selectedSourceSettings={selectedSourceSettings}
              removeUploadedSource={removeUploadedSource}
              setSelectedSourceSettings={setSelectedSourceSettings}
            />
          }
        >
          <DrawerContentBody style={{ overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Chatbot displayMode={displayMode} data-testid="chatbot">
              <ChatbotHeader>
                <ChatbotHeaderMain>
                  <ChatbotHeaderTitle>
                    <Flex direction={{ default: 'row' }} alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                      <FlexItem>
                        <Title headingLevel="h1" size="xl" style={{ fontWeight: 'bold' }}>
                          Chatbot
                        </Title>
                      </FlexItem>
                      
                      <FlexItem>
                        <Label variant="outline" color={chatMode === 'agent' ? 'green' : chatMode === 'document' ? 'orange' : 'blue'}>
                          {chatMode === 'agent' ? 'Agent Mode' : chatMode === 'document' ? 'Document Mode' : 'Direct Mode'}
                        </Label>
                      </FlexItem>

                      {chatMode === 'agent' && (
                        <FlexItem>
                          <Select
                            onOpenChange={setIsAgentSelectOpen}
                            onSelect={(event, value) => handleAgentSelectDropdown(event, value as string)}
                            selected={selectedAgent?.agent_id}
                            isOpen={isAgentSelectOpen}
                            toggle={(toggleRef) => (
                              <Button
                                ref={toggleRef}
                                variant="secondary"
                                style={{ minWidth: 250 }}
                                onClick={() => setIsAgentSelectOpen(!isAgentSelectOpen)}
                              >
                                {selectedAgent ? getAgentDisplayName(selectedAgent) : 'Select agent'}
                              </Button>
                            )}
                          >
                            {Array.isArray(agents) && agents.map((agent) => (
                              <SelectOption key={agent.agent_id} value={agent.agent_id}>
                                {getAgentDisplayName(agent)}
                              </SelectOption>
                            ))}
                          </Select>
                        </FlexItem>
                      )}

                      {chatMode === 'direct' && (
                        <FlexItem>
                          <Select
                            onOpenChange={setIsModelSelectOpen}
                            onSelect={(event, value) => handleModelSelect(event, value as string)}
                            selected={selectedModelId}
                            isOpen={isModelSelectOpen}
                            toggle={(toggleRef) => (
                              <Button
                                ref={toggleRef}
                                variant="secondary"
                                style={{ minWidth: 200 }}
                                onClick={() => setIsModelSelectOpen(!isModelSelectOpen)}
                              >
                                {selectedModelId || 'Select model'}
                              </Button>
                            )}
                          >
                            {Array.isArray(models) && models.map((model) => (
                              <SelectOption key={model.identifier} value={model.identifier}>
                                {model.identifier}
                              </SelectOption>
                            ))}
                          </Select>
                        </FlexItem>
                      )}

                      <FlexItem>
                        <Button
                          variant={chatMode === 'agent' ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => {
                            if (chatMode !== 'agent') {
                              setMessages([getInitialBotMessage(true)]);
                              setChatMode('agent');
                            }
                          }}
                          isDisabled={agents.length === 0}
                        >
                          Agents ({agents.length})
                        </Button>
                      </FlexItem>

                      <FlexItem>
                        <Button
                          variant={chatMode === 'direct' ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => {
                            if (chatMode !== 'direct') {
                              setMessages([getInitialBotMessage(false)]);
                              setChatMode('direct');
                            }
                          }}
                          isDisabled={models.length === 0}
                        >
                          Direct Chat
                        </Button>
                      </FlexItem>
                    </Flex>
                  </ChatbotHeaderTitle>
                </ChatbotHeaderMain>
                <ChatbotHeaderActions>
                  <Button
                    icon={<ShareSquareIcon />}
                    variant="plain"
                    aria-label="Share chatbot"
                    data-testid="share-chatbot-button"
                    onClick={() => {
                      setIsShareChatbotOpen(!isShareChatbotOpen);
                    }}
                  />
                </ChatbotHeaderActions>
              </ChatbotHeader>
              <ChatbotContent>
                {sessionError && (
                  <Alert variant="danger" isInline title="Session Error" style={{ margin: '16px' }}>
                    {sessionError}
                  </Alert>
                )}
                
                {agentsError && chatMode === 'agent' && (
                  <Alert variant="warning" isInline title="Cannot load agents" style={{ margin: '16px' }}>
                    {agentsError}
                  </Alert>
                )}
                
                {modelsError && chatMode === 'direct' && (
                  <Alert variant="warning" isInline title="Cannot load models" style={{ margin: '16px' }}>
                    {modelsError}
                  </Alert>
                )}

                <MessageBox position="bottom">
                  <ChatbotWelcomePrompt 
                    title={
                      chatMode === 'agent' 
                        ? (selectedAgent ? `Chat with ${getAgentDisplayName(selectedAgent)}` : 'Select an Agent')
                        : chatMode === 'document'
                        ? 'Document Chat Mode'
                        : 'Direct Chat Mode'
                    } 
                    description={
                      chatMode === 'agent' 
                        ? (selectedAgent && currentSession 
                            ? `Connected to ${getAgentDisplayName(selectedAgent)} with session ${currentSession.session_id}. This agent has access to documents and can provide enhanced responses.`
                            : 'Choose an agent from the dropdown above to start a conversation with enhanced capabilities.')
                        : chatMode === 'document'
                        ? (selectedSource.length > 0
                            ? `Documents uploaded: ${selectedSource.map(f => f.name).join(', ')}. The chat will use these documents for context.`
                            : 'Upload documents using the panel on the right to enable document-based chat.')
                        : (selectedModelId 
                            ? `Chatting directly with ${selectedModelId}. This mode provides basic chat without document retrieval.`
                            : 'Select a model from the dropdown above to start a direct conversation.')
                    }
                  />
                  <ChatbotMessages messageList={messages} scrollRef={scrollToBottomRef} />
                </MessageBox>
              </ChatbotContent>
              <ChatbotFooter>
                <MessageBar
                  onSendMessage={(message) => {
                    if (typeof message === 'string') {
                      handleMessageSend(message);
                    }
                  }}
                  hasAttachButton={false}
                  isSendButtonDisabled={
                    isMessageSendButtonDisabled || 
                    (chatMode === 'agent' && (!selectedAgent || !currentSession)) ||
                    (chatMode === 'direct' && !selectedModelId)
                  }
                  placeholder={
                    chatMode === 'agent' 
                      ? (selectedAgent && currentSession 
                          ? `Ask ${getAgentDisplayName(selectedAgent)} a question...`
                          : 'Select an agent to start chatting...')
                      : chatMode === 'document'
                      ? (selectedSource.length > 0
                          ? 'Ask questions about your uploaded documents...'
                          : 'Upload documents to start chatting...')
                      : (selectedModelId 
                          ? 'Type your message...'
                          : 'Select a model to start chatting...')
                  }
                  data-testid="chatbot-message-bar"
                />
                <ChatbotFootnote {...footnoteProps} />
              </ChatbotFooter>
            </Chatbot>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export { ChatbotMain };
