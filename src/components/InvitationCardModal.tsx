/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Sparkles,
  Palette,
  Calendar,
  MapPin,
  Users,
  Eye,
} from 'lucide-react';
import type { EventPlan, EventDay } from '../types/plan.ts';

interface InvitationCardModalProps {
  plan: EventPlan;
  onClose: () => void;
}

type CardTheme = 'royal' | 'marigold' | 'minimalist' | 'midnight';

interface ThemeConfig {
  name: string;
  badge: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  fontFamily: string;
}

const THEMES: Record<CardTheme, ThemeConfig> = {
  royal: {
    name: 'Royal Plum & Antique Gold',
    badge: 'Traditional & Grand',
    bgColor: '#3B1F4A',
    textColor: '#FFF8EE',
    accentColor: '#F5A623',
    borderColor: '#D4AF37',
    fontFamily: 'serif',
  },
  marigold: {
    name: 'Festive Marigold & Sunburst',
    badge: 'Haldi & Sangeet',
    bgColor: '#FFFBEB',
    textColor: '#451A03',
    accentColor: '#D97706',
    borderColor: '#F59E0B',
    fontFamily: 'serif',
  },
  minimalist: {
    name: 'Chic Cream & Charcoal',
    badge: 'Modern & Elegant',
    bgColor: '#FAF7F2',
    textColor: '#1C1917',
    accentColor: '#78716C',
    borderColor: '#D6D3D1',
    fontFamily: 'sans-serif',
  },
  midnight: {
    name: 'Midnight Starlight & Gold',
    badge: 'Cocktail & Reception',
    bgColor: '#0F172A',
    textColor: '#F8FAFC',
    accentColor: '#FBBF24',
    borderColor: '#E2E8F0',
    fontFamily: 'serif',
  },
};

