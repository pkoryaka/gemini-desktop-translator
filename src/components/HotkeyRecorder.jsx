import React, { useState, useEffect, useRef } from 'react';
import { Keyboard, X, RotateCcw } from 'lucide-react';

/**
 * Converts browser KeyboardEvent into an Electron-compatible Accelerator string
 * Uses physical e.code mapping so it works across all keyboard layouts (Ukrainian, Russian, Spanish, English, etc.)
 */
export function formatElectronAccelerator(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  const code = e.code;
  let keyName = '';

  if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'].includes(code)) {
    return null; // Only modifier pressed so far
  }

  // Map physical code to Electron Accelerator string
  if (code.startsWith('Key')) {
    keyName = code.replace('Key', ''); // 'A' .. 'Z'
  } else if (code.startsWith('Digit')) {
    keyName = code.replace('Digit', ''); // '0' .. '9'
  } else if (code.startsWith('Numpad') && code.length === 7) {
    keyName = 'num' + code.replace('Numpad', '');
  } else if (/^F\d+$/.test(code)) {
    keyName = code; // 'F1' .. 'F12'
  } else if (code === 'Space') {
    keyName = 'Space';
  } else if (code === 'Tab') {
    keyName = 'Tab';
  } else if (code === 'Enter') {
    keyName = 'Enter';
  } else if (code === 'Escape') {
    keyName = 'Escape';
  } else if (code === 'Backspace') {
    keyName = 'Backspace';
  } else if (code === 'Delete') {
    keyName = 'Delete';
  } else if (code === 'Insert') {
    keyName = 'Insert';
  } else if (code === 'Home') {
    keyName = 'Home';
  } else if (code === 'End') {
    keyName = 'End';
  } else if (code === 'PageUp') {
    keyName = 'PageUp';
  } else if (code === 'PageDown') {
    keyName = 'PageDown';
  } else if (code === 'ArrowUp') {
    keyName = 'Up';
  } else if (code === 'ArrowDown') {
    keyName = 'Down';
  } else if (code === 'ArrowLeft') {
    keyName = 'Left';
  } else if (code === 'ArrowRight') {
    keyName = 'Right';
  } else if (e.key && e.key.length === 1) {
    keyName = e.key.toUpperCase();
  } else {
    keyName = e.key;
  }

  if (!keyName) return null;

  parts.push(keyName);
  return parts.join('+');
}

export function formatDisplayShortcut(accelerator) {
  if (!accelerator) return 'None';
  return accelerator
    .replace(/CommandOrControl/g, 'Ctrl')
    .replace(/Key/g, '')
    .replace(/\+/g, ' + ');
}

export function HotkeyRecorder({
  label,
  value,
  onChange,
  otherHotkey,
  defaultKey,
  icon: Icon,
  description
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentPressed, setCurrentPressed] = useState('');
  const buttonRef = useRef(null);

  const isConflict = value && otherHotkey && value.toLowerCase() === otherHotkey.toLowerCase();

  const handleKeyDown = (e) => {
    if (!isRecording) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setIsRecording(false);
      setCurrentPressed('');
      return;
    }

    const accelerator = formatElectronAccelerator(e);
    if (accelerator) {
      // Must contain at least one modifier
      const hasModifier = e.ctrlKey || e.altKey || e.shiftKey || e.metaKey;
      if (!hasModifier) {
        setCurrentPressed('Hold Ctrl, Alt, or Shift + Key');
        return;
      }

      onChange(accelerator);
      setIsRecording(false);
      setCurrentPressed('');
    } else {
      // Show intermediate modifier feedback
      const mods = [];
      if (e.ctrlKey || e.metaKey) mods.push('Ctrl');
      if (e.altKey) mods.push('Alt');
      if (e.shiftKey) mods.push('Shift');
      setCurrentPressed(mods.join(' + ') + ' + ...');
    }
  };

  const handleKeyUp = (e) => {
    if (isRecording && ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      setCurrentPressed('');
    }
  };

  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('keyup', handleKeyUp, true);
      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('keyup', handleKeyUp, true);
      };
    }
  }, [isRecording]);

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="form-label" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {Icon && <Icon size={14} />}
          <span>{label}</span>
        </label>
        {defaultKey && value !== defaultKey && (
          <button
            type="button"
            onClick={() => onChange(defaultKey)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.7rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
            title="Reset to default"
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            setIsRecording(!isRecording);
            setCurrentPressed('');
          }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isRecording ? 'rgba(99, 102, 241, 0.25)' : 'var(--bg-input)',
            border: isRecording
              ? '1px solid #6366f1'
              : isConflict
              ? '1px solid #f87171'
              : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none',
            boxShadow: isRecording ? '0 0 12px rgba(99, 102, 241, 0.4)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={15} color={isRecording ? '#a5b4fc' : '#94a3b8'} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: isRecording ? '#a5b4fc' : isConflict ? '#f87171' : '#fff'
            }}>
              {isRecording
                ? currentPressed || 'Press key combination (e.g. Ctrl + Alt + K)...'
                : formatDisplayShortcut(value)}
            </span>
          </div>

          <span style={{
            fontSize: '0.72rem',
            padding: '3px 8px',
            borderRadius: '4px',
            background: isRecording ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
            color: '#fff',
            fontWeight: 600
          }}>
            {isRecording ? 'Listening...' : 'Click to Record'}
          </span>
        </button>

        {value && (
          <button
            type="button"
            className="btn-icon"
            onClick={() => onChange('')}
            title="Disable / Clear hotkey"
            style={{ width: '38px', height: '38px', flexShrink: 0 }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {isConflict && (
        <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600, marginTop: '2px' }}>
          ⚠️ Conflict: This shortcut is already used by the other action. Please choose a different key.
        </span>
      )}

      {description && !isConflict && (
        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
          {description}
        </span>
      )}
    </div>
  );
}
