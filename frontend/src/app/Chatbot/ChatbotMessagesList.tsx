import React from 'react';
import { Message, MessageProps } from '@patternfly/chatbot';

type ChatbotMessagesListProps = {
  messageList: MessageProps[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

const ChatbotMessagesList: React.FC<ChatbotMessagesListProps> = ({ messageList, scrollRef }) => (
  <>
    {messageList.map((message, index) => (
      <React.Fragment key={message.id}>
        <Message {...message} />
        {index === messageList.length - 1 && <div ref={scrollRef} />}
      </React.Fragment>
    ))}
    {messageList.length === 0 && <div ref={scrollRef} />}
  </>
);

const ChatbotMessages = React.memo(ChatbotMessagesList);

export { ChatbotMessages };
