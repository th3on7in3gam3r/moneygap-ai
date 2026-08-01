# UI Guidelines

## Enhance, do not redesign

- Keep existing routes, dashboard shell, navigation, and layouts
- Keep design tokens in `src/app/globals.css` (accent, gap, surfaces, fonts)
- Improve density and clarity of MoneyGap findings — do not rebuild chrome

## Patterns allowed

- Cards (for interactive findings)
- Progress bars (scores)
- Expandable sections / drawers (Action Center assets, checklists)
- Priority / confidence / ROI badges
- Estimate cards with AI Estimate label
- Roadmap timeline
- Report-scoped Advisor chat
- Charts only when they clarify opportunity (not decoration)

## Patterns to avoid

- Plain dense tables as the primary finding UI
- SEO jargon without business impact
- Blank loading screens
- Purple-template aesthetics (preserve MoneyGap brand system)
- Auto-publishing generated content

## Components

Prefer extending:

- `src/components/money-gap/*`
- `src/components/action-center/*`
- `src/components/intelligence/report-view.tsx`
- Existing `Badge`, `Card`, `Button`

## Accessibility

- Keyboard-expandable cards
- Clear labels on estimates and priorities
- Sufficient contrast in light and dark mode
