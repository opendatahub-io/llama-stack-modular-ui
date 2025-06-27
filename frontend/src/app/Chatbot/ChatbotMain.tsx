/* eslint-disable @typescript-eslint/no-unused-vars */
import useFetchLlamaModels from '@app/utils/useFetchLlamaModels';
import { generateId, getId } from '@app/utils/utils';
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
import { Alert, Button, Label, Select, SelectOption, Spinner, Title } from '@patternfly/react-core';
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
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const { models, loading, error, fetchLlamaModels } = useFetchLlamaModels();
  const [selectedModelId, setSelectedModelId] = React.useState<string | undefined>(undefined);
  const [isModelSelectOpen, setIsModelSelectOpen] = React.useState(false);

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

  if (error) {
    return <Alert variant="warning" isInline title="Cannot fetch models">{error}</Alert>;
  }

  const handleMessageSend = async (userInput: string) => {
    if (!userInput || !selectedModelId) {
      console.log('No user input or model ID ', userInput, selectedModelId);
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

    const assistantMessageId = generateId();
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
      const response = await fetch('/api/llama-stack/v1/inference/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      clearTimeout(timeoutId);
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


      const processStreamEvent = (jsonStr: string) => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (!parsed || typeof parsed !== 'object') {
            console.warn('Invalid stream event format:', jsonStr);
            return;
          }
          const event = parsed.event;
          if (!event) {
            console.warn('Received event without event field:', parsed);
            return;
          }
          if (event?.event_type === 'progress' && event.delta?.text) {
            const deltaText = event.delta?.text || '';
            typingQueue.push(...deltaText.split(''));
            startTyping();
          } else if (event?.event_type === 'complete') {
            streamEnded = true;
            const finalize = () => {
              if (typingQueue.length > 0) {
                setTimeout(finalize, 20);
              } else {
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
          }
        } catch (e) {
          console.warn('Failed to parse stream event:', jsonStr, e);
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
      <Chatbot displayMode={displayMode} data-testid="chatbot">
        <ChatbotHeader>
          <ChatbotHeaderMain>
            <ChatbotHeaderTitle>
              <Title headingLevel="h1" size="xl" style={{ fontWeight: 'bold' }}>
                Chatbot
              </Title>
              <Label variant="outline" color="blue" style={{ marginLeft: 'var(--pf-t--global--spacer--sm)' }}>
                {selectedModelId}
              </Label>
              <Select
                variant="default"
                aria-label="Select Model"
                onOpenChange={setIsModelSelectOpen}
                onSelect={(event, value) => handleModelSelect(event, value as string)}
                selected={selectedModelId}
                isOpen={isModelSelectOpen}
                style={{ marginLeft: 16, minWidth: 200 }}
                toggle={{
                  toggleNode: (
                    <Button
                      variant="secondary"
                      aria-label="Select Model Toggle"
                      style={{ minWidth: 200 }}
                    >
                      {selectedModelId || 'Select model'}
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
            <ChatbotWelcomePrompt title="Hello, User!" description="Ask a question to chat with your model" />
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
            isSendButtonDisabled={isMessageSendButtonDisabled}
            data-testid="chatbot-message-bar"
          />
          <ChatbotFootnote {...footnoteProps} />
        </ChatbotFooter>
      </Chatbot>
    </>
  );
};

export { ChatbotMain };
