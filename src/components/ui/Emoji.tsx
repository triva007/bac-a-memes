import { emojiUrl } from "@/lib/content/emoji-lite";

/** Emoji 3D (image). `size` en px CSS. Décoratif par défaut. */
export function Emoji({
  id,
  size = 28,
  className,
  alt = "",
}: {
  id: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={emojiUrl(id)}
      width={size}
      height={size}
      alt={alt}
      draggable={false}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ width: size, height: size, flex: "none", objectFit: "contain" }}
    />
  );
}
