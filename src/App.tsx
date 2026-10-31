/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { InGameChatBox } from './components/InGameChatBox';
import { StatusModalCard } from './components/StatusModalCard';
import { TitleLobbyScreen } from './components/TitleLobbyScreen';
import { TopProgressBarHud } from './components/TopProgressBarHud';
import { TwinParkourCanvas } from './components/TwinParkourCanvas';
import {
  createInitialPlayerState,
  generateParkourCourse,
  pickDistinctEggColors,
} from './game/rules';
import { sound } from './game/sound';
import {
  ChatMessage,
  FloorAtmosphere,
  PlayerState,
  RoomState,
  WinnerItemType,
} from './game/types';

function createInitialLocalRoom(): RoomState {
  const initialCourse = generateParkourCourse(20261031);
  const colors = pickDistinctEggColors(20261031);
  const p1 = createInitialPlayerState(
    'local-p1',
    1,
    'Yumurta-1',
    colors.p1,
    'NONE',
    false,
  );
  const p2 = createInitialPlayerState(
    'bot-p2',
    2,
    'Cam Rakip',
    colors.p2,
    'NONE',
    true,
  );

  return {
    roomId: 'KULE-01',
    phase: 'lobby',
    countdownSeconds: 0,
    matchNumber: 1,
    course: initialCourse,
    players: { 1: p1, 2: p2 },
    winnerSlot: null,
    winnerName: null,
    awardedItem: 'GOLDEN_WINGS',
    startedAt: null,
    chatHistory: [
      {
        id: 'init-1',
        senderId: 'system',
        senderName: 'KULE SİSTEMİ',
        senderColor: '#38bdf8',
        slot: 0,
        text: 'Cam Kule: İkiz Parkur sunucusuna hoş geldin! T tuşu ile sohbet edebilirsin.',
        timestamp: Date.now(),
        isSystem: true,
      },
    ],
  };
}

