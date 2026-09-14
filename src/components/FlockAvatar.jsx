// Renders one flock member's illustrated mark at a consistent size, on a dark navy circular
// badge (echoing the gold-on-navy Godwit logo treatment already used in the top nav bar). The
// birds' source SVGs are a thin-lined gold gradient with no fill background, which reads poorly
// against the light cream/lavender workspace theme (see .workspace-page overrides in
// style.css) - the navy badge behind each one restores contrast everywhere it's used: tab bar,
// "on duty" banner, quick-action cards, "Meet your flock" grid, and the public Landing page.
// Falls back to the emoji `icon` (no badge) only if a bird has no `image`.
export default function FlockAvatar({ bird, size = 40, className = "" }) {
  if (!bird) return null;

  if (!bird.image) {
    return (
      <span className={className} style={{ fontSize: Math.round(size * 0.8), lineHeight: 1 }} aria-hidden="true">
        {bird.icon}
      </span>
    );
  }

  const imageSize = Math.round(size * 0.76);

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        background: "linear-gradient(160deg, #12274a, #071021)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }}
    >
      <img
        src={bird.image}
        alt=""
        aria-hidden="true"
        style={{ width: imageSize, height: imageSize, objectFit: "contain", display: "block" }}
      />
    </span>
  );
}
