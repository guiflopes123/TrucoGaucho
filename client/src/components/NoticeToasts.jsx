import React from 'react';
import styled, { keyframes } from 'styled-components';

const slideIn = keyframes`
  from { transform: translateX(30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const Stack = styled.div`
  position: fixed;
  top: 64px;
  right: 12px;
  z-index: 90;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: min(360px, calc(100vw - 24px));
  pointer-events: none;
`;

const Toast = styled.div`
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.85);
  border-left: 4px solid #ffd700;
  color: #fff;
  font-size: 0.95rem;
  line-height: 1.3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  animation: ${slideIn} 0.3s ease;
`;

const NoticeToasts = ({ notices }) => (
  <Stack role="log" aria-live="polite" aria-label="Avisos da partida">
    {notices.map(notice => <Toast key={notice.id}>{notice.message}</Toast>)}
  </Stack>
);

export default NoticeToasts;
