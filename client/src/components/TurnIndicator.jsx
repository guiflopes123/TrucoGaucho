import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
`;

const Banner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px 14px;
  padding: 8px 16px;
  text-align: center;
  font-weight: bold;
  color: #ffd700;
  background: rgba(0, 0, 0, 0.6);
  border-bottom: 1px solid rgba(255, 215, 0, 0.3);
  min-height: 38px;
`;

const Countdown = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${props => (props.$urgent ? '#ff6b6b' : '#fff')};
  animation: ${props => (props.$urgent ? blink : 'none')} 0.8s infinite;
`;

const Bar = styled.span`
  display: inline-block;
  width: 90px;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.25);
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.$percent}%;
    background: ${props => (props.$urgent ? '#ff6b6b' : '#4caf50')};
    transition: width 0.25s linear;
  }
`;

const URGENT_SECONDS = 10;

// Contagem regressiva a partir do tempo restante informado pelo servidor (evita depender
// dos relógios do cliente e do servidor estarem sincronizados).
const useCountdown = (remainingMs) => {
  // Guarda de qual leitura do servidor vem o valor, para descartar leituras antigas.
  const [ticked, setTicked] = useState(null);

  useEffect(() => {
    if (remainingMs == null) return undefined;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setTicked({ source: remainingMs, left: Math.max(0, remainingMs - (Date.now() - startedAt)) });
    }, 250);
    return () => clearInterval(interval);
  }, [remainingMs]);

  if (remainingMs == null) return null;
  return ticked && ticked.source === remainingMs ? ticked.left : remainingMs;
};

// Linha de status logo abaixo do cabeçalho: de quem é a vez ou o que está pendente, com o
// tempo que resta para a jogada.
const TurnIndicator = ({ text, remainingMs, totalMs }) => {
  const left = useCountdown(remainingMs);
  const seconds = left == null ? null : Math.ceil(left / 1000);
  const urgent = seconds != null && seconds <= URGENT_SECONDS;
  const percent = left == null || !totalMs ? 0 : Math.min(100, (left / totalMs) * 100);

  return (
    <Banner role="status" aria-live="polite">
      <span>{text}</span>
      {seconds != null && (
        <Countdown $urgent={urgent} aria-label={`Tempo restante: ${seconds} segundos`}>
          <span aria-hidden="true">⏱ {seconds}s</span>
          <Bar aria-hidden="true" $percent={percent} $urgent={urgent} />
        </Countdown>
      )}
    </Banner>
  );
};

export default TurnIndicator;
