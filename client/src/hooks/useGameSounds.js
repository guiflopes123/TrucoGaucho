import { useEffect, useRef } from 'react';
import { playSound } from '../utils/sound';

// Dispara os efeitos sonoros a partir das mudanças do estado da partida.
export const useGameSounds = ({ gameState, playerId, hasPendingResponse, result }) => {
  const previous = useRef({ table: 0, myTurn: false, pending: false, finished: false });

  useEffect(() => {
    if (!gameState) return;

    const table = gameState.playedCards.length;
    const myTurn = gameState.gameStatus === 'playing' && gameState.currentPlayer === playerId;
    const finished = gameState.gameStatus === 'finished';
    const last = previous.current;

    if (table > last.table) playSound('card');
    if (hasPendingResponse && !last.pending) playSound('bet');
    else if (myTurn && !last.myTurn && !hasPendingResponse) playSound('turn');
    if (finished && !last.finished && result) playSound(result.won ? 'win' : 'lose');

    previous.current = { table, myTurn, pending: hasPendingResponse, finished };
  }, [gameState, playerId, hasPendingResponse, result]);
};
