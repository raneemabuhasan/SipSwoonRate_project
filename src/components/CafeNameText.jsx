import React from 'react';

export default function CafeNameText({ name }) {
  return String(name || '').split(/(&)/g).map((part, index) => (
    part === '&'
      ? <span className="plain-ampersand" key={`${part}-${index}`}>{part}</span>
      : part
  ));
}
