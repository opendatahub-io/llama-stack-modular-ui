/* eslint-disable @typescript-eslint/no-unused-vars */
import useFetchLlamaModels from '@app/utils/useFetchLlamaModels';
import { getId } from '@app/utils/utils';
import { CHAT_COMPLETION_URL } from '@app/services/llamaStackService';
import { authService } from '@app/services/authService';

// TypeScript interfaces for stream event processing
interface StreamEventDelta {
  text?: string;
}

interface StreamEvent {
  event_type: 'progress' | 'complete' | 'error';
  delta?: StreamEventDelta;
  message?: string;
  error?: string;
}

interface StreamEventWrapper {
  event?: StreamEvent;
}

// Type guards for runtime validation
const isValidStreamEventWrapper = (obj: unknown): obj is StreamEventWrapper => {
  return typeof obj === 'object' && obj !== null;
};

const isValidStreamEvent = (event: unknown): event is StreamEvent => {
  if (typeof event !== 'object' || event === null) {
    return false;
  }
  
  const e = event as Record<string, unknown>;
  return typeof e.event_type === 'string' && 
         ['progress', 'complete', 'error'].includes(e.event_type);
};

const isProgressEvent = (event: StreamEvent): event is StreamEvent & { event_type: 'progress' } => {
  return event.event_type === 'progress';
};

const isCompleteEvent = (event: StreamEvent): event is StreamEvent & { event_type: 'complete' } => {
  return event.event_type === 'complete';
};

const isErrorEvent = (event: StreamEvent): event is StreamEvent & { event_type: 'error' } => {
  return event.event_type === 'error';
};
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
  MessageProps
} from '@patternfly/chatbot';
import '@patternfly/chatbot/dist/css/main.css';
import { Alert, AlertGroup, AlertVariant, Button, Label, Select, SelectOption, Spinner, Title } from '@patternfly/react-core';
import { ShareSquareIcon } from '@patternfly/react-icons';
import * as React from 'react';
import botAvatar from '../bgimages/bot_avatar.svg';
import userAvatar from '../bgimages/user_avatar.svg';
import { ChatbotMessages } from './ChatbotMessagesList';
import { ChatbotShareModal } from './ChatbotShareModal';

const initialBotMessage: MessageProps = {
  id: getId(),
  role: 'bot',
  content: 'Hello! Ask a question to test out your AI system',
  name: 'Bot',
  avatar: botAvatar,
};

