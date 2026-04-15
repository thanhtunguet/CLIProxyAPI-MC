import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { IconChevronDown, IconSearch } from '@/components/ui/icons';
import styles from './ModelSelector.module.scss';

export interface ModelGroup {
  provider: string;
  models: string[];
}

interface ModelSelectorProps {
  value: string;
  groups: readonly ModelGroup[];
  onChange: (model: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const VIEWPORT_MARGIN = 8;
const DROPDOWN_OFFSET = 6;
const DROPDOWN_MAX_HEIGHT = 320;
const DROPDOWN_Z_INDEX = 2010;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const resolveDropdownStyle = (element: HTMLElement): CSSProperties => {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(rect.width, Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2));
  const left = clamp(
    rect.left,
    VIEWPORT_MARGIN,
    Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN)
  );
  const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_MARGIN - DROPDOWN_OFFSET;
  const spaceAbove = rect.top - VIEWPORT_MARGIN - DROPDOWN_OFFSET;
  const direction =
    spaceBelow >= DROPDOWN_MAX_HEIGHT || spaceBelow >= spaceAbove ? 'down' : 'up';
  const maxHeight = Math.max(
    0,
    Math.min(DROPDOWN_MAX_HEIGHT, direction === 'down' ? spaceBelow : spaceAbove)
  );

  return direction === 'down'
    ? {
        position: 'fixed',
        top: rect.bottom + DROPDOWN_OFFSET,
        left,
        width,
        maxHeight,
        zIndex: DROPDOWN_Z_INDEX,
      }
    : {
        position: 'fixed',
        bottom: viewportHeight - rect.top + DROPDOWN_OFFSET,
        left,
        width,
        maxHeight,
        zIndex: DROPDOWN_Z_INDEX,
      };
};

const flattenModels = (groups: readonly ModelGroup[]): Array<{ model: string; provider: string }> => {
  const result: Array<{ model: string; provider: string }> = [];
  for (const group of groups) {
    for (const model of group.models) {
      result.push({ model, provider: group.provider });
    }
  }
  return result;
};

export function ModelSelector({
  value,
  groups,
  onChange,
  placeholder,
  disabled = false,
}: ModelSelectorProps) {
  const { t } = useTranslation();
  const selectId = useId();
  const listboxId = `${selectId}-listbox`;
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [search, setSearch] = useState('');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);
  const isOpen = open && !disabled;

  const flatModels = useMemo(() => flattenModels(groups), [groups]);

  const filteredFlatModels = useMemo(() => {
    if (!search.trim()) return flatModels;
    const lowerSearch = search.toLowerCase();
    return flatModels.filter(
      (item) =>
        item.model.toLowerCase().includes(lowerSearch) ||
        item.provider.toLowerCase().includes(lowerSearch)
    );
  }, [flatModels, search]);

  // Group filtered results back by provider
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const providerMap = new Map<string, string[]>();
    for (const item of filteredFlatModels) {
      const existing = providerMap.get(item.provider) ?? [];
      existing.push(item.model);
      providerMap.set(item.provider, existing);
    }
    return Array.from(providerMap.entries()).map(([provider, models]) => ({
      provider,
      models,
    }));
  }, [groups, filteredFlatModels, search]);

  const allFilteredModels = useMemo(() => flattenModels(filteredGroups), [filteredGroups]);

  const selectedIndex = useMemo(
    () => allFilteredModels.findIndex((item) => item.model === value),
    [allFilteredModels, value]
  );

  const resolvedHighlightedIndex =
    highlightedIndex >= 0
      ? highlightedIndex
      : selectedIndex >= 0
        ? selectedIndex
        : allFilteredModels.length > 0
          ? 0
          : -1;

  const displayText = value || placeholder || t('playground.select_model');

  const updateDropdownStyle = useCallback(() => {
    if (!wrapRef.current) return;
    setDropdownStyle(resolveDropdownStyle(wrapRef.current));
  }, []);

  const scheduleDropdownStyleUpdate = useCallback(() => {
    if (typeof window === 'undefined') return;
    updateDropdownStyle();
  }, [updateDropdownStyle]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setHighlightedIndex(-1);
      return;
    }
    updateDropdownStyle();
    window.addEventListener('resize', scheduleDropdownStyleUpdate);
    window.addEventListener('scroll', scheduleDropdownStyleUpdate, true);
    return () => {
      window.removeEventListener('resize', scheduleDropdownStyleUpdate);
      window.removeEventListener('scroll', scheduleDropdownStyleUpdate, true);
    };
  }, [isOpen, scheduleDropdownStyleUpdate, updateDropdownStyle]);

  useEffect(() => {
    if (!open || disabled) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [disabled, open]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || resolvedHighlightedIndex < 0) return;
    const highlightedOption = document.getElementById(`${selectId}-option-${resolvedHighlightedIndex}`);
    highlightedOption?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, resolvedHighlightedIndex, selectId]);

  const commitSelection = useCallback(
    (model: string) => {
      onChange(model);
      setOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement | HTMLInputElement>) => {
      if (disabled) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev < allFilteredModels.length - 1 ? prev + 1 : prev
          );
          return;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          return;
        case 'Enter': {
          event.preventDefault();
          if (resolvedHighlightedIndex >= 0 && allFilteredModels[resolvedHighlightedIndex]) {
            commitSelection(allFilteredModels[resolvedHighlightedIndex].model);
          }
          return;
        }
        case 'Escape':
          setOpen(false);
          return;
        case 'Tab':
          setOpen(false);
          return;
        default:
          break;
      }
    },
    [allFilteredModels, commitSelection, disabled, resolvedHighlightedIndex]
  );

  const dropdown =
    isOpen && dropdownStyle
      ? createPortal(
          <div
            ref={dropdownRef}
            className={styles.dropdown}
            id={listboxId}
            role="listbox"
            style={dropdownStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.searchWrap}>
              <IconSearch size={14} className={styles.searchIcon} />
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder={t('playground.search_model')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className={styles.list}>
              {filteredGroups.length === 0 ? (
                <div className={styles.empty}>{t('playground.no_models')}</div>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.provider} className={styles.group}>
                    <div className={styles.groupHeader}>{group.provider}</div>
                    {group.models.map((model) => {
                      const globalIndex = allFilteredModels.findIndex(
                        (item) => item.model === model && item.provider === group.provider
                      );
                      const active = model === value;
                      const highlighted = globalIndex === resolvedHighlightedIndex;
                      return (
                        <button
                          key={model}
                          id={`${selectId}-option-${globalIndex}`}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={`${styles.option} ${active ? styles.optionActive : ''} ${highlighted ? styles.optionHighlighted : ''}`.trim()}
                          onMouseEnter={() => setHighlightedIndex(globalIndex)}
                          onClick={() => commitSelection(model)}
                        >
                          {model}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className={styles.wrap}>
        <button
          id={selectId}
          type="button"
          className={styles.trigger}
          onClick={disabled ? undefined : () => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          disabled={disabled}
        >
          <span className={styles.triggerText}>
            {displayText}
          </span>
          <span className={styles.triggerIcon} aria-hidden="true">
            <IconChevronDown size={14} />
          </span>
        </button>
      </div>
      {dropdown}
    </>
  );
}
