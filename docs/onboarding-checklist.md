# Onboarding Checklist

Unified checklist for Intelligent Onboarding™ and Customer Success Center™.

## Steps

1. Complete Profile  
2. Scan Website  
3. Connect Analytics  
4. Connect Search Console  
5. Generate First Growth Report  
6. Review First Fix Path™  
7. Invite Team  
8. Complete Setup  

Progress % = done / non-dismissed steps.

## Implementation

`getIntelligentChecklist` in `src/lib/onboarding/checklist.ts` — used by:

- `GET /api/onboarding`  
- `getOnboardingState` (Success Center) when Intelligent Onboarding is enabled  

Dismissals: `checklistDismissed` / `remindersDismissed` on `workspace_onboarding`.

## Reminders

When status is `skipped` or incomplete (not `completed`), `OnboardingReminders` on the dashboard shows a dismissible contextual banner.

## Replay / reset

- **Replay** — status `in_progress`, step `welcome` (keeps reports)  
- **Reset** — clears discovery/analysis/report/thread links; does not delete reports  
- Available from Settings and Success Center  

## Celebration

When checklist hits 100%, `celebrateComplete` is true until `celebration_ack` with key `checklist_complete`. First scan uses celebration key `first_scan`.
