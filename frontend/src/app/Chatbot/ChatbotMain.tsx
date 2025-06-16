/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react';
import { Alert, Button, Label, Spinner, Title } from '@patternfly/react-core';
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
import useFetchLlamaModels from '@app/utils/useFetchLlamaModels';
import { ShareSquareIcon } from '@patternfly/react-icons';
import { ChatbotShareModal } from './ChatbotShareModal';
import { ChatbotMessages } from './ChatbotMessagesList';
import { ChatMessage, completeChat } from '@app/services/llamaStackService';
import { generateId } from '@app/utils/utils';
import userAvatar from '../bgimages/user_avatar.svg';
import botAvatar from '../bgimages/bot_avatar.svg';
import '@patternfly/chatbot/dist/css/main.css';

const initialBotMessage: MessageProps = {
  id: generateId(),
  role: 'bot',
  content: 'Hello! Ask a question to test out your AI system',
  name: 'Bot',
  avatar: botAvatar,
};

const ChatbotMain: React.FunctionComponent = () => {
  const displayMode = ChatbotDisplayMode.embedded;
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const [messages, setMessages] = React.useState<MessageProps[]>([initialBotMessage]);
  const [showPopover, setShowPopover] = React.useState(false);
  const [isShareChatbotOpen, setIsShareChatbotOpen] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const { models, loading, error, fetchLlamaModels } = useFetchLlamaModels();
  const modelId = models[1]?.identifier;

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
    const fetchModels = async () => {
      await fetchLlamaModels();
    };

    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (loading) {
    return <Spinner size="sm" />;
  }

  // TODO: Uncomment this when we have the BFF working
  // if (error) {
  //   return <Alert variant="warning" isInline title="Cannot fetch models">
  //     {error}
  //   </Alert>;
  // };

  const handleMessageSend = async (userInput: string) => {
    if (!userInput || !modelId) {
      return;
    }

    setIsMessageSendButtonDisabled(true);

    const userMessage: MessageProps = {
      id: generateId(),
      role: 'user',
      content: userInput,
      name: 'User',
      avatar: userAvatar,
    };

    const updatedMessages = [...messages, userMessage];

    const transformMessage: ChatMessage[] = updatedMessages.map((msg) => ({
      role: msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.content ?? '',
      // eslint-disable-next-line camelcase
      stop_reason: 'end_of_message',
    }));

    setMessages(updatedMessages);

    try {
      const response = await completeChat(transformMessage, modelId);
      const responseObject = JSON.parse(response);
      const completion = responseObject?.completion_message;

      const assistantMessage: MessageProps = {
        id: generateId(),
        role: 'bot',
        content: completion?.content ?? 'Error receiving response',
        name: 'Bot',
        avatar: botAvatar,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
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
                {modelId}
              </Label>
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
