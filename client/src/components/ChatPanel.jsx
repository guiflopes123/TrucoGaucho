import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const QUICK_PHRASES = ['Boa!', 'Vamos lá!', 'Truco!', 'Aceita?', 'Valeu!', 'Que sorte...'];

const Toggle = styled.button`
  position: fixed;
  left: 12px;
  bottom: 12px;
  z-index: 60;
  padding: 8px 14px;
  border-radius: 20px;
  background: #4682b4;
  color: white;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
`;

const Badge = styled.span`
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 10px;
  background: #b22222;
  font-size: 0.8rem;
`;

const Panel = styled.section`
  position: fixed;
  left: 12px;
  bottom: 56px;
  z-index: 60;
  display: flex;
  flex-direction: column;
  width: min(340px, calc(100vw - 24px));
  height: min(360px, 55vh);
  border-radius: 12px;
  border: 2px solid #ffd700;
  background: rgba(0, 0, 0, 0.92);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
`;

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Message = styled.div`
  align-self: ${props => (props.$mine ? 'flex-end' : 'flex-start')};
  max-width: 85%;
  padding: 6px 10px;
  border-radius: 10px;
  background: ${props => (props.$mine ? '#2e6b3a' : '#333')};
  font-size: 0.92rem;
  word-break: break-word;

  strong {
    display: block;
    font-size: 0.75rem;
    color: ${props => (props.$sameTeam ? '#8fd19e' : '#ff9d9d')};
  }
`;

const Quick = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px;
`;

const QuickButton = styled.button`
  padding: 3px 9px;
  border-radius: 12px;
  background: #444;
  color: white;
  font-size: 0.8rem;
  font-weight: normal;
`;

const Form = styled.form`
  display: flex;
  gap: 6px;
  padding: 8px 10px 10px;

  input {
    flex: 1;
    min-width: 0;
    padding: 8px;
    font-size: 0.95rem;
  }
`;

const ChatPanel = ({ messages, playerId, myTeam, onSend }) => {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  const unread = open ? 0 : Math.max(0, messages.length - seen);

  useEffect(() => {
    if (open && endRef.current) endRef.current.scrollIntoView({ block: 'end' });
  }, [open, messages.length]);

  // Ao abrir ou fechar, tudo o que existe até agora conta como lido.
  const toggle = () => {
    setSeen(messages.length);
    setOpen(prev => !prev);
  };

  const send = (value) => {
    const message = value.trim();
    if (!message) return;
    onSend(message);
    setText('');
  };

  return (
    <>
      <Toggle type="button" aria-expanded={open} onClick={toggle}>
        {open ? 'Fechar chat' : 'Chat'}
        {unread > 0 && <Badge aria-label={`${unread} mensagens novas`}>{unread}</Badge>}
      </Toggle>

      {open && (
        <Panel aria-label="Chat da sala">
          <Messages role="log" aria-live="polite">
            {messages.length === 0 && <em>Nenhuma mensagem ainda. Diga oi!</em>}
            {messages.map(message => (
              <Message key={message.id} $mine={message.playerId === playerId} $sameTeam={message.team === myTeam}>
                <strong>{message.name}</strong>
                {message.text}
              </Message>
            ))}
            <div ref={endRef} />
          </Messages>

          <Quick>
            {QUICK_PHRASES.map(phrase => (
              <QuickButton key={phrase} type="button" onClick={() => send(phrase)}>{phrase}</QuickButton>
            ))}
          </Quick>

          <Form onSubmit={(event) => { event.preventDefault(); send(text); }}>
            <input
              value={text}
              maxLength={140}
              placeholder="Escreva uma mensagem"
              aria-label="Mensagem"
              onChange={(event) => setText(event.target.value)}
            />
            <button type="submit">Enviar</button>
          </Form>
        </Panel>
      )}
    </>
  );
};

export default ChatPanel;
