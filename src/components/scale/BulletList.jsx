import React from 'react';

export default function BulletList({ items }) {
  return (
    <ul className="space-y-2 text-sm text-stone-700 list-disc pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}