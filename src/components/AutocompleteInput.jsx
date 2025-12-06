// src/components/AutocompleteInput.jsx
import { useState, useRef, useEffect } from 'react';

function AutocompleteInput({
  value,
  onChange,
  options = [],
  placeholder = '',
  disabled = false,
  loading = false,
  listId = '',
  className = '',
  helperText = '',
  onSelect = null,
}) {
  console.log('AutocompleteInput rendered with value:', value, 'options count:', Array.isArray(options) ? options.length : 0, 'onChange type:', typeof onChange);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const [internalValue, setInternalValue] = useState(value ?? '');

  // Sync internal value with prop value
  useEffect(() => {
    if (value !== internalValue) {
      console.log('Syncing internal value from prop:', value);
      setInternalValue(value ?? '');
      if (inputRef.current) {
        inputRef.current.value = value ?? '';
      }
    }
  }, [value]);

  // Ensure options is an array
  useEffect(() => {
    const validOptions = Array.isArray(options) ? options : [];
    const searchValue = internalValue || value || '';
    if (!searchValue || searchValue.trim() === '') {
      setFilteredOptions(validOptions.slice(0, 50));
    } else {
      const searchTerm = searchValue.toLowerCase().trim();
      try {
        const filtered = validOptions
          .filter(opt => {
            const optName = typeof opt === 'string' ? opt : opt.name || opt.value || '';
            return optName.toLowerCase().includes(searchTerm);
          })
          .slice(0, 50);
        setFilteredOptions(filtered);
      } catch (e) {
        console.error("Error filtering autocomplete options:", e);
        setFilteredOptions([]);
      }
    }
  }, [internalValue, value, options]);

  // Close suggestions when clicking outside
  useEffect(() => {
    if (!showSuggestions) return;

    const handleClickOutside = (event) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    // Use a small delay to avoid immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  const getOptionValue = (option) => {
    if (typeof option === 'string') return option;
    return option.name || option.value || '';
  };

  const handleInputChange = (e) => {
    console.log('🔥 AutocompleteInput handleInputChange EVENT FIRED!', e.type, 'value:', e.target.value, 'event:', e);
    e.stopPropagation();
    // DO NOT preventDefault - it blocks input!
    const newValue = e.target.value;
    console.log('AutocompleteInput handleInputChange - extracted value:', newValue, 'type:', typeof newValue);
    // Always call onChange to allow typing - this is critical for controlled inputs
    if (onChange && typeof onChange === 'function') {
      try {
        console.log('Calling onChange with string value:', newValue);
        onChange(newValue);
        console.log('onChange called successfully with:', newValue);
      } catch (error) {
        console.error('Error calling onChange:', error);
      }
    } else {
      console.warn('onChange is not provided or not a function. onChange:', onChange);
    }
    // Show suggestions when typing or when field is empty
    setShowSuggestions(true);
    setHighlightedIndex(-1);
  };

  const handleSelect = (option) => {
    console.log('AutocompleteInput handleSelect called:', option);
    const optionValue = getOptionValue(option);
    console.log('Option value:', optionValue);
    
    // Update the input's value directly (since it's uncontrolled)
    if (inputRef.current) {
      inputRef.current.value = optionValue;
    }
    
    // Update internal state
    setInternalValue(optionValue);
    
    // Call onChange to notify parent
    if (onChange && typeof onChange === 'function') {
      console.log('Calling onChange with selected value:', optionValue);
      onChange(optionValue);
    }
    
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    
    if (onSelect && typeof onSelect === 'function') {
      onSelect(option);
    }
  };

  const handleKeyDown = (e) => {
    console.log('AutocompleteInput handleKeyDown:', e.key, 'showSuggestions:', showSuggestions);
    // Only handle navigation keys, allow all other keys to work normally
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      if (!showSuggestions || filteredOptions.length === 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setShowSuggestions(true);
        }
        // Don't prevent default for other keys - let them through
        return;
      }

      // Only prevent default for navigation keys when suggestions are shown
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            handleSelect(filteredOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          break;
        default:
          break;
      }
    }
    // For all other keys (letters, numbers, etc.), do nothing - let them work normally
    // The onChange handler will be called by the browser
  };

  return (
    <div className={`relative ${className}`} style={{ zIndex: showSuggestions ? 50 : 'auto' }}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          defaultValue={value ?? ''}
          onChange={handleInputChange}
          onInput={handleInputChange}
          onFocus={(e) => {
            console.log('🔥 AutocompleteInput onFocus fired');
            e.stopPropagation();
            if (!disabled) {
              setShowSuggestions(true);
              // Reset filtered options to show all when focusing
              const validOptions = Array.isArray(options) ? options : [];
              setFilteredOptions(validOptions.slice(0, 50));
            }
          }}
          onClick={(e) => {
            console.log('🔥 AutocompleteInput onClick fired');
            e.stopPropagation();
            if (!disabled && inputRef.current) {
              inputRef.current.focus();
              setShowSuggestions(true);
              // Reset filtered options to show all when clicking
              const validOptions = Array.isArray(options) ? options : [];
              setFilteredOptions(validOptions.slice(0, 50));
            }
          }}
          onKeyDown={(e) => {
            console.log('🔥 AutocompleteInput onKeyDown fired:', e.key);
            handleKeyDown(e);
          }}
          onKeyUp={(e) => {
            console.log('🔥 AutocompleteInput onKeyUp fired:', e.key, 'target.value:', e.target.value, 'current value prop:', value);
            // Fallback: manually trigger onChange if it didn't fire
            if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Meta', 'Shift', 'Control', 'Alt', 'Tab'].includes(e.key)) {
              // Use requestAnimationFrame to ensure DOM has updated
              requestAnimationFrame(() => {
                const currentValue = inputRef.current?.value || '';
                const propValue = value ?? '';
                console.log('🔥 onKeyUp requestAnimationFrame: currentValue:', currentValue, 'propValue:', propValue);
                if (currentValue !== propValue && onChange && typeof onChange === 'function') {
                  console.log('🔥 onKeyUp: value mismatch detected, manually calling onChange with:', currentValue);
                  onChange(currentValue);
                }
              });
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={false}
          autoComplete="off"
          tabIndex={disabled ? -1 : 0}
          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-text'
          }`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
          </div>
        )}
      </div>

      {helperText && (
        <p className="text-xs text-gray-500 mt-1">{helperText}</p>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredOptions.length > 0 && !disabled && (
        <div
          ref={suggestionsRef}
          className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.stopPropagation();
            console.log('🔥 Suggestions container clicked');
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            console.log('🔥 Suggestions container mousedown');
          }}
        >
          {filteredOptions.map((option, index) => {
            const optionValue = getOptionValue(option);
            const isHighlighted = index === highlightedIndex;
            return (
              <div
                key={typeof option === 'string' ? option : option.code || option.id || index}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input from losing focus
                  e.stopPropagation();
                  console.log('🔥 Suggestion mousedown:', option);
                  handleSelect(option);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log('🔥 Suggestion clicked:', option);
                  handleSelect(option);
                }}
                className={`px-4 py-2 cursor-pointer transition-colors ${
                  isHighlighted
                    ? 'bg-red-50 text-red-700'
                    : 'hover:bg-gray-50 text-gray-900'
                }`}
              >
                {optionValue}
              </div>
            );
          })}
        </div>
      )}

      {/* Fallback datalist for better browser compatibility */}
      {listId && Array.isArray(options) && options.length > 0 && (
        <datalist id={listId}>
          {options.slice(0, 100).map((option, index) => {
            const optionValue = getOptionValue(option);
            return (
              <option
                key={typeof option === 'string' ? option : option.code || option.id || index}
                value={optionValue}
              />
            );
          })}
        </datalist>
      )}
    </div>
  );
}

export default AutocompleteInput;

