# Employee Appraisal App - Completed Work Tickets

This document contains a comprehensive list of all completed tasks and features for the Employee Appraisal Application. These can be imported directly into project management tools (like Jira, Linear, or Trello) as individual tickets or stories.

---

## UI Changes (Theming & Layout)

### Ticket 1: Implement "Pure White" Theme UI
**Description**: 
- Removed all greyish background tints, radial gradients, and blueish glows.
- Replaced dark mode fallback colors with a purely white base in light mode.
- Ensured strong contrast for borders and essential shadows.

### Ticket 2: Update Application Branding & Logo
**Description**: 
- Replaced the generic app logo image with a clean "EAA" text-based logo.
- Styled the new logo with purple tint and appropriate spacing in the sidebar.

### Ticket 3: Refine and Scale Down UI Elements
**Description**: 
- Globally reduced the size of UI components across CSS (`index.css`, `Login.css`, etc.) and JSX inline styles.
- Shrunk border-radii (from 24px to 12px), reduced padding, tightened margins, and scaled down font sizes to create a compact, professional dashboard.
- Shrunk sidebar width and top navigation bar height to increase screen real estate.

### Ticket 4: Implement Custom High-Visibility Scrollbars
**Description**: 
- Styled browser default scrollbars to be thin, custom, and match the application's colour scheme (purple thumb, subtle track).
- Ensured scrollbars appear gracefully inside large text areas (e.g., Self Review feedback) and tables.

---

## Core Features & Navigation

### Ticket 5: Remove "My Goals" Feature
**Description**:
- Completely removed the "My Goals & Objectives" feature from the application.
- Stripped the module from the sidebar navigation, user dashboard routing, and removed all calculations reliant on goal completion status.

### Ticket 6: Update Appraisal Scoring Logic (90/10 Split)
**Description**:
- Re-engineered the application's scoring formulas.
- Removed legacy "Technical" and "Behavioral" average calculations.
- Implemented new calculation: Final Score = 90% Manager Assessment (`sub_rating`) + 10% HR Assessment (`hr_rating`).

### Ticket 7: Refactor Employee Results Dashboard
**Description**:
- Updated the "Results" dashboard for employees.
- Removed outdated Technical/Behavioral progress bars.
- Implemented a clear display of the new 90/10 scoring breakdown showing Manager Rating and HR Rating contributions to the final score.

---

## Database Changes (Supabase)

### Ticket 8: Extend Evaluation Schema for New Ratings
**Description**:
- Added `final_rating` (textual classification like "Outstanding") to the `evaluations` table.
- Added `sub_rating` (numeric score out of 5) to the `evaluations` table to support the 90% manager weight.

### Ticket 9: Fix Legacy Column Constraints on Evaluations
**Description**:
- Identified that database `NOT NULL` constraints on deprecated columns (`work_performance_rating`, `behavioral_rating`, `hr_rating`) were causing evaluations to fail to save.
- Executed `fix_eval_constraints.sql` to drop `NOT NULL` constraints on these legacy columns to restore save functionality.

### Ticket 10: Fix Row Level Security (RLS) for Deletion
**Description**:
- Fixed constraints preventing HR and Admins from deleting evaluation cycles.
- Updated `ON DELETE CASCADE` rules and RLS policies on related tables (evaluations, self_reviews, cycle_employees) via `fix_rls_delete.sql`.

---

## Evaluation & Review Flows

### Ticket 11: Implement Validation Alerts for Self Review
**Description**:
- Added strict form validation to `SelfReview.jsx`.
- If an employee clicks "Submit" without filling required competencies or providing sufficient length examples (min 20 characters), fields are highlighted in red and an alert modal notifies the user of incomplete sections.

### Ticket 12: Add "Manager Perspective" Read-Only View
**Description**:
- Updated `Evaluate.jsx` so managers can view the employee's self-review inputs (achievements, learning goals, feedback) directly alongside their own evaluation form for side-by-side comparison.

### Ticket 13: Implement Draft Locking Mechanism
**Description**:
- Implemented logic where saving a draft of a Self Review or Manager Evaluation "locks" the form fields.
- Styled locked textareas to have 60% opacity gray text, while strictly maintaining the consistent white/purple background container styles.
- Replaced `disabled` HTML attributes with `readOnly` to prevent native browser styling interference.

### Ticket 14: Implement "Edit Draft" Functionality
**Description**:
- Added an "Edit Review" / "Edit Evaluation" button visible only when viewing a locked draft.
- Clicking the button unlocks the form, restores text color, and allows the user to continue working before re-saving or fully submitting.

---

## HR & Admin Tools

### Ticket 15: Add Cycle Selection Filter to HR Reports
**Description**:
- Added a dropdown selector to the HR Reports page.
- Allowed HR personnel to filter charts and aggregate metrics by specific appraisal cycle periods rather than lumping all historical data together.

### Ticket 16: Normalize HR & Admin Role Visibility
**Description**:
- Fixed database querying logic in `AppContext.jsx` to ensure users with the "HR" role have the exact same visibility scope as "Admin" users.
- Ensured HR can see all performance metrics across teams, view rejected evaluations smoothly, and access organization-wide report data.

### Ticket 17: Update HR Approvals Live Score Preview
**Description**:
- Refactored the HR Approvals screen to preview the newly implemented 90/10 scoring system in real-time.
- Updated the UI so HR can input their 10% assessment and immediately see how it impacts the pending final score before executing the final approval.

---

## Bug Fixes & Stabilization

### Ticket 18: Fix Evaluation Database Save Failures (Data Match)
**Description**:
- Fixed a critical crashing bug where manager evaluations threw 500 errors.
- Resolved by casting the newly added `sub_rating` directly to a numeric float instead of attempting to AES encrypt it before inserting into a `DECIMAL` database column.

### Ticket 19: Fix UI Breakage on Viewport Resize
**Description**:
- Corrected CSS flexbox and container limitations.
- Prevented form boxes and textareas from overflowing visually breaking their background wrappers when the browser window was resized smaller.

---

## DevOps & Deployment

### Ticket 20: Prepare Render Deployment Scripts
**Description**:
- Generated a `Dockerfile` utilizing Node.js and Nginx for production serving.
- Created `.dockerignore` to streamline build sizes.
- Detailed the process of connecting the GitHub repo to Render and setting up environment variables via `render_deployment_guide.md`.
