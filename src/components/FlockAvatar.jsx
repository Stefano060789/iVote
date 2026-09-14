// Renders one flock member's illustrated mark at a consistent size. All source images in
// src/assets/birds/*.svg share the same 1024x1024 square canvas and gold-gradient style as
// src/assets/godwit-mark.svg, so sizing them through this single component (rather than each
// call site picking its own width/height) keeps every appearance - tab bar, "on duty" banner,
// quick-action cards, "Meet your flock" grid - visually consistent. Falls back to the emoji
// `icon` only if a bird has no `image` (shouldn't happen for any current flock member).
export default function FlockAvatar({ bird, size = 40, className = "" }) {
  if (!bird) return null;

  if (!bird.image) {
    return (
      <span className={className} style={{ fontSize: Math.round(size * 0.8), lineHeight: 1 }} aria-hidden="true">
        {bird.icon}
      </span>
    );
  }

  return (
    <img
      src={bird.image}
      alt=""
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", flexShrink: 0 }}
    />
  );
}