export default function App() {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [uiPhase, setUiPhase] = useState<'title' | 'playing' | 'paused' | 'gameover'>(
    isAutostart ? 'playing' : 'title',
  );
  const [mySlot, setMySlot] = useState<1 | 2>(1);
  const [playerName, setPlayerName] = useState<string>('Yumurta Koşucu');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('KULE-01');
  const [roomState, setRoomState] = useState<RoomState>(() => {
    const initial = createInitialLocalRoom();
    if (isAutostart) {
      initial.phase = 'playing';
      initial.players[1]!.ready = true;
      initial.players[2]!.ready = true;
      initial.startedAt = Date.now();
    }
    return initial;
  });

  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [hudData, setHudData] = useState<{
    myFloor: FloorAtmosphere;
    bannerText: string | null;
    antiGlitchNotice: string | null;
  }>(() => ({
    myFloor: roomState.course.floors[0],
    bannerText: null,
    antiGlitchNotice: null,
  }));

  const socketRef = useRef<Socket | null>(null);
  const chatFocusedRef = useRef<boolean>(false);
  chatFocusedRef.current = chatOpen;

  const playersRef = useRef<Record<1 | 2, PlayerState | null>>({
    1: roomState.players[1],
    2: roomState.players[2],
  });
  const usedSignaturesRef = useRef<Set<string>>(
    new Set([roomState.course.signature]),
  );

  // Keep document.body.dataset.state synced with active game shell state
  useEffect(() => {
    document.body.dataset.state = uiPhase;
  }, [uiPhase]);

  // Connect to authoritative Socket.io server on mount
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('room:join', {
        roomId: roomCodeInput,
        playerName,
        autoReadyWithBot: isAutostart,
      });
    });

    socket.on(
      'room:joined',
      (payload: { slot: 1 | 2; roomId: string; state: RoomState }) => {
        setMySlot(payload.slot);
        setRoomCodeInput(payload.roomId);
        playersRef.current = {
          1: payload.state.players[1],
          2: payload.state.players[2],
        };
        setRoomState(payload.state);
        if (payload.state.phase === 'playing') {
          setUiPhase('playing');
        }
      },
    );

    socket.on('room:state', (nextState: RoomState) => {
      playersRef.current = {
        1: nextState.players[1],
        2: nextState.players[2],
      };
      setRoomState(nextState);
      if (nextState.phase === 'playing') {
        setUiPhase((prev) => (prev === 'paused' ? 'paused' : 'playing'));
      } else if (nextState.phase === 'finished') {
        setUiPhase('gameover');
      } else if (nextState.phase === 'lobby' && !isAutostart) {
        setUiPhase('title');
      }
    });

    socket.on(
      'player:remote_update',
      (payload: { slot: 1 | 2; player: PlayerState }) => {
        playersRef.current[payload.slot] = payload.player;
        setRoomState((prev) => ({
          ...prev,
          players: {
            ...prev.players,
            [payload.slot]: payload.player,
          },
        }));
      },
    );

    socket.on('chat:message', (msg: ChatMessage) => {
      sound.playChatPing();
      setRoomState((prev) => {
        if (prev.chatHistory.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          chatHistory: [...prev.chatHistory.slice(-49), msg],
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Global keyboard shortcuts:
  // - [T] opens in-game chat box
  // - [P] or [Escape] toggles Pause while playing
  // - [M] toggles audio mute
  // - [Enter] or [Space] on Title screen starts the match
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (isInputFocused) return;

      if (e.code === 'KeyT' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setChatOpen(true);
        return;
      }

      if (e.code === 'KeyM') {
        e.preventDefault();
        const nextMuted = sound.toggleMute();
        setMuted(nextMuted);
        return;
      }

      if (uiPhase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleAddBotPartnerAndStart();
        return;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (uiPhase === 'playing') {
          e.preventDefault();
          setUiPhase('paused');
        } else if (uiPhase === 'paused') {
          e.preventDefault();
          setUiPhase('playing');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [uiPhase]);

  const handleJoinRoom = useCallback(
    (targetCode: string, name: string, autoStartWithBot = false) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('room:join', {
          roomId: targetCode,
          playerName: name,
          autoReadyWithBot: autoStartWithBot,
        });
      }
    },
    [],
  );

  const handleToggleReady = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('player:toggle_ready');
    } else {
      setRoomState((prev) => {
        const me = prev.players[mySlot];
        if (!me) return prev;
        const updatedMe = { ...me, ready: !me.ready };
        const updatedPlayers = { ...prev.players, [mySlot]: updatedMe };
        playersRef.current = updatedPlayers;
        return { ...prev, players: updatedPlayers };
      });
    }
  }, [mySlot]);

  const handleAddBotPartnerAndStart = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.dataset.state = 'playing';
    setUiPhase('playing');

    if (socketRef.current?.connected) {
      socketRef.current.emit('room:join', {
        roomId: roomCodeInput,
        playerName,
        autoReadyWithBot: true,
      });
    } else {
      setRoomState((prev) => {
        const colors = pickDistinctEggColors(prev.course.seed + prev.matchNumber);
        const p1 =
          prev.players[1] ||
          createInitialPlayerState('local-1', 1, playerName, colors.p1);
        const p2 =
          prev.players[2] ||
          createInitialPlayerState('bot-2', 2, 'Cam Rakip', colors.p2, 'NONE', true);
        p1.ready = true;
        p2.ready = true;
        playersRef.current = { 1: p1, 2: p2 };
        return {
          ...prev,
          phase: 'playing',
          startedAt: Date.now(),
          players: { 1: p1, 2: p2 },
        };
      });
    }
  }, [playerName, roomCodeInput]);

  const handleLocalPlayerSync = useCallback(
    (updatedPlayer: PlayerState, justFinished: boolean) => {
      playersRef.current[mySlot] = updatedPlayer;
      if (socketRef.current?.connected) {
        socketRef.current.emit('player:sync', updatedPlayer);
      }
      if (justFinished) {
        setRoomState((prev) => ({
          ...prev,
          phase: 'finished',
          winnerSlot: prev.winnerSlot || mySlot,
          winnerName: prev.winnerName || updatedPlayer.name,
          players: { ...prev.players, [mySlot]: updatedPlayer },
        }));
        setUiPhase('gameover');
      } else {
        setRoomState((prev) => ({
          ...prev,
          players: { ...prev.players, [mySlot]: updatedPlayer },
        }));
      }
    },
    [mySlot],
  );

  const handleBotPlayerSync = useCallback(
    (botPlayer: PlayerState, justFinished: boolean) => {
      const botSlot: 1 | 2 = mySlot === 1 ? 2 : 1;
      playersRef.current[botSlot] = botPlayer;
      if (socketRef.current?.connected) {
        socketRef.current.emit('player:sync', botPlayer);
      }
      if (justFinished) {
        setRoomState((prev) => ({
          ...prev,
          phase: 'finished',
          winnerSlot: prev.winnerSlot || botSlot,
          winnerName: prev.winnerName || botPlayer.name,
          players: { ...prev.players, [botSlot]: botPlayer },
        }));
        setUiPhase('gameover');
      }
    },
    [mySlot],
  );

  const handleTriggerUnstuck = useCallback(() => {
    const me = playersRef.current[mySlot];
    if (!me) return;
    const recovered: PlayerState = {
      ...me,
      position: {
        x: me.checkpointPos.x,
        y: me.checkpointPos.y + 1.2,
        z: me.checkpointPos.z,
      },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: false,
      antiGlitchTriggers: me.antiGlitchTriggers + 1,
    };
    playersRef.current[mySlot] = recovered;
    sound.playRespawn();
    setHudData((prev) => ({
      ...prev,
      antiGlitchNotice: 'Checkpoint Kurtarma [R] uygulandı',
    }));
  }, [mySlot]);

  const handleRematch = useCallback(
    (chosenItem: WinnerItemType, autoStart: boolean) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      if (socketRef.current?.connected) {
        socketRef.current.emit('room:rematch', {
          chosenWinnerItem: chosenItem,
          autoStart,
        });
        setUiPhase(autoStart ? 'playing' : 'title');
      } else {
        // Offline / local fallback with guaranteed non-repeating course & new egg colors
        setRoomState((prev) => {
          const nextMatch = prev.matchNumber + 1;
          const nextSeed = (Date.now() ^ (nextMatch * 99991)) >>> 0;
          const nextCourse = generateParkourCourse(
            nextSeed,
            usedSignaturesRef.current,
          );
          const nextColors = pickDistinctEggColors(nextSeed);
          const winSlot = prev.winnerSlot || mySlot;

          const p1 = createInitialPlayerState(
            'local-1',
            1,
            prev.players[1]?.name || playerName,
            nextColors.p1,
            winSlot === 1 ? chosenItem : 'NONE',
            false,
          );
          const p2 = createInitialPlayerState(
            'bot-2',
            2,
            prev.players[2]?.name || 'Cam Rakip',
            nextColors.p2,
            winSlot === 2 ? chosenItem : 'NONE',
            true,
          );
          p1.ready = autoStart;
          p2.ready = true;
          playersRef.current = { 1: p1, 2: p2 };

          return {
            ...prev,
            matchNumber: nextMatch,
            phase: autoStart ? 'playing' : 'lobby',
            course: nextCourse,
            winnerSlot: null,
            winnerName: null,
            awardedItem: chosenItem,
            startedAt: autoStart ? Date.now() : null,
            players: { 1: p1, 2: p2 },
          };
        });
        setUiPhase(autoStart ? 'playing' : 'title');
      }
    },
    [mySlot, playerName],
  );

  const handleSendMessage = useCallback(
    (text: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('chat:send', { text });
      } else {
        const me = playersRef.current[mySlot];
        const localMsg: ChatMessage = {
          id: `local-${Date.now()}`,
          senderId: 'me',
          senderName: me?.name || playerName,
          senderColor: me?.eggColor || '#ff6b6b',
          slot: mySlot,
          text,
          timestamp: Date.now(),
        };
        setRoomState((prev) => ({
          ...prev,
          chatHistory: [...prev.chatHistory.slice(-49), localMsg],
        }));
      }
    },
    [mySlot, playerName],
  );

  return (
    <main className="relative w-full h-full overflow-hidden select-none">
      {/* Persistent 3D Twin-Chamber WebGL Viewport (Never Re-Created on HUD Updates) */}
      <TwinParkourCanvas
        gameState={uiPhase}
        mySlot={mySlot}
        course={roomState.course}
        playersRef={playersRef}
        chatFocusedRef={chatFocusedRef}
        onLocalPlayerSync={handleLocalPlayerSync}
        onBotPlayerSync={handleBotPlayerSync}
        onHudUpdate={(hud) => {
          setHudData({
            myFloor: hud.myFloor,
            bannerText: hud.bannerText,
            antiGlitchNotice: hud.antiGlitchNotice,
          });
        }}
      />

      {/* Title & 2-Player Ready Approval Lobby Screen */}
      {uiPhase === 'title' && (
        <TitleLobbyScreen
          roomState={roomState}
          mySlot={mySlot}
          playerName={playerName}
          roomCodeInput={roomCodeInput}
          onChangeName={setPlayerName}
          onChangeRoomCode={setRoomCodeInput}
          onJoinRoom={handleJoinRoom}
          onToggleReady={handleToggleReady}
          onAddBotPartnerAndStart={handleAddBotPartnerAndStart}
        />
      )}

      {/* Active Gameplay HUD (Top Progress Bar + Floor Anomaly Alert + Utility Buttons) */}
      {uiPhase !== 'title' && (
        <TopProgressBarHud
          mySlot={mySlot}
          p1={roomState.players[1]}
          p2={roomState.players[2]}
          myFloor={hudData.myFloor}
          bannerText={hudData.bannerText}
          antiGlitchNotice={hudData.antiGlitchNotice}
          muted={muted}
          onToggleMute={() => {
            const next = sound.toggleMute();
            setMuted(next);
          }}
          onTriggerUnstuck={handleTriggerUnstuck}
          onTogglePause={() =>
            setUiPhase((p) => (p === 'playing' ? 'paused' : 'playing'))
          }
        />
      )}

      {/* In-Game Real-Time [T] Chat Window */}
      <InGameChatBox
        messages={roomState.chatHistory}
        chatOpen={chatOpen}
        onSetChatOpen={setChatOpen}
        onSendMessage={handleSendMessage}
      />

      {/* Pause & Victory / Game Over Modal Card */}
      {(uiPhase === 'paused' || uiPhase === 'gameover') && (
        <StatusModalCard
          mode={uiPhase}
          roomState={roomState}
          mySlot={mySlot}
          onResume={() => setUiPhase('playing')}
          onTriggerUnstuck={handleTriggerUnstuck}
          onRematch={handleRematch}
          onReturnToTitle={() => setUiPhase('title')}
        />
      )}
    </main>
  );
}
