# Godwit accessibility audit

Date: 2026-09-17

This is a WCAG 2.2 Level AA engineering audit of the main Godwit journeys. It is not a
legal certification or an accessibility statement from an accredited testing body.

## Scope

- Public landing, voting, results, and thank-you flows
- Registration, login, poll creation, and poll editing
- Admin dashboard, QR campaign wizard, Customer Connection, and Feedback
- Light and dark themes
- Desktop and mobile layouts

## Checks performed

- Keyboard-focus styling is present for links, buttons, form controls, and custom controls.
- Form controls use visible labels or accessible names.
- Images were checked for alternative text; decorative brand marks use empty alt text.
- Headings and landmark labels were checked on the production admin page.
- The QR wizard now exposes a modal dialog name, modal state, and an accessible close button.
- Cookie preferences are exposed as a labelled region.
- Reduced-motion users are supported with a global `prefers-reduced-motion` rule.
- The QR wizard's light-theme button contrast was corrected to use readable light text on navy.
- Existing automated tests and the production build were run after the changes.

## Result

No blocking accessibility defect was found in the inspected journeys. The most important
issues found were fixed in the code:

1. Keyboard focus was not consistently visible on non-form controls.
2. The QR wizard lacked dialog semantics and an accessible close-button name.
3. Reduced-motion preferences were not respected globally.
4. A QR wizard light-theme button used insufficiently contrasting green text on dark blue.

## Follow-up

For a formal conformance claim, repeat this audit with NVDA or VoiceOver, browser zoom at
200%, keyboard-only navigation on every route, and an automated axe/Lighthouse scan in CI.
Those tools are not currently part of the repository, so this document records the manual
engineering audit rather than claiming third-party certification.