const ChatbotMain: React.FunctionComponent = () => {
  const displayMode = ChatbotDisplayMode.embedded;
  const typingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const [messages, setMessages] = React.useState<MessageProps[]>([initialBotMessage]);
  const [showPopover, setShowPopover] = React.useState(false);
  const [isShareChatbotOpen, setIsShareChatbotOpen] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null!);
  const { models, loading, error, isPermissionError, fetchLlamaModels } = useFetchLlamaModels();
  const [selectedModelId, setSelectedModelId] = React.useState<string | undefined>(undefined);
  const [isModelSelectOpen, setIsModelSelectOpen] = React.useState(false);
  
  // State for user feedback notifications
  const [alerts, setAlerts] = React.useState<Array<{ id: string; title: string; variant: AlertVariant }>>([]);

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

  React.useEffect(() => {
    fetchLlamaModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  React.useEffect(() => {
    if (models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0].identifier);
    }
  }, [models, selectedModelId]);

  React.useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);


  if (loading) {
    return <Spinner size="sm" />;
  }

  if (error && !isPermissionError) {
    return <Alert variant="warning" isInline title="Cannot fetch models">{error}</Alert>;
  }

  // Helper function to show user notifications
  const showAlert = (title: string, variant: AlertVariant = AlertVariant.warning) => {
    const id = `alert-${Date.now()}`;
    setAlerts(prev => [...prev, { id, title, variant }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 5000);
  };

  const handleMessageSend = async (userInput: string) => {
    // Validate user input
    if (!userInput || userInput.trim().length === 0) {
      showAlert('Please enter a message before sending.', AlertVariant.info);
      return;
    }

    // Validate model selection
    if (!selectedModelId) {
      showAlert('Please select a model before sending your message.', AlertVariant.warning);
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
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'bot',
        content: '',
        name: 'Bot',
        avatar: botAvatar,
      },
    ]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Get authentication token
      const token = authService.getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(CHAT_COMPLETION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: updatedMessages.map((msg) => {
            const isAssistant = msg.role === 'bot';
            return {
              role: isAssistant ? 'assistant' : 'user',
              content: msg.content ?? '',
              ...(isAssistant ? { stop_reason: 'end_of_message' } : {}),
            };
          }),
          model_id: selectedModelId,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';
      let assistantContent = '';
      let streamEnded = false;

      const typingQueue: string[] = [];
      const startTyping = () => {
        if (typingIntervalRef.current) return;

        typingIntervalRef.current = setInterval(() => {
          if (typingQueue.length > 0) {
            const nextChar = typingQueue.shift()!;
            assistantContent += nextChar;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: assistantContent + '▌' }
                  : msg
              )
            );
          } else {
            if (typingIntervalRef.current) {
              clearInterval(typingIntervalRef.current);
              typingIntervalRef.current = null;
            }
          }
        }, 10);
      };


      const processStreamEvent = (jsonStr: string): void => {
        try {
          // Parse JSON with type safety
          const parsed: unknown = JSON.parse(jsonStr);
          
          // Validate top-level structure
          if (!isValidStreamEventWrapper(parsed)) {
            console.warn('[ChatBot] Invalid stream event wrapper structure, skipping event');
            return;
          }
          
          // Check for event field
          if (!parsed.event) {
            console.warn('[ChatBot] Stream event missing event field, skipping');
            return;
          }
          
          // Validate event structure
          if (!isValidStreamEvent(parsed.event)) {
            console.warn('[ChatBot] Invalid stream event structure, skipping event');
            return;
          }
          
          const event: StreamEvent = parsed.event;
          
          // Process different event types with proper validation
          if (isProgressEvent(event)) {
            // Handle progress events
            if (event.delta?.text && typeof event.delta.text === 'string') {
              const deltaText = event.delta.text;
              if (deltaText.length > 0) {
                typingQueue.push(...deltaText.split(''));
                startTyping();
              }
            } else {
              // Progress event without text is valid but no-op
              console.debug('[ChatBot] Progress event received without text content');
            }
          } else if (isCompleteEvent(event)) {
            // Handle completion events
            streamEnded = true;
            console.debug('[ChatBot] Stream completion event received');
            
            const finalize = (): void => {
              if (typingQueue.length > 0) {
                // Wait for typing animation to complete
                setTimeout(finalize, 20);
              } else {
                // Remove typing indicator and finalize message
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              }
            };
            finalize();
          } else if (isErrorEvent(event)) {
            // Handle error events from stream
            const errorMessage = event.error || event.message || 'Unknown stream error';
            console.error('[ChatBot] Stream error event received:', errorMessage);
            
            // Display error to user
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { 
                      ...msg, 
                      content: `Error during response generation: ${errorMessage}` 
                    }
                  : msg
              )
            );
            streamEnded = true;
          } else {
            // Handle unknown event types gracefully
            console.warn(`[ChatBot] Unknown stream event type: ${event.event_type}, ignoring`);
          }
          
        } catch (error) {
          // Enhanced error handling for JSON parsing
          if (error instanceof SyntaxError) {
            console.warn('[ChatBot] Failed to parse stream event JSON:', error.message);
          } else if (error instanceof Error) {
            console.warn('[ChatBot] Error processing stream event:', error.message);
          } else {
            console.warn('[ChatBot] Unknown error processing stream event:', error);
          }
          
          // Don't break the stream for individual event parsing errors
          // The stream will continue processing other events
        }
      };

      try {
        while (!done && !streamEnded) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data:')) {
                const jsonStr = trimmed.replace(/^data:\s*/, '');
                if (jsonStr) {
                  processStreamEvent(jsonStr);
                }
              }
            }
          }
        }
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
      clearTimeout(timeoutId);
      setIsMessageSendButtonDisabled(false);
    }
  };

  const handleModelSelect = (event: React.MouseEvent | React.KeyboardEvent | undefined, value: string) => {
    setSelectedModelId(value);
    setIsModelSelectOpen(false);
  };

  return (
    <>
      {isShareChatbotOpen && <ChatbotShareModal onToggle={() => setIsShareChatbotOpen(!isShareChatbotOpen)} />}
      
      {/* Alert notifications for user feedback */}
      {alerts.length > 0 && (
        <AlertGroup 
          isToast 
          style={{ 
            position: 'fixed', 
            top: '20px', 
            right: '20px', 
            zIndex: 9999,
            maxWidth: '400px'
          }}
        >
                     {alerts.map(alert => (
             <Alert
               key={alert.id}
               variant={alert.variant}
               title={alert.title}
               isInline
             />
           ))}
        </AlertGroup>
      )}
      
      <Chatbot displayMode={displayMode} data-testid="chatbot">
        <ChatbotHeader>
          <ChatbotHeaderMain>
            <ChatbotHeaderTitle>
              <Title headingLevel="h1" size="xl" style={{ fontWeight: 'bold' }}>
                Chatbot
              </Title>
              {isPermissionError ? (
                <Label variant="outline" color="orange" style={{ marginLeft: 'var(--pf-t--global--spacer--sm)' }}>
                  Access Limited
                </Label>
              ) : (
                <Label variant="outline" color="blue" style={{ marginLeft: 'var(--pf-t--global--spacer--sm)' }}>
                  {selectedModelId}
                </Label>
              )}
              <Select
                variant="default"
                aria-label="Select Model"
                onOpenChange={isPermissionError ? () => {} : setIsModelSelectOpen}
                onSelect={isPermissionError ? () => {} : (event, value) => handleModelSelect(event, value as string)}
                selected={selectedModelId}
                isOpen={isPermissionError ? false : isModelSelectOpen}
                style={{ marginLeft: 16, minWidth: 200 }}
                toggle={{
                  toggleNode: (
                    <Button
                      variant="secondary"
                      aria-label="Select Model Toggle"
                      style={{ minWidth: 200 }}
                      isDisabled={isPermissionError}
                    >
                      {isPermissionError ? 'Models not accessible' : (selectedModelId || 'Select model')}
                    </Button>
                  )
                }}
              >
                {Array.isArray(models) && models.map((model) => (
                  <SelectOption key={model.identifier} value={model.identifier}>
                    {model.identifier}
                  </SelectOption>
                ))}
              </Select>
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
          <MessageBox position="bottom">
            {isPermissionError ? (
              <ChatbotWelcomePrompt 
                title="Hello, User!" 
                description="You are authenticated but currently don't have permission to access AI models. Please contact your administrator to request access to use the chatbot functionality." 
              />
            ) : (
              <ChatbotWelcomePrompt title="Hello, User!" description="Ask a question to chat with your model" />
            )}
            <ChatbotMessages messageList={messages} scrollRef={scrollToBottomRef} />
          </MessageBox>
        </ChatbotContent>
        <ChatbotFooter>
          <MessageBar
            onSendMessage={(message) => {
              if (typeof message === 'string' && !isPermissionError) {
                handleMessageSend(message);
              }
            }}
            hasAttachButton={false}
            isSendButtonDisabled={isMessageSendButtonDisabled || isPermissionError}
            data-testid="chatbot-message-bar"
          />
          <ChatbotFootnote {...footnoteProps} />
        </ChatbotFooter>
      </Chatbot>
    </>
  );
};

export { ChatbotMain };