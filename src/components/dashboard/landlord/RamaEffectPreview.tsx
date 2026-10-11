import React from 'react';

const hidden = new Set([
  'step_id',
  'instruction',
  'relay_instruction',
  'requires_own_confirm',
]);
export default function RamaEffectPreview({
  value,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
}) {
  if (value === null || value === undefined || value === '') return null;
  if (depth > 6)
    return <span>See the linked record for additional details.</span>;
  if (Array.isArray(value))
    return (
      <ul className="space-y-1">
        {value.map((item, index) => (
          <li key={index}>
            <RamaEffectPreview value={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  if (typeof value === 'object') {
    const fields = value as Record<string, unknown>;
    if ('$step' in fields)
      return (
        <span>
          From the preceding {String(fields.$step).replaceAll('_', ' ')} action
        </span>
      );
    return (
      <dl className="space-y-1 border-l border-slate-200 pl-2">
        {Object.entries(fields)
          .filter(([key]) => !hidden.has(key))
          .map(([key, item]) => (
            <div key={key} className="break-words">
              <dt className="font-medium capitalize">
                {key.replaceAll('_', ' ')}
              </dt>
              <dd className="text-slate-600">
                <RamaEffectPreview value={item} depth={depth + 1} />
              </dd>
            </div>
          ))}
      </dl>
    );
  }
  return (
    <span>
      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
    </span>
  );
}
