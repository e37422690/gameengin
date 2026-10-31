import React from 'react';
import { WINNER_ITEMS } from '../game/rules';
import { FloorAtmosphere, PlayerState } from '../game/types';

interface TopProgressBarHudProps {
  mySlot: 1 | 2;
  p1: PlayerState | null;
  p2: PlayerState | null;
  myFloor: FloorAtmosphere;
  bannerText: string | null;
  antiGlitchNotice: string | null;
  muted: boolean;
  onToggleMute: () => void;
  onTriggerUnstuck: () => void;
  onTogglePause: () => void;
}

export const TopProgressBarHud: React.FC<TopProgressBarHudProps> = ({
  mySlot,
  p1,
  p2,
  myFloor,
  bannerText,
  antiGlitchNotice,
  muted,
  onToggleMute,
  onTriggerUnstuck,
  onTogglePause,
}) => {
  const me = mySlot === 1 ? p1 : p2;
  const myItemSpec = me ? WINNER_ITEMS[me.winnerItem] : WINNER_ITEMS.NONE;
  const hasAnomaly = myFloor.anomaly !== 'NONE';

  return (
    <div className="fixed inset-x-0 top-0 z-10 p-3 md:p-4 pointer-events-none flex flex-col items-center gap-2">
      <div className="w-full max-w-6xl flex items-start justify-between gap-4">
        {/* Top-Left Cluster: Active Floor Atmosphere & Winner Special Item Status */}
        <div className="hud-panel rounded-xl px-3.5 py-2.5 flex flex-col gap-1 min-w-[230px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
              KAT {myFloor.floorNumber} / 5
            </span>
            <span className="text-xs font-mono-tabular text-slate-300">
              Checkpoint #{me?.highestCheckpointFloor || 1}
            </span>
          </div>
          <div className="font-display text-base font-bold text-white leading-tight">
            {myFloor.title}
          </div>
          <div className="text-xs text-slate-300">
            Özel Eşya:{' '}
            <span className="font-semibold text-amber-300">
              {myItemSpec.name}
            </span>
            {me && me.winnerItem !== 'NONE' && (
              <span className="ml-1.5 font-mono-tabular text-sky-300">
                (Hava Zıplaması: {me.airJumpsLeft} · Atılma:{' '}
                {me.dashCooldownLeft > 0
                  ? `${me.dashCooldownLeft.toFixed(1)}s`
                  : 'HAZIR [E]'}
                )
              </span>
            )}
          </div>
        </div>

        {/* Top-Center Cluster: Dual Player Race Loading / Progress Bar with 5 Floor Checkpoints */}
        <div
          data-testid="dual-progress-bar"
          className="hud-panel flex-1 max-w-2xl rounded-xl px-4 py-2.5"
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full border border-black"
                style={{ backgroundColor: p1?.eggColor || '#ff6b6b' }}
              />
              <span className="text-white truncate max-w-[130px]">
                {p1?.name || 'Sol Oda'} (Kat {p1?.currentFloor || 1})
              </span>
              <span className="font-mono-tabular text-sky-300 font-bold">
                %{Math.round(p1?.progress || 0)}
              </span>
            </div>

            <span className="text-slate-400 text-xs">
              CAM BÖLMELİ CANLI İLERLEYİŞ
            </span>

            <div className="flex items-center gap-2">
              <span className="font-mono-tabular text-amber-300 font-bold">
                %{Math.round(p2?.progress || 0)}
              </span>
              <span className="text-white truncate max-w-[130px]">
                {p2?.name || 'Sağ Oda'} (Kat {p2?.currentFloor || 1})
              </span>
              <span
                className="inline-block w-3 h-3 rounded-full border border-black"
                style={{ backgroundColor: p2?.eggColor || '#38bdf8' }}
              />
            </div>
          </div>

          {/* Dual Progress Track */}
          <div className="relative h-5 rounded-lg bg-slate-950/90 border border-white/15 overflow-hidden">
            {/* Floor Checkpoint Dividers (Kat 1..5) */}
            {[20, 40, 60, 80].map((pct, i) => (
              <div
                key={pct}
                className="absolute top-0 bottom-0 w-px bg-white/25 z-10"
                style={{ left: `${pct}%` }}
                title={`Kat ${i + 2} Checkpoint`}
              />
            ))}

            {/* Player 1 Top Half Fill */}
            <div
              className="absolute top-0 left-0 h-2.5 transition-all duration-100"
              style={{
                width: `${Math.max(2, p1?.progress || 0)}%`,
                backgroundColor: p1?.eggColor || '#ff6b6b',
              }}
            />

            {/* Player 2 Bottom Half Fill */}
            <div
              className="absolute bottom-0 left-0 h-2.5 transition-all duration-100"
              style={{
                width: `${Math.max(2, p2?.progress || 0)}%`,
                backgroundColor: p2?.eggColor || '#38bdf8',
              }}
            />
          </div>

          {/* Floor Checkpoint Labels under bar */}
          <div className="flex justify-between text-[11px] font-mono-tabular text-slate-400 mt-1">
            <span>Kat 1</span>
            <span>Kat 2</span>
            <span>Kat 3</span>
            <span>Kat 4</span>
            <span>Kat 5</span>
            <span className="text-amber-300 font-bold">ZİRVE</span>
          </div>
        </div>

        {/* Top-Right Cluster: Compact Square Utility SVG Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Sesi Aç [M]' : 'Sesi Kapat [M]'}
            title={muted ? 'Sesi Aç [M]' : 'Sesi Kapat [M]'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="hud-panel w-10 h-10 rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:border-sky-400/50 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {muted ? (
                <>
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </>
              ) : (
                <>
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </>
              )}
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Son Checkpoint'e Kurtar [R]"
            title="Sıkışma Önleyici: Son Checkpoint'e Işınlan [R]"
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerUnstuck();
            }}
            className="hud-panel w-10 h-10 rounded-xl flex items-center justify-center text-amber-300 hover:text-amber-200 hover:border-amber-400/50 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Oyunu Duraklat [P]"
            title="Duraklat [P / Esc]"
            onClick={(e) => {
              e.currentTarget.blur();
              onTogglePause();
            }}
            className="hud-panel w-10 h-10 rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:border-sky-400/50 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Floor Anomaly Special Event Callout (when active on current floor) */}
      {hasAnomaly && (
        <div
          data-testid="floor-anomaly-banner"
          className="hud-panel-amber rounded-xl px-4 py-1.5 text-center max-w-xl"
        >
          <div className="text-xs font-extrabold text-amber-300 tracking-wide">
            {myFloor.anomalyTitle}
          </div>
          <div className="text-[11px] text-amber-100/90">
            {myFloor.anomalyDescription}
          </div>
        </div>
      )}

      {/* Transient Checkpoint / Floor Transition Banner */}
      {bannerText && (
        <div className="hud-panel px-5 py-2 rounded-xl text-sm font-display font-bold text-emerald-300 tracking-wide">
          {bannerText}
        </div>
      )}

      {/* Anti-Glitch Protection Shield Notification */}
      {antiGlitchNotice && (
        <div className="hud-panel px-4 py-1 rounded-lg text-xs font-mono-tabular text-sky-300">
          Anti-Hata Kalkanı: {antiGlitchNotice}
        </div>
      )}
    </div>
  );
};
