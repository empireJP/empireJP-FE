import { hashHue, initials } from "@/lib/format";

export function Avatar({
  name,
  size = 28,
  ring = true,
  src,
}: {
  name: string;
  size?: number;
  ring?: boolean;
  src?: string;
}) {
  const ringCls = ring ? "ring-2 ring-surface" : "";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full object-cover ${ringCls}`}
        title={name}
      />
    );
  }

  const hue = hashHue(name);
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-white select-none ${ringCls}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${
          (hue + 40) % 360
        } 70% 46%))`,
      }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  names,
  extra = 0,
  size = 28,
}: {
  names: string[];
  extra?: number;
  size?: number;
}) {
  const shown = names.slice(0, 5);
  return (
    <div className="flex -space-x-2">
      {shown.map((n, i) => (
        <div key={n + i} style={{ zIndex: shown.length - i }}>
          <Avatar name={n} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <span
          className="inline-grid place-items-center rounded-full bg-surface-3 text-fg font-semibold ring-2 ring-surface"
          style={{ width: size, height: size, fontSize: size * 0.34 }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
