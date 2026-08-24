const EMOJIS = [
  '⭐', '🔥', '💪', '🏃', '📚', '💧', '🍎', '🧘',
  '🎯', '⚔️', '🛡️', '🧙', '⚡', '🌙', '☀️', '🌱',
  '🏋️', '🧠', '😴', '💰', '🎨', '🎸', '🧹', '🚿',
  '🦷', '🚶', '🚴', '🏊', '⛰️', '✍️', '💻', '📵',
  '🙏', '❤️', '🌿', '🕯️', '📈', '💊', '🐕', '🐈',
  '🥗', '🍳', '☕', '🚭', '🛌', '💸', '🎮', '👟',
];

export function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={e}
            className={`text-lg rounded-md py-1 ${e === value ? 'bg-indigo-600 ring-2 ring-amber-300' : 'hover:bg-slate-800'}`}
            onClick={() => onChange(e)}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xl">{value}</span>
        <input
          className="input text-center text-lg"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 4))}
          maxLength={4}
          placeholder="…"
          aria-label="custom"
        />
      </div>
    </div>
  );
}