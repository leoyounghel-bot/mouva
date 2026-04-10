import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Input, Typography, Tabs } from 'antd';
import { Menu, Search } from 'lucide-react';
import { SidebarBody, SidebarFrame, SidebarHeader, SIDEBAR_H_PADDING_PX } from './layout.js';
import { DESIGNER_CLASSNAME } from '../../../constants.js';
import type { SidebarProps } from '../../../types.js';

const { Text } = Typography;

// Emoji data structure from index.json
interface EmojiData {
  hexcode: string;
  emoji: string;
  group: string;
  annotation: string;
}

// Category definitions with display names
const EMOJI_CATEGORIES = [
  { key: 'smileys-emotion', label: '😀 表情' },
  { key: 'people-body', label: '👋 人物' },
  { key: 'animals-nature', label: '🐱 动物' },
  { key: 'food-drink', label: '🍔 食物' },
  { key: 'travel-places', label: '✈️ 旅行' },
  { key: 'activities', label: '⚽ 活动' },
  { key: 'objects', label: '💡 物品' },
  { key: 'symbols', label: '❤️ 符号' },
  { key: 'flags', label: '🏁 旗帜' },
] as const;

// Props type for EmojiPanel
type EmojiPanelProps = Pick<SidebarProps, 'activeElements' | 'schemas' | 'changeSchemas'> & {
  onClose: () => void;
  onInsertEmoji?: (svgPath: string, annotation: string) => void;
};

const EmojiPanel = ({ onClose, onInsertEmoji }: EmojiPanelProps) => {
  const [emojis, setEmojis] = useState<EmojiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('smileys-emotion');

  // Load emoji index on mount
  useEffect(() => {
    fetch('/emojis/index.json')
      .then((res) => res.json())
      .then((data: EmojiData[]) => {
        setEmojis(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load emoji index:', err);
        setLoading(false);
      });
  }, []);

  // Filter emojis by category and search
  const filteredEmojis = useMemo(() => {
    let result = emojis.filter((e) => e.group === activeCategory);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = emojis.filter(
        (e) =>
          e.annotation.toLowerCase().includes(query) ||
          e.emoji.includes(query)
      );
    }
    
    return result.slice(0, 100); // Limit for performance
  }, [emojis, activeCategory, searchQuery]);

  // Handle emoji click - insert as SVG element
  const handleEmojiClick = useCallback((emoji: EmojiData) => {
    const svgPath = `/emojis/${emoji.hexcode}.svg`;
    
    if (onInsertEmoji) {
      onInsertEmoji(svgPath, emoji.annotation);
    } else {
      // Fallback: copy SVG path to clipboard
      navigator.clipboard.writeText(svgPath);
      console.log('Emoji SVG path copied:', svgPath);
    }
  }, [onInsertEmoji]);

  return (
    <SidebarFrame className={DESIGNER_CLASSNAME + 'emoji-panel'}>
      <SidebarHeader>
        <Button
          className={DESIGNER_CLASSNAME + 'back-button'}
          style={{
            position: 'absolute',
            left: SIDEBAR_H_PADDING_PX,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translateY(-50%)',
            top: '50%',
            paddingTop: '3px',
          }}
          onClick={onClose}
          icon={<Menu strokeWidth={1.5} size={20} />}
        />
        <Text strong style={{ textAlign: 'center', width: '100%' }}>
          Emoji 表情
        </Text>
      </SidebarHeader>
      <SidebarBody>
        {/* Search input */}
        <Input
          placeholder="搜索 emoji..."
          prefix={<Search size={16} style={{ color: '#9ca3af' }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginBottom: 12 }}
          allowClear
        />

        {/* Category tabs */}
        {!searchQuery && (
          <div style={{ marginBottom: 12 }}>
            <Tabs
              activeKey={activeCategory}
              onChange={setActiveCategory}
              size="small"
              items={EMOJI_CATEGORIES.map((cat) => ({
                key: cat.key,
                label: cat.label,
              }))}
              tabBarStyle={{ marginBottom: 8 }}
            />
          </div>
        )}

        {/* Emoji grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>
            加载中...
          </div>
        ) : filteredEmojis.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>
            未找到相关 emoji
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 4,
            }}
          >
            {filteredEmojis.map((emoji) => (
              <button
                key={emoji.hexcode}
                onClick={() => handleEmojiClick(emoji)}
                title={emoji.annotation}
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  padding: 4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <img
                  src={`/emojis/${emoji.hexcode}.svg`}
                  alt={emoji.annotation}
                  style={{ width: 28, height: 28 }}
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* Footer info */}
        <div
          style={{
            marginTop: 16,
            padding: 8,
            background: '#f9fafb',
            borderRadius: 6,
            fontSize: 11,
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          OpenMoji 16.0 · CC BY-SA 4.0 · 4,292 emojis
        </div>
      </SidebarBody>
    </SidebarFrame>
  );
};

export default EmojiPanel;
