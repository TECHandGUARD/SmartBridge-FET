import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const OTHER_VALUE = '__smartbridge_custom_other__';

/**
 * Select with an explicit Other option. Custom values are emitted through the
 * same onValueChange callback as predefined values so existing form submit
 * and persistence logic continues to work unchanged.
 */
export function SelectWithOther({
  value = '',
  onValueChange,
  options = [],
  placeholder = 'Select an option',
  otherLabel = 'Other (type your own)',
  disabled = false,
  className,
  inputPlaceholder = 'Enter your option',
}) {
  const [customValue, setCustomValue] = useState('');
  const [isEnteringOther, setIsEnteringOther] = useState(false);
  const optionValues = options.map(option => typeof option === 'string' ? option : option.value);
  const isCustomValue = Boolean(value) && !optionValues.includes(value);

  useEffect(() => {
    if (isCustomValue) {
      setCustomValue(value);
      setIsEnteringOther(true);
    } else if (!value) {
      setCustomValue('');
      setIsEnteringOther(false);
    }
  }, [value, isCustomValue]);

  const handleSelect = nextValue => {
    if (nextValue === OTHER_VALUE) {
      setIsEnteringOther(true);
      setCustomValue('');
      onValueChange?.('');
      return;
    }
    setIsEnteringOther(false);
    setCustomValue('');
    onValueChange?.(nextValue);
  };

  const handleCustomChange = nextValue => {
    setCustomValue(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <div className="space-y-2">
      <Select value={isEnteringOther ? OTHER_VALUE : value} onValueChange={handleSelect} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => {
            const optionValue = typeof option === 'string' ? option : option.value;
            const optionLabel = typeof option === 'string' ? option : option.label;
            return <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>;
          })}
          {isCustomValue && !isEnteringOther && <SelectItem value={value}>{value}</SelectItem>}
          <SelectItem value={OTHER_VALUE}>{otherLabel}</SelectItem>
        </SelectContent>
      </Select>
      {isEnteringOther && (
        <div className="space-y-1">
          <Input
            value={customValue}
            onChange={event => handleCustomChange(event.target.value)}
            placeholder={inputPlaceholder}
            aria-label={inputPlaceholder}
            disabled={disabled}
            autoFocus
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground">Enter the option you want to use.</p>
        </div>
      )}
    </div>
  );
}