export const InvitationCardModal: React.FC<InvitationCardModalProps> = ({ plan, onClose }) => {
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('royal');
  const [hostNames, setHostNames] = useState(plan.host_names || `${plan.city || 'Our'} Family & Hosts`);
  const [eventTitle, setEventTitle] = useState(plan.title || 'Celebration');
  const [venue, setVenue] = useState(plan.event_days?.[0]?.venue || `${plan.city || 'Our City'}, India`);
  const [timeStr, setTimeStr] = useState(plan.event_days?.[0]?.time_slot || '6:30 PM onwards');
  const [dressCode, setDressCode] = useState(plan.event_days?.[0]?.dress_code || plan.theme || 'Festive Indian / Indo-Western');
  const [rsvpContact, setRsvpContact] = useState('+91 98480 12345 / 98111 22334');
  const [includeMultiDay, setIncludeMultiDay] = useState(Boolean(plan.event_days && plan.event_days.length > 1));
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render Card to Canvas
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height = 1600;
    canvas.width = width;
    canvas.height = height;

    const theme = THEMES[selectedTheme];

    // 1. Background
    ctx.fillStyle = theme.bgColor;
    ctx.fillRect(0, 0, width, height);

    // 2. Decorative Double Border
    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(50, 50, width - 100, height - 100);

    ctx.lineWidth = 2;
    ctx.strokeRect(66, 66, width - 132, height - 132);

    // Corner Ornaments
    const drawCorner = (x: number, y: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = theme.accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(35, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 35);
      ctx.stroke();

      ctx.fillStyle = theme.accentColor;
      ctx.beginPath();
      ctx.arc(15, 15, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawCorner(80, 80, 0);
    drawCorner(width - 80, 80, Math.PI / 2);
    drawCorner(width - 80, height - 80, Math.PI);
    drawCorner(80, height - 80, -Math.PI / 2);

    // 3. Top Emblem / Auspicious Motif
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.accentColor;
    ctx.font = 'bold 38px serif';
    ctx.fillText('✨ ॐ / SHUBH UTSAV ✨', width / 2, 170);

    // 4. Host Invitation Line
    ctx.fillStyle = theme.textColor;
    ctx.font = '32px sans-serif';
    ctx.fillText('TOGETHER WITH THEIR FAMILIES', width / 2, 250);

    ctx.fillStyle = theme.accentColor;
    ctx.font = 'bold 44px serif';
    ctx.fillText(hostNames.toUpperCase(), width / 2, 320);

    ctx.fillStyle = theme.textColor;
    ctx.font = 'italic 32px serif';
    ctx.fillText('request the honour of your joyous presence at the celebration of', width / 2, 385);

    // 5. Celebration Title (Large Grand Type)
    ctx.fillStyle = theme.accentColor;
    ctx.font = 'bold 64px serif';
    
    // Wrap long title
    const maxTitleWidth = width - 240;
    const words = eventTitle.split(' ');
    let line = '';
    let y = 490;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTitleWidth && n > 0) {
        ctx.fillText(line.trim(), width / 2, y);
        line = words[n] + ' ';
        y += 76;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), width / 2, y);

    // Divider Line
    y += 45;
    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 160, y);
    ctx.lineTo(width / 2 + 160, y);
    ctx.stroke();

    // 6. Date & Time
    y += 85;
    ctx.fillStyle = theme.textColor;
    ctx.font = 'bold 46px serif';
    ctx.fillText(plan.event_date ? new Date(plan.event_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date of Celebration', width / 2, y);

    y += 55;
    ctx.font = '34px sans-serif';
    ctx.fillText(`Time: ${timeStr}`, width / 2, y);

    // 7. Venue
    y += 65;
    ctx.fillStyle = theme.accentColor;
    ctx.font = 'bold 36px serif';
    ctx.fillText(venue, width / 2, y);

    y += 45;
    ctx.fillStyle = theme.textColor;
    ctx.font = '30px sans-serif';
    ctx.fillText(plan.city ? `${plan.city}, India` : 'India', width / 2, y);

    // 8. Multi-Day Itinerary Block (if enabled)
    if (includeMultiDay && plan.event_days && plan.event_days.length > 0) {
      y += 80;
      ctx.fillStyle = theme.accentColor;
      ctx.font = 'bold 30px serif';
      ctx.fillText('— CELEBRATION ITINERARY —', width / 2, y);

      y += 50;
      plan.event_days.slice(0, 3).forEach((day) => {
        ctx.fillStyle = theme.textColor;
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(`${day.title}`, width / 2, y);
        y += 36;
        ctx.font = 'italic 24px serif';
        ctx.fillText(`${day.time_slot || ''} · ${day.dress_code || ''}`, width / 2, y);
        y += 46;
      });
    } else {
      // Dress Code
      y += 85;
      ctx.fillStyle = theme.accentColor;
      ctx.font = 'bold 30px serif';
      ctx.fillText('DRESS CODE', width / 2, y);
      y += 45;
      ctx.fillStyle = theme.textColor;
      ctx.font = 'italic 30px serif';
      ctx.fillText(dressCode, width / 2, y);
    }

    // 9. RSVP & Blessings Footer
    y = height - 160;
    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 200, y - 40);
    ctx.lineTo(width / 2 + 200, y - 40);
    ctx.stroke();

    ctx.fillStyle = theme.accentColor;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`RSVP: ${rsvpContact}`, width / 2, y);

    y += 42;
    ctx.fillStyle = theme.textColor;
    ctx.font = 'italic 24px serif';
    ctx.fillText('With Best Compliments from Near & Dear Ones', width / 2, y);
  };

  useEffect(() => {
    renderCanvas();
  }, [selectedTheme, hostNames, eventTitle, venue, timeStr, dressCode, rsvpContact, includeMultiDay]);

  // Download PNG file
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageUri = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const safeTitle = (eventTitle || 'celebration-invitation').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `${safeTitle}-card.png`;
    link.href = imageUri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy WhatsApp formatted text
  const handleCopyWhatsApp = () => {
    const lines = [
      `✨ *INVITATION: ${eventTitle.toUpperCase()}* ✨`,
      ``,
      `_Together with their families_`,
      `*${hostNames}*`,
      `cordially invite you to celebrate with us!`,
      ``,
      `📅 *Date:* ${plan.event_date}`,
      `⏰ *Time:* ${timeStr}`,
      `📍 *Venue:* ${venue}, ${plan.city}`,
      `👗 *Dress Code:* ${dressCode}`,
      ``,
    ];

    if (includeMultiDay && plan.event_days && plan.event_days.length > 0) {
      lines.push(`*Celebration Schedule:*`);
      plan.event_days.forEach((day: EventDay) => {
        lines.push(`• *${day.title}*: ${day.time_slot || ''} (${day.dress_code || ''})`);
      });
      lines.push(``);
    }

    lines.push(`📞 *RSVP:* ${rsvpContact}`);
    lines.push(`_Your presence and blessings will make our celebration complete!_`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invitation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white dark:bg-[#23152C] rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-[#F5A623]/20 text-[#B45309] dark:text-[#F5A623]">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="invitation-modal-title" className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                Design & Download Invitation Card
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Generate high-resolution printable invitation cards and ready-to-send WhatsApp templates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close invitation card designer"
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content: 2-Column Layout */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Customization Controls */}
          <div className="lg:col-span-5 space-y-5 text-xs">
            {/* Theme Selector */}
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-[#F5A623]" /> Choose Cultural Palette
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(THEMES) as CardTheme[]).map((key) => {
                  const t = THEMES[key];
                  const isSelected = selectedTheme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedTheme(key)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#B45309] ring-2 ring-[#B45309]/30 shadow-xs'
                          : 'border-stone-200 dark:border-stone-700 hover:border-stone-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: t.bgColor }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: t.accentColor }}
                        />
                      </div>
                      <p className="font-semibold text-stone-800 dark:text-stone-200 leading-tight">
                        {t.name}
                      </p>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400">
                        {t.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Fields */}
            <div className="space-y-3 bg-stone-50 dark:bg-stone-900/60 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Host Family / Organizers
                </label>
                <input
                  type="text"
                  value={hostNames}
                  onChange={(e) => setHostNames(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#B45309]"
                  placeholder="e.g. The Sharma & Kapur Families"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Celebration Title
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#B45309]"
                  placeholder="e.g. Sister's Retro Bollywood Sangeet"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Event Time
                  </label>
                  <input
                    type="text"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#B45309]"
                    placeholder="e.g. 6:30 PM onwards"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Dress Code
                  </label>
                  <input
                    type="text"
                    value={dressCode}
                    onChange={(e) => setDressCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#B45309]"
                    placeholder="e.g. Retro Bollywood Glamour"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Venue & Address
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#B45309]"
                  placeholder="e.g. Sea Pearl Ballroom, Vizag"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  RSVP Phone / Contacts
                </label>
                <input
                  type="text"
                  value={rsvpContact}
                  onChange={(e) => setRsvpContact(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#B45309]"
                  placeholder="e.g. +91 98480 12345"
                />
              </div>

              {plan.event_days && plan.event_days.length > 0 && (
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700 dark:text-stone-300">
                    <input
                      type="checkbox"
                      checked={includeMultiDay}
                      onChange={(e) => setIncludeMultiDay(e.target.checked)}
                      className="rounded text-[#B45309] focus:ring-[#B45309]"
                    />
                    <span>Include Multi-Day Schedule ({plan.event_days.length} days)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDownloadPNG}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#3B1F4A] hover:bg-[#2C1638] dark:bg-[#F5A623] dark:hover:bg-[#D97706] text-white dark:text-stone-950 font-bold transition-transform active:scale-98 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Card (High-Res PNG)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-stone-300 dark:border-stone-700 hover:border-[#B45309] text-stone-800 dark:text-stone-200 font-semibold transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied WhatsApp Invite!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy WhatsApp Invitation Message</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live Card Canvas Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-stone-100 dark:bg-stone-950/80 p-4 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="text-center mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 flex items-center justify-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#F5A623]" />
                Live Card Canvas Preview (1200 × 1600 px)
              </span>
            </div>

            <div className="relative shadow-2xl rounded-2xl overflow-hidden max-w-sm w-full border-4 border-white/60 dark:border-stone-800">
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                aria-label={`Invitation card preview for ${eventTitle}`}
              />
            </div>

            <p className="mt-3 text-[11px] text-stone-500 text-center">
              Crystal-clear vector quality formatted for instant WhatsApp sharing and photo paper printing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
