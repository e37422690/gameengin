import React, { useState } from 'react';
import { WINNER_ITEMS } from '../game/rules';
import { RoomState, WinnerItemType } from '../game/types';

interface StatusModalCardProps {
  mode: 'paused' | 'gameover';
  roomState: RoomState;
  mySlot: 1 | 2;
  onResume: () => void;
  onTriggerUnstuck: () => void;
  onRematch: (chosenItem: WinnerItemType, autoStart: boolean) => void;
  onReturnToTitle: () => void;
}

export const StatusModalCard: React.FC<StatusModalCardProps> = ({
  mode,
  roomState,
  mySlot,
  onResume,
  onTriggerUnstuck,
  onRematch,
  onReturnToTitle,
}) => {
  const [selectedReward, setSelectedReward] = useState<WinnerItemType>(
    roomState.awardedItem === 'NONE' ? 'GOLDEN_WINGS' : roomState.awardedItem,
  );

  const me = roomState.players[mySlot];
  const rivalSlot: 1 | 2 = mySlot === 1 ? 2 : 1;
  const rival = roomState.players[rivalSlot];
  const didIWin = roomState.winnerSlot === mySlot;

  if (mode === 'paused') {
    return (
      <div
        role="dialog"
        aria-label="Oyun Duraklatıldı"
        className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/60 pointer-events-auto"
      >
        <div className="hud-panel w-full max-w-md rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/10 pb-3">
            <h2 className="font-display text-2xl font-extrabold text-white">
              OYUN DURAKLATILDI
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Oda: {roomState.roomId} · Maç #{roomState.matchNumber} · Parkur Tohumu #{roomState.course.seed}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-900/90 border border-white/10 p-3">
              <div className="text-[11px] font-semibold text-slate-400">MEVCUT KAT</div>
              <div className="font-display text-2xl font-bold text-sky-300 font-mono-tabular mt-0.5">
                {me?.currentFloor || 1} / 5
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/90 border border-white/10 p-3">
              <div className="text-[11px] font-semibold text-slate-400">İLERLEYİŞ</div>
              <div className="font-display text-2xl font-bold text-emerald-300 font-mono-tabular mt-0.5">
                %{Math.round(me?.progress || 0)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/90 border border-white/10 p-3">
              <div className="text-[11px] font-semibold text-slate-400">CHECKPOINT DÖNÜŞ</div>
              <div className="font-display text-2xl font-bold text-amber-300 font-mono-tabular mt-0.5">
                {me?.respawnCount || 0}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={onResume}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-sm transition-colors"
            >
              Yarışa Devam Et [Esc / P]
            </button>
            <button
              type="button"
              onClick={() => {
                onTriggerUnstuck();
                onResume();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors"
            >
              Son Checkpoint&apos;e Işınlan [R]
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors"
            >
              Oda Lobisine Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Victory / Game Over Modal
  const winnerPlayer =
    (roomState.winnerSlot ? roomState.players[roomState.winnerSlot] : me) || me;
  const clearSec = winnerPlayer?.finishTimeMs
    ? Math.max(1, Math.round(winnerPlayer.finishTimeMs / 1000))
    : 42;

  return (
    <div
      role="dialog"
      aria-label="Maç Sonucu ve Şampiyonluk Ödülü"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/65 pointer-events-auto"
    >
      <div className="hud-panel w-full max-w-lg rounded-2xl p-6 space-y-5">
        <div className="border-b border-white/10 pb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
              {didIWin ? 'ZİRVE ŞAMPİYONU SENSİN!' : 'YARIŞ TAMAMLANDI'}
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white mt-0.5">
              Kazanan: {roomState.winnerName || winnerPlayer?.name || 'Şampiyon Yumurta'}
            </h2>
          </div>

          <div
            className="w-11 h-11 rounded-full border-2 border-amber-300 flex items-center justify-center shrink-0"
            style={{ backgroundColor: winnerPlayer?.eggColor || '#facc15' }}
          >
            <span className="text-xs font-extrabold text-slate-950">1.</span>
          </div>
        </div>

        {/* 3 Mastery / Progress Metrics (tabular-nums) */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-slate-900/90 border border-white/10 p-3">
            <div className="text-[11px] font-semibold text-slate-400">BİTİRME SÜRESİ</div>
            <div className="font-display text-2xl font-bold text-amber-300 font-mono-tabular mt-0.5">
              {clearSec}sn
            </div>
          </div>
          <div className="rounded-xl bg-slate-900/90 border border-white/10 p-3">
            <div className="text-[11px] font-semibold text-slate-400">SENİN İLERLEYİŞİN</div>
            <div className="font-display text-2xl font-bold text-sky-300 font-mono-tabular mt-0.5">
              %{Math.round(me?.progress || 0)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-900/90 border border-white/10 p-3">
            <div className="text-[11px] font-semibold text-slate-400">CAM RAKİP</div>
            <div className="font-display text-2xl font-bold text-emerald-300 font-mono-tabular mt-0.5">
              %{Math.round(rival?.progress || 0)}
            </div>
          </div>
        </div>

        {/* Winner's Special Item Selection & Description */}
        <div className="rounded-xl bg-slate-900/95 border border-amber-400/40 p-4 space-y-2.5">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">
            ŞAMPİYON ÖZEL EŞYA ÖDÜLÜ (Yeni Oyunda Aktif Olur)
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Kazanana verilen bu özel eşya bir sonraki oyunda yeni parkurda ekstra zıplama ve havada atılma gücü sağlar:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {(['GOLDEN_WINGS', 'TURBO_SPRING', 'PHASE_DASH'] as WinnerItemType[]).map(
              (itemKey) => {
                const spec = WINNER_ITEMS[itemKey];
                const active = selectedReward === itemKey;
                return (
                  <button
                    key={itemKey}
                    type="button"
                    onClick={() => setSelectedReward(itemKey)}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      active
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : 'bg-slate-950/70 border-white/10 text-slate-300 hover:border-white/30'
                    }`}
                  >
                    <div className="text-xs font-bold text-amber-300 truncate">
                      {spec.name}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                      {spec.shortDesc}
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* Replay CTA */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={() => onRematch(selectedReward, true)}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-colors"
          >
            Tekrar Oyna (Yeni Parkur & Özel Eşya İle Hemen Başla)
          </button>
          <button
            type="button"
            onClick={() => onRematch(selectedReward, false)}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
          >
            Lobiye Dön (Onay Bekle)
          </button>
        </div>
      </div>
    </div>
  );
};
