/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Sparkles,
  Utensils,
  Palette,
  Music,
  Mail,
  MessageCircle,
  Star,
  Plus,
  Trash2,
  Search,
  X,
  Maximize2,
  RotateCw,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { IdeaItem } from '../types/plan.ts';

interface IdeasTabProps {
  ideas: IdeaItem[];
  eventTitle: string;
  onUpdateIdeas?: (newIdeas: IdeaItem[]) => void;
  language?: 'en' | 'hi' | 'te' | 'bn';
  onOpenInvitationDesigner?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  theme: <Sparkles className="w-4 h-4 text-[#F5A623]" />,
  menu: <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
  decor: <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
  entertainment: <Music className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
  invitation: <Mail className="w-4 h-4 text-[#E05D5D]" />,
  rsvp: <MessageCircle className="w-4 h-4 text-emerald-500" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  theme: 'Theme & Mood',
  menu: 'Menu & Live Food Stations',
  decor: 'Decor & Ambience',
  entertainment: 'Entertainment & Games',
  invitation: 'Invitation Card Copy',
  rsvp: 'WhatsApp RSVP Template',
};

export const IdeasTab: React.FC<IdeasTabProps> = ({
  ideas,
  eventTitle,
  onUpdateIdeas,
  language = 'en',
  onOpenInvitationDesigner,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState<number | null>(null);
  const translate = async (index: number, text: string) => {
    setTranslating(index);
    try {
      const response = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language }) });
      const data = await response.json();
      if (response.ok && data.translation) setTranslations((prev) => ({ ...prev, [index]: data.translation }));
    } finally { setTranslating(null); }
  };

  // New Idea Form State
  const [newCategory, setNewCategory] = useState<string>('entertainment');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');

  // Image Concept Art Generation State
  const [generatingImageIndex, setGeneratingImageIndex] = useState<number | null>(null);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<{ url: string; title: string; prompt?: string } | null>(null);
  const [isCustomVisualModalOpen, setIsCustomVisualModalOpen] = useState<boolean>(false);
  const [customVisualPrompt, setCustomVisualPrompt] = useState<string>('');
  const [customVisualCategory, setCustomVisualCategory] = useState<string>('decor');
  const [customVisualAspect, setCustomVisualAspect] = useState<'4:3' | '16:9' | '1:1'>('16:9');
  const [isGeneratingCustomVisual, setIsGeneratingCustomVisual] = useState<boolean>(false);

  const handleGenerateImageForIdea = async (index: number, idea: IdeaItem) => {
    if (!onUpdateIdeas || generatingImageIndex !== null) return;
    setGeneratingImageIndex(index);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${idea.title}: ${idea.description}`,
          theme: eventTitle,
          category: idea.category,
          aspectRatio: '16:9',
        }),
      });
      const data = await response.json();
      if (response.ok && data.imageUrl) {
        const updated = ideas.map((item, i) =>
          i === index
            ? {
                ...item,
                image_url: data.imageUrl,
                image_prompt: data.prompt,
                image_source: data.source,
              }
            : item
        );
        onUpdateIdeas(updated);
      }
    } catch (e) {
      console.error('Image generation failed', e);
    } finally {
      setGeneratingImageIndex(null);
    }
  };

  const handleGenerateCustomVisual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVisualPrompt.trim() || !onUpdateIdeas || isGeneratingCustomVisual) return;
    setIsGeneratingCustomVisual(true);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customVisualPrompt.trim(),
          theme: eventTitle,
          category: customVisualCategory,
          aspectRatio: customVisualAspect,
        }),
      });
      const data = await response.json();
      if (response.ok && data.imageUrl) {
        const newIdea: IdeaItem = {
          id: `concept-art-${Date.now()}`,
          category: customVisualCategory,
          title: customVisualPrompt.slice(0, 50).trim(),
          description: customVisualPrompt.trim(),
          favorited: true,
          image_url: data.imageUrl,
          image_prompt: data.prompt,
          image_source: data.source,
        };
        onUpdateIdeas([...ideas, newIdea]);
        setIsCustomVisualModalOpen(false);
        setCustomVisualPrompt('');
      }
    } catch (e) {
      console.error('Custom visual creation failed', e);
    } finally {
      setIsGeneratingCustomVisual(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2200);
  };

  const handleToggleFavorite = (index: number) => {
    if (!onUpdateIdeas) return;
    const updated = ideas.map((item, i) =>
      i === index ? { ...item, favorited: !item.favorited } : item
    );
    onUpdateIdeas(updated);
  };

  const handleDeleteIdea = (index: number) => {
    if (!onUpdateIdeas) return;
    const target = ideas[index];
    if (confirm(`Remove idea "${target.title}"?`)) {
      const updated = ideas.filter((_, i) => i !== index);
      onUpdateIdeas(updated);
    }
  };

  const handleAddCustomIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !onUpdateIdeas) return;

    const newIdea: IdeaItem = {
      id: `custom-idea-${Date.now()}`,
      category: newCategory,
      title: newTitle.trim(),
      description: newDescription.trim(),
      favorited: true, // Auto-favorite custom ideas
    };

    onUpdateIdeas([...ideas, newIdea]);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewCategory('entertainment');
  };

  const categories = Array.from(new Set(ideas.map((i) => i.category.toLowerCase())));
  const favoritedCount = ideas.filter((i) => i.favorited).length;

  // Filter & Search
  const filteredIdeas = ideas
    .map((item, originalIndex) => ({ ...item, originalIndex }))
    .filter((item) => {
      // Favorites filter
      if (selectedFilter === 'favorites') {
        if (!item.favorited) return false;
      } else if (selectedFilter !== 'all') {
        if (item.category?.toLowerCase() !== selectedFilter.toLowerCase()) return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white/80 dark:bg-[#23152C]/90 p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
              Curated Celebration Inspirations
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Personalized themes, delicacies, decor accents, and ready-to-share copy for {eventTitle}.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onOpenInvitationDesigner && (
              <button
                type="button"
                onClick={onOpenInvitationDesigner}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-[#B45309] dark:text-[#F5A623] border border-amber-500/30 transition-colors cursor-pointer shadow-xs"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Design Invitation Card</span>
              </button>
            )}

            {onUpdateIdeas && (
              <button
                type="button"
                onClick={() => setIsCustomVisualModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition-colors cursor-pointer shadow-xs"
                title="Generate custom visual concepts with Imagen 3"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Imagen Decor Studio</span>
              </button>
            )}

            {onUpdateIdeas && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#3B1F4A] hover:bg-[#4E2B61] text-white dark:bg-[#F5A623] dark:hover:bg-[#E0961E] dark:text-stone-950 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Idea</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar with Favorites Button */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1" role="group" aria-label="Filter ideas by category">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            aria-pressed={selectedFilter === 'all'}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 font-semibold'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            All ({ideas.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('favorites')}
            aria-pressed={selectedFilter === 'favorites'}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer ${
              selectedFilter === 'favorites'
                ? 'bg-[#B45309] text-white dark:bg-[#F5A623] dark:text-stone-950 font-semibold shadow-xs'
                : 'bg-amber-500/10 text-[#B45309] dark:text-[#F5A623] hover:bg-amber-500/20'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${favoritedCount > 0 ? 'fill-current' : ''}`} />
            <span>Shortlisted ({favoritedCount})</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedFilter(cat)}
              aria-pressed={selectedFilter === cat}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl capitalize transition-colors cursor-pointer ${
                selectedFilter === cat
                  ? 'bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 font-semibold'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search themes, menu items, games, or wording..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Ideas Cards Grid */}
      {filteredIdeas.length === 0 ? (
        <div className="bg-white dark:bg-[#23152C] rounded-2xl border border-stone-200 dark:border-stone-800 p-8 text-center space-y-2">
          <p className="font-serif text-base font-bold text-stone-700 dark:text-stone-300">
            No inspirations match your filter
          </p>
          <p className="text-xs text-stone-400">
            {selectedFilter === 'favorites'
              ? 'Click the star icon on any card to save your favorite inspirations.'
              : 'Try clearing your search query or switching to All.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedFilter('all');
            }}
            className="mt-2 text-xs font-semibold text-[#F5A623] hover:underline cursor-pointer"
          >
            Show All Inspirations
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIdeas.map((idea) => {
            const index = idea.originalIndex;
            const categoryKey = idea.category?.toLowerCase() || 'theme';
            const icon = CATEGORY_ICONS[categoryKey] || <Sparkles className="w-4 h-4 text-[#F5A623]" />;
            const label = CATEGORY_LABELS[categoryKey] || idea.category;
            const isTextCopyable = categoryKey === 'invitation' || categoryKey === 'rsvp';
            const copyId = `idea-${index}`;
            const isCopied = copiedId === copyId;
            const isFavorited = !!idea.favorited;

            return (
              <div
                key={copyId}
                className={`bg-white dark:bg-[#23152C] rounded-2xl border p-5 shadow-xs hover:shadow-md transition-colors flex flex-col justify-between ${
                  isFavorited
                    ? 'border-[#F5A623]/60 bg-amber-500/[0.015] dark:border-[#F5A623]/40'
                    : 'border-stone-200/90 dark:border-stone-800'
                } ${isTextCopyable ? 'md:col-span-2' : ''}`}
              >
                <div className="space-y-2.5">
                  {/* Category Badge & Action Buttons */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      {icon}
                      <span>{label}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Favorite / Star Button */}
                      {onUpdateIdeas && (
                        <button
                          onClick={() => handleToggleFavorite(index)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isFavorited
                              ? 'text-[#F5A623] bg-amber-500/10'
                              : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
                          }`}
                          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`w-4 h-4 ${isFavorited ? 'fill-[#F5A623]' : ''}`} />
                        </button>
                      )}

                      {/* Delete Custom / Idea Button */}
                      {onUpdateIdeas && (
                        <button
                          onClick={() => handleDeleteIdea(index)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                          title="Remove idea"
                          aria-label={`Remove ${idea.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Ready-to-copy Button for Template cards */}
                      {isTextCopyable && (
                        <button
                          onClick={() => handleCopy(idea.description, copyId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-[#F5A623]/20 hover:text-[#3B1F4A] dark:hover:text-[#F5A623] text-stone-700 dark:text-stone-300 transition-colors cursor-pointer ml-1"
                          aria-label={`Copy ${label}`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Template</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Concept Visual Banner */}
                  {idea.image_url && (
                    <div className="relative group overflow-hidden rounded-xl border border-stone-200/80 dark:border-stone-800 bg-stone-950 aspect-video mb-2.5">
                      <img
                        src={idea.image_url}
                        alt={idea.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => setSelectedLightboxImage({ url: idea.image_url!, title: idea.title, prompt: idea.image_prompt || idea.description })}
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-stone-900/85 backdrop-blur-xs text-[10px] font-bold text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-xs">
                        <Sparkles className="w-3 h-3" />
                        <span>{idea.image_source === 'imagen' ? 'Imagen Concept' : 'Themed Concept'}</span>
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setSelectedLightboxImage({ url: idea.image_url!, title: idea.title, prompt: idea.image_prompt || idea.description })}
                          className="p-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-900 text-white backdrop-blur-xs text-xs cursor-pointer"
                          title="View full-size visual"
                          aria-label="View full-size visual"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        {onUpdateIdeas && (
                          <button
                            type="button"
                            onClick={() => handleGenerateImageForIdea(index, idea)}
                            disabled={generatingImageIndex === index}
                            className="p-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-900 text-white backdrop-blur-xs text-xs cursor-pointer"
                            title="Regenerate visual"
                            aria-label="Regenerate visual"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${generatingImageIndex === index ? 'animate-spin text-amber-400' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <h4 className="font-serif text-base font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
                    {idea.title}
                  </h4>

                  <p
                    className={`text-xs text-stone-700 dark:text-stone-300 leading-relaxed ${
                      isTextCopyable
                        ? 'whitespace-pre-wrap font-mono bg-stone-50 dark:bg-stone-950 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800'
                        : ''
                    }`}
                  >
                    {translations[index] || idea.description}
                  </p>
                  {isTextCopyable && language !== 'en' && (
                    <button onClick={() => translate(index, idea.description)} className="text-xs text-[#1a56db] hover:underline" disabled={translating === index}>
                      {translating === index ? 'Translating…' : 'Translate this message'}
                    </button>
                  )}
                </div>

                {!isTextCopyable && (
                  <div className="pt-3 mt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500">
                    <div className="flex items-center gap-2">
                      {onUpdateIdeas && !idea.image_url && (
                        <button
                          type="button"
                          onClick={() => handleGenerateImageForIdea(index, idea)}
                          disabled={generatingImageIndex === index}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/25 transition-colors cursor-pointer"
                          title="Generate concept visual using Imagen"
                          aria-label={`Visualize decor for ${idea.title}`}
                        >
                          <Sparkles className={`w-3 h-3 text-purple-500 ${generatingImageIndex === index ? 'animate-spin' : ''}`} />
                          <span>{generatingImageIndex === index ? 'Generating visual…' : 'Visualize Decor'}</span>
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(`${idea.title}: ${idea.description}`, copyId)}
                      className="inline-flex items-center gap-1 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer font-medium"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Idea</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Idea Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#23152C] rounded-3xl p-6 max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
                Add Custom Celebration Idea
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomIdea} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                >
                  <option value="theme">Theme & Mood</option>
                  <option value="menu">Menu & Live Food Stations</option>
                  <option value="decor">Decor & Ambience</option>
                  <option value="entertainment">Entertainment & Games</option>
                  <option value="invitation">Invitation Card Copy</option>
                  <option value="rsvp">WhatsApp RSVP Template</option>
                  <option value="ceremony">Ceremony & Rituals</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flashmob Entry for Cousins, Chai & Jalebi Midnight Bar"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Details / Template Copy *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the experience or paste the invitation/RSVP wording..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 font-semibold hover:opacity-90 cursor-pointer shadow-xs"
                >
                  Save Idea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedLightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedLightboxImage.title}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-stone-900 rounded-3xl overflow-hidden border border-stone-800 shadow-2xl space-y-4 p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 text-white">
              <div>
                <h3 className="font-serif text-lg font-bold">{selectedLightboxImage.title}</h3>
                {selectedLightboxImage.prompt && (
                  <p className="text-xs text-stone-400 mt-0.5 max-w-xl">{selectedLightboxImage.prompt}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedLightboxImage.url}
                  download={`utsav_decor_${selectedLightboxImage.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 transition-colors cursor-pointer"
                  aria-label="Download concept visual"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedLightboxImage(null)}
                  className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center">
              <img
                src={selectedLightboxImage.url}
                alt={selectedLightboxImage.title}
                className="max-h-[70vh] w-auto object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Decor Studio Modal */}
      {isCustomVisualModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagen Decor Concept Studio"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white dark:bg-[#23152C] rounded-3xl p-6 max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#3B1F4A] dark:text-[#FFF8EE]">
                    Imagen Decor Studio
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Generate custom architectural celebration artwork
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomVisualModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                aria-label="Close studio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateCustomVisual} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Decor or Theme Concept Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Royal Rajasthani Mandap with floating lotus candles, brass bells, cascading red roses and fairy light canopy..."
                  value={customVisualPrompt}
                  onChange={(e) => setCustomVisualPrompt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Category
                  </label>
                  <select
                    value={customVisualCategory}
                    onChange={(e) => setCustomVisualCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                  >
                    <option value="decor">Decor & Ambience</option>
                    <option value="theme">Theme & Mood</option>
                    <option value="mandap">Mandap & Stage</option>
                    <option value="entrance">Entrance & Pathway</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Aspect Ratio
                  </label>
                  <select
                    value={customVisualAspect}
                    onChange={(e) => setCustomVisualAspect(e.target.value as '4:3' | '16:9' | '1:1')}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#F5A623]"
                  >
                    <option value="16:9">16:9 (Cinematic Banner)</option>
                    <option value="4:3">4:3 (Standard)</option>
                    <option value="1:1">1:1 (Square)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsCustomVisualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customVisualPrompt.trim() || isGeneratingCustomVisual}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B1F4A] text-white dark:bg-[#F5A623] dark:text-stone-950 font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingCustomVisual ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingCustomVisual ? 'Generating with Imagen...' : 'Generate & Add to Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
