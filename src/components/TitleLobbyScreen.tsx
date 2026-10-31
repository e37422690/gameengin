import React, { useState } from 'react';
import { WINNER_ITEMS } from '../game/rules';
import { RoomState, WinnerItemType } from '../game/types';

interface TitleLobbyScreenProps {
  roomState: RoomState;
  mySlot: 1 | 2;
  playerName: string;
  roomCodeInput: string;
  onChangeName: (name: string) => void;
  onChangeRoomCode: (code: string) => void;
  onJoinRoom: (roomId: string, name: string, autoStartWithBot?: boolean) => void;
  onToggleReady: () => void;
  onAddBotPartnerAndStart: () => void;
}

export const TitleLobbyScreen: React.FC<TitleLobbyScreenProps> = ({
  roomState,
  mySlot,
  playerName,
  roomCodeInput,
  onChangeName,
  onChangeRoomCode,
  onJoinRoom,
  onToggleReady,
  onAddBotPartnerAndStart,
}) => {
  const [showRulesModal, setShowRulesModal] = useState(false);

  const p1 = roomState.players[1];
  const p2 = roomState.players[2];
  const myPlayer = roomState.players[mySlot];
  const bothPresent = Boolean(p1 && p2);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-10 pointer-events-none">
      {/* Top Row: Bespoke Inline SVG Title Emblem over open 3D Vista */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="pointer-events-auto flex items-center gap-4">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            className="shrink-0"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="crestBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>
            {/* Outer Shield Silhouette */}
            <path
              d="M32 4 L58 14 L54 44 L32 60 L10 44 L6 14 Z"
              fill="url(#crestBg)"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
            {/* Central Glass Divider Line */}
            <line
              x1="32"
              y1="8"
              x2="32"
              y2="55"
              stroke="#bae6fd"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            {/* Left Egg Silhouette */}
            <ellipse
              cx="20"
              cy="33"
              rx="7.5"
              ry="10"
              fill={p1?.eggColor || '#ff6b6b'}
              stroke="#090d16"
              strokeWidth="2"
            />
            <circle cx="22" cy="30" r="1.5" fill="#090d16" />
            {/* Right Egg Silhouette */}
            <ellipse
              cx="44"
              cy="33"
              rx="7.5"
              ry="10"
              fill={p2?.eggColor || '#38bdf8'}
              stroke="#090d16"
              strokeWidth="2"
            />
            <circle cx="42" cy="30" r="1.5" fill="#090d16" />
            {/* Crown on top */}
            <path
              d="M25 14 L29 19 L32 13 L35 19 L39 14 L37 21 L27 21 Z"
              fill="#facc15"
            />
          </svg>

          <div>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-white hud-stroke">
              CAM KULE: İKİZ PARKUR
            </h1>
            <p className="text-sm text-sky-200/90 mt-0.5 hud-stroke">
              Cam Bölmeli 2 Kişilik Canlı Yumurta Yarışı · 5 Katlı Yenilenen Parkur · Kat Anomalileri
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowRulesModal((v) => !v)}
            className="hud-panel px-4 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:border-sky-400/50 transition-colors whitespace-nowrap shrink-0"
          >
            {showRulesModal ? 'Rehberi Kapat' : 'Oyun Kuralları & Anti-Hata Koruması'}
          </button>
        </div>
      </div>

      {/* Optional Rules & Anti-Bug Info Drawer */}
      {showRulesModal && (
        <div
          role="dialog"
          aria-label="Oyun Kuralları ve Anti-Hata Koruması"
          className="pointer-events-auto hud-panel max-w-2xl rounded-xl p-5 my-auto self-center text-sm text-slate-200 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="font-display text-lg font-bold text-white">
              Cam Kule Mekanikleri & Anti-Hata Kalkanı
            </h2>
            <button
              type="button"
              onClick={() => setShowRulesModal(false)}
              className="px-2.5 py-1 rounded bg-white/10 text-xs font-semibold hover:bg-white/20"
            >
              Kapat
            </button>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
            <li>
              1. İki oyuncu yan yana odalarda, ortadaki kırılmaz cam bölmeden birbirini görerek aynı 5 katlı parkuru geçmeye çalışır.
            </li>
            <li>
              2. Her katın başında Checkpoint bulunur ve her maçta parkur dizilimi ile yumurta renkleri benzersiz şekilde sıfırdan üretilir.
            </li>
            <li>
              3. Bazı katlarda iki oyuncuyu da aynı anda etkileyen Kata Özel Etkinlikler (Buzlu Zemin, Ters Kontroller, Ay Yerçekimi, Hız Koridoru, Sismik Sarsıntı) tetiklenir.
            </li>
            <li>
              4. 5. Katın zirvesini ilk bitiren oyuncu Özel Şampiyon Eşyası kazanır ve "Tekrar Oyna" dendiğinde Çift Zıplama + Havada Atılma özelliğini kullanabilir.
            </li>
            <li>
              5. Anti-Hata Kodları: Cam duvardan geçme engeli, lag/sekme değişiminde zeminden düşmeyi önleyen alt-adımlı fizik (dt &le; 0.05s), boşlukta otomatik Checkpoint kurtarma, [T] sohbetteyken karakterin istemsiz yürümesini kilitleme ve [R] sıkışma kurtarma tuşu aktiftir.
            </li>
          </ul>
        </div>
      )}

      {/* Main Lower-Left / Center Compact Lobby & Ready Handshake Panel */}
      <div className="pointer-events-auto hud-panel w-full max-w-3xl rounded-2xl p-5 md:p-6 self-center">
        {/* Room & Nickname Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-4 border-b border-white/10">
          <div>
            <label
              htmlFor="player-name-input"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Yumurta Adın
            </label>
            <input
              id="player-name-input"
              type="text"
              value={playerName}
              maxLength={18}
              onChange={(e) => onChangeName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950/90 border border-white/15 text-sm text-white focus:outline-none focus:border-sky-400"
              placeholder="Yumurta Koşucu"
            />
          </div>

          <div>
            <label
              htmlFor="room-code-input"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Sunucu Oda Kodu (2. Oyuncu İçin)
            </label>
            <div className="flex gap-2">
              <input
                id="room-code-input"
                type="text"
                value={roomCodeInput}
                maxLength={14}
                onChange={(e) => onChangeRoomCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/90 border border-white/15 text-sm font-mono-tabular text-sky-300 uppercase focus:outline-none focus:border-sky-400"
                placeholder="KULE-01"
              />
              <button
                type="button"
                onClick={() => onJoinRoom(roomCodeInput, playerName, false)}
                className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors"
              >
                Odaya Bağlan
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <div className="text-xs text-slate-400">
              Aktif Oda: <strong className="text-white font-mono-tabular">{roomState.roomId}</strong> · Maç #{roomState.matchNumber}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Parkur Tohumu: <span className="font-mono-tabular text-emerald-300">#{roomState.course.seed}</span>
            </div>
          </div>
        </div>

        {/* Twin Glass Chamber Slots (Slot 1 Left & Slot 2 Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          {([1, 2] as const).map((slotNum) => {
            const p = roomState.players[slotNum];
            const isMe = mySlot === slotNum;
            const itemSpec = p ? WINNER_ITEMS[p.winnerItem] : WINNER_ITEMS.NONE;

            return (
              <div
                key={slotNum}
                className={`rounded-xl p-4 border transition-colors ${
                  p?.ready
                    ? 'bg-emerald-950/40 border-emerald-400/50'
                    : 'bg-slate-900/75 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    {slotNum === 1 ? 'SOL CAM ODA (1. Oyuncu)' : 'SAĞ CAM ODA (2. Oyuncu)'}
                    {isMe ? ' · SEN' : ''}
                  </span>
                  <span
                    className={`text-xs font-bold font-mono-tabular ${
                      p?.ready ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {p ? (p.ready ? 'ONAY VERİLDİ' : 'ONAY BEKLENİYOR') : 'BOŞ KOLTUK'}
                  </span>
                </div>

                {p ? (
                  <div className="flex items-center gap-3 mt-3">
                    {/* Mini SVG Egg Avatar */}
                    <svg width="42" height="48" viewBox="0 0 42 48" className="shrink-0">
                      <ellipse
                        cx="21"
                        cy="25"
                        rx="13"
                        ry="17"
                        fill={p.eggColor}
                        stroke="#090d16"
                        strokeWidth="2"
                      />
                      <circle cx="16" cy="21" r="2.2" fill="#090d16" />
                      <circle cx="26" cy="21" r="2.2" fill="#090d16" />
                      <line
                        x1="5"
                        y1="26"
                        x2="10"
                        y2="29"
                        stroke={p.limbColor}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      <line
                        x1="37"
                        y1="26"
                        x2="32"
                        y2="29"
                        stroke={p.limbColor}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>

                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold text-white truncate">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-300">
                        Özel Eşya:{' '}
                        <span className="font-semibold text-amber-300">
                          {itemSpec.name}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-slate-400 py-2">
                    2. oyuncunun aynı oda koduyla ({roomState.roomId}) girmesi bekleniyor veya yan odaya pratik rakibi çağırabilirsin.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Primary Action CTAs (Strict 2-Player Approval Gate + Instant Start with Rival Option) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onToggleReady}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                myPlayer?.ready
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {myPlayer?.ready
                ? 'Onayı Geri Çek (Bekle)'
                : 'Başlangıç Onayı Ver (HAZIRIM)'}
            </button>

            <button
              type="button"
              data-start="true"
              onClick={onAddBotPartnerAndStart}
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-sm transition-colors whitespace-nowrap shrink-0"
            >
              {bothPresent
                ? 'İki Oyuncu Onayını Tamamla & Yarışı Başlat'
                : 'Yan Cam Odaya Rakip Ekle & Hemen Başlat'}
            </button>
          </div>

          <div className="text-xs text-slate-300">
            İki oyuncu onay vermeden yarış başlamaz.
          </div>
        </div>
      </div>

      {/* Bottom Flat Control Hint Line (Offset from bottom-left chat panel so zero overlap) */}
      <div className="w-full md:pl-[400px] text-center md:text-right text-xs font-medium text-slate-200/95 hud-stroke tracking-wide">
        WASD / Yön Tuşları Hareket · Space Zıpla (Şampiyon: Çift Zıpla) · E / Shift Atılma · T Sohbet · R Kurtar · P Duraklat
      </div>
    </div>
  );
};
