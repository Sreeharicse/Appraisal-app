# Employee Appraisal Application 

## 1. Overview
The Employee Appraisal Application is a comprehensive, multi-tiered performance management system built with React. It orchestrates the entire employee evaluation lifecycle, from HR initiating an appraisal cycle to employees submitting self-reviews, managers providing evaluations, and HR/Admin overseeing the final approvals and performance analytics.

The application manages data centrally using a robust React Context (`AppContext.jsx`) which interfaces with dynamic mock data or a Supabase backend.

---

## 2. User Roles & Hierarchy

The application strictly enforces role-based access control (RBAC), determining what features, data, and workflows a user can access.

*   **👑 Admin**
    *   **Access:** Highest level. Has full visibility across the entire system.
    *   **Key Capabilities:** Creating users, managing system configurations, editing master question banks, overriding cycle restrictions, and viewing all analytics (including the Company Organizational Chart).
*   **🏢 HR (Human Resources)**
    *   **Access:** System administrators for the appraisal lifecycle.
    *   **Key Capabilities:** 
        *   **Cycles:** Creating, opening, and closing appraisal cycles.
        *   **Question Sets:** Creating specific questionnaire templates.
        *   **Designation Mapping:** Assigning specific question sets to specific job roles/departments.
        *   **Approvals:** Reviewing manager evaluations for regular employees and giving final authorization before scores are locked.
*   **👔 Manager**
    *   **Access:** Oversees their direct reporting team.
    *   **Key Capabilities:** Viewing team reports, reviewing employee self-assessments, and submitting official manager evaluations with numerical ratings and qualitative feedback.
*   **👥 Employee**
    *   **Access:** Focused self-service portal.
    *   **Key Capabilities:** Submitting self-reviews (achievements, learnings, feedback) during active cycles and viewing their own historical performance records once approved by HR.

---

## 3. Core Workflows

### Phase 1: Setup & Configuration (HR & Admin)
Before an appraisal process begins, the initial framework is configured:
1.  **Question Bank Management:** Admins/HR create and manage lists of questions categorized by sections (e.g., Performance, Leadership, Core Values).
2.  **Question Set Creation:** HR groups specific questions into named sets (e.g., "Senior Developer Q1 2024").
3.  **Designation Mapping:** HR maps these Question Sets to specific roles/departments to guarantee employees receive the correct, role-specific questionnaire.

### Phase 2: Cycle Initialization (HR)
1.  **Create Cycle:** HR creates an Appraisal Cycle with a name, start date, and end date.
2.  **Activate Cycle:** Only **one cycle** can be active at a time. Activating a cycle dynamically assigns it to eligible employees across the organization.

### Phase 3: The Appraisal Process (Employee → Manager → HR)
1.  **Self-Review (Employee):**
    *   Employees are notified of an active cycle via their Dashboard.
    *   They fill out their role-specific questionnaire. They can save as "Draft" or "Submit".
    *   *System Check:* Hard validations prevent submitting empty surveys.
2.  **Manager Evaluation (Manager):**
    *   Once the employee submits, the Manager is notified.
    *   The Manager reviews the employee's self-assessment answers side-by-side with the evaluation form.
    *   The Manager scores the employee across various competencies, provides an "Overall Final Rating", and submits the evaluation.
3.  **Final Authorization (HR / Admin):**
    *   The evaluation goes to the HR queue (if evaluating a regular employee) or directly to Admin (if a Manager or HR peer was evaluated).
    *   HR reviews the Manager's submitted ratings. They can either **Approve** (locking in the score) or **Reject** (sending it back to the Manager for revision).

### Phase 4: Closure & Analytics (Admin / HR)
1.  **Cycle Closure:**
    *   When the cycle end date arrives, HR initiates closure.
    *   *Safety Check:* The system scans for unsubmitted drafts, missing evaluations, or pending approvals. It displays a **Warning Modal** listing incomplete items. If confirmed, the cycle is locked. No further edits are possible.
2.  **Performance Reports:**
    *   Data is synthesized into analytics: Histogram score distributions and Performance Category pie charts.
    *   **Org Chart (Admin Only):** A visual CSS bracket-graph representing the company hierarchy (Admin → HR → Manager → Employee) with real-time pulsing status badges (Approved, Pending HR, Ready for Eval) overlaid on each node.

---

## 4. Key Component Architecture

*   **`AppContext.jsx` (The Brain):** Manages the entire global state. It contains all mutation functions (`submitSelfReview`, `submitEvaluation`, `closeCycle`) and ensures validation logic (e.g., preventing actions on closed cycles). It processes notifications dynamically based on role routing.
*   **`Cycles.jsx`:** The HR dashboard for managing time-bound appraisal events. Contains the crucial safety checks for validating incomplete tasks before closing a cycle permanently.
*   **`Approvals.jsx`:** The HR/Admin interface for reviewing manager-submitted evaluations. Parses calculated scores, final ratings, and sub-ratings into visual badges.
*   **`OrgChart.jsx`:** Admin-exclusive visualization tool. Uses recursive CSS trees and `evaluations` data context to render a live, animated organizational graph with integrated appraisal tracking.
*   **`QuestionBank.jsx` & `DesignationMapping.jsx`:** Core tools for generating flexible, role-specific surveys securely.

## 5. Security & Data Integrity Validations
*   **Closed Cycle Lockout:** If `activeCycle.status === 'closed'`, the system hard-disables all input fields, buttons, and evaluation modals for Employees, Managers, and HR, guaranteeing historical data integrity.
*   **Notification Routing:** Regular employee evaluation alerts route to HR and Admin. HR/Manager peer-evaluation alerts route *strictly* to Admin, preventing conflict-of-interest visibility.
*   **Duplicate Designation Mapping Protection:** Prevents assigning multiple active question sets to the same department/role combination simultaneously.
