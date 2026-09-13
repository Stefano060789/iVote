// Fixed vocabulary of accessibility tags an admin can attach to a QR "info" card (wayfinding,
// exhibit, or amenity cards - see Robin's guide for museums/hotels/cities). Kept deliberately
// small and structured instead of another free-text field, so a voter can actually scan for
// "is this accessible to me?" at a glance. Must match the CHECK constraint in
// supabase/20260921_info_item_accessibility_tags.sql - update both together.

export const ACCESSIBILITY_TAGS = [
  { value: "wheelchair_accessible", label: "Wheelchair accessible", icon: "\u267f" },
  { value: "audio_description", label: "Audio description available", icon: "\ud83d\udd0a" },
  { value: "sign_language", label: "Sign language available", icon: "\ud83e\udd1f" },
  { value: "large_print", label: "Large print available", icon: "\ud83d\udd21" },
  { value: "hearing_loop", label: "Hearing loop", icon: "\ud83c\udfa7" },
  { value: "service_animals_welcome", label: "Service animals welcome", icon: "\ud83d\udc15\u200d\ud83e\uddba" }
];

export function accessibilityTagLabel(value) {
  return ACCESSIBILITY_TAGS.find((tag) => tag.value === value)?.label || value;
}

export function accessibilityTagIcon(value) {
  return ACCESSIBILITY_TAGS.find((tag) => tag.value === value)?.icon || "";
}
