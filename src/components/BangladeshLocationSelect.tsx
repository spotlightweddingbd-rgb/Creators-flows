import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Check, X, Globe, ChevronDown } from 'lucide-react';
import {
  BANGLADESH_DIVISIONS,
  ALL_BANGLADESH_DISTRICTS,
  ALL_BANGLADESH_OPTION,
} from '../utils/bangladeshLocations';

interface MultiLocationSelectProps {
  mode: 'multiple';
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
}

interface SingleLocationSelectProps {
  mode: 'single';
  selected: string;
  onChange: (selected: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
}

type BangladeshLocationSelectProps = MultiLocationSelectProps | SingleLocationSelectProps;

export const BangladeshLocationSelect: React.FC<BangladeshLocationSelectProps> = (props) => {
  const { mode, label, placeholder, helperText } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMultiple = mode === 'multiple';
  const selectedList = isMultiple ? (props.selected as string[]) : [];
  const selectedSingle = !isMultiple ? (props.selected as string) : '';

  const isAllBangladeshSelected = selectedList.includes(ALL_BANGLADESH_OPTION);

  const handleToggleMultiple = (loc: string) => {
    if (!isMultiple) return;
    if (loc === ALL_BANGLADESH_OPTION) {
      if (isAllBangladeshSelected) {
        props.onChange([]);
      } else {
        props.onChange([ALL_BANGLADESH_OPTION]);
      }
      return;
    }

    let next = selectedList.filter((item) => item !== ALL_BANGLADESH_OPTION);
    if (next.includes(loc)) {
      next = next.filter((item) => item !== loc);
    } else {
      next.push(loc);
    }
    props.onChange(next);
  };

  const handleSelectSingle = (loc: string) => {
    if (isMultiple) return;
    props.onChange(loc);
    setIsOpen(false);
  };

  const handleSelectDivisionAll = (divisionDistricts: string[]) => {
    if (!isMultiple) return;
    let next = selectedList.filter((item) => item !== ALL_BANGLADESH_OPTION);
    const allPresent = divisionDistricts.every((d) => next.includes(d));

    if (allPresent) {
      next = next.filter((d) => !divisionDistricts.includes(d));
    } else {
      divisionDistricts.forEach((d) => {
        if (!next.includes(d)) next.push(d);
      });
    }
    props.onChange(next);
  };

  const q = searchQuery.toLowerCase().trim();

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-bold text-neutral-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>{label}</span>
          </span>
          {isMultiple && selectedList.length > 0 && (
            <span className="text-[10px] text-amber-400 font-mono">
              {isAllBangladeshSelected ? 'Nationwide Coverage' : `${selectedList.length} Selected`}
            </span>
          )}
        </label>
      )}

      {/* Trigger Button / Input Bar */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-left text-xs transition flex items-center justify-between gap-2 shadow-inner focus:outline-none focus:border-rose-500/80"
        >
          <div className="flex-1 flex flex-wrap items-center gap-1.5 overflow-hidden">
            {isMultiple ? (
              selectedList.length === 0 ? (
                <span className="text-neutral-500">
                  {placeholder || 'Select coverage locations across Bangladesh...'}
                </span>
              ) : isAllBangladeshSelected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs">
                  <Globe className="w-3.5 h-3.5" />
                  <span>All Bangladesh (Nationwide)</span>
                </span>
              ) : (
                selectedList.slice(0, 3).map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-[11px]"
                  >
                    <span>{loc}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleMultiple(loc);
                      }}
                      className="text-neutral-400 hover:text-rose-400 p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </span>
                )).concat(
                  selectedList.length > 3 ? (
                    <span
                      key="more"
                      className="px-2 py-0.5 rounded-lg bg-neutral-900 text-neutral-400 text-[11px]"
                    >
                      +{selectedList.length - 3} more
                    </span>
                  ) : []
                )
              )
            ) : (
              <span className={selectedSingle ? 'text-white font-medium' : 'text-neutral-500'}>
                {selectedSingle || placeholder || 'Select district in Bangladesh...'}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-2 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl backdrop-blur-xl space-y-3 animate-in fade-in max-h-96 flex flex-col">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search districts (e.g. Dhaka, Chittagong, Sylhet)..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick All Bangladesh button for multi-select */}
            {isMultiple && !searchQuery && (
              <button
                type="button"
                onClick={() => handleToggleMultiple(ALL_BANGLADESH_OPTION)}
                className={`w-full p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                  isAllBangladeshSelected
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span>All Bangladesh (Nationwide Availability)</span>
                </div>
                {isAllBangladeshSelected && <Check className="w-4 h-4 text-amber-400" />}
              </button>
            )}

            {/* Grouped Division & District List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {BANGLADESH_DIVISIONS.map((div) => {
                const filteredDistricts = div.districts.filter(
                  (d) => !q || d.toLowerCase().includes(q) || div.name.toLowerCase().includes(q)
                );

                if (filteredDistricts.length === 0) return null;

                const allInDivisionSelected =
                  isMultiple && filteredDistricts.every((d) => selectedList.includes(d));

                return (
                  <div key={div.id} className="space-y-1.5">
                    {/* Division Header */}
                    <div className="flex items-center justify-between px-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      <span>{div.name}</span>
                      {isMultiple && (
                        <button
                          type="button"
                          onClick={() => handleSelectDivisionAll(div.districts)}
                          className="text-[10px] text-rose-400 hover:text-rose-300 capitalize font-medium"
                        >
                          {allInDivisionSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                    </div>

                    {/* Districts Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {filteredDistricts.map((district) => {
                        const isSelected = isMultiple
                          ? isAllBangladeshSelected || selectedList.includes(district)
                          : selectedSingle === district;

                        return (
                          <button
                            key={district}
                            type="button"
                            onClick={() => {
                              if (isMultiple) {
                                handleToggleMultiple(district);
                              } else {
                                handleSelectSingle(district);
                              }
                            }}
                            className={`p-2 rounded-xl border text-left transition flex items-center justify-between gap-1 text-[11px] ${
                              isSelected
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-200 font-bold'
                                : 'bg-neutral-950/80 border-neutral-800/80 hover:border-neutral-700 text-neutral-300'
                            }`}
                          >
                            <span className="truncate">{district}</span>
                            {isSelected && <Check className="w-3 h-3 text-rose-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer with Done button */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-neutral-500">
                All 64 districts across 8 divisions
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {helperText && <p className="text-[10px] text-neutral-500">{helperText}</p>}
    </div>
  );
};
