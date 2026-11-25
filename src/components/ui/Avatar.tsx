import { Emoji } from "./Emoji";

/**
 * Pastille de joueur : avatar sur un disque à la couleur du joueur.
 * `size` = diamètre en px. `dimmed` : joueur déconnecté.
 */
export function Avatar({
  avatar,
  color,
  size = 48,
  dimmed = false,
  className = "",
}: {
  avatar: string;
  color?: string;
  size?: number;
  dimmed?: boolean;
  className?: string;
}) {
  const border = size >= 44 ? 3 : 2;
  return (
    <span
      className={`grid flex-none place-items-center rounded-full border-ink ${className}`}
      style={{
        width: size,
        height: size,
        borderWidth: border,
        background: color ?? "var(--color-paper-2)",
        filter: dimmed ? "grayscale(1)" : undefined,
        opacity: dimmed ? 0.55 : undefined,
      }}
    >
      <Emoji id={avatar} size={Math.round(size * 0.66)} />
    </span>
  );
}
