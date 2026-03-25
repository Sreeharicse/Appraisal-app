-- ===========================================================
-- seed_senior_set.sql — Run this in Supabase SQL Editor
-- ===========================================================

INSERT INTO public.question_sets (name, description, questions) VALUES
(
    'Senior-Level Appraisal Set',
    'Specialized set for Senior, Lead, and Manager roles focusing on strategy, influence, and mentorship.',
    '[
        {"id":"q1","label":"How have you contributed to long-term business or team strategy?","desc":"Describe your involvement in strategic planning and how your actions align with broader organizational goals.","section":"Strategic Thinking"},
        {"id":"q2","label":"Can you describe a decision you made that had a significant impact on the organization?","desc":"Reflect on a high-stakes decision, the factors you considered, and the resulting organizational outcome.","section":"Strategic Thinking"},
        {"id":"q3","label":"How do you mentor or develop junior team members?","desc":"Share specific examples of how you have coached others, managed their growth, and improved team capability.","section":"Leadership & Ownership"},
        {"id":"q4","label":"Describe a situation where you took full ownership of a critical project.","desc":"Walk through a project where you were the primary driver, from inception to delivery or resolution.","section":"Leadership & Ownership"},
        {"id":"q5","label":"How do you make high-impact decisions with limited information?","desc":"Explain your framework for navigating ambiguity and making responsible choices when data is incomplete.","section":"Decision Making"},
        {"id":"q6","label":"Can you share an example where your decision prevented a major issue?","desc":"Describe a time you foresaw a risk and made a pre-emptive decision that saved time, resources, or reputation.","section":"Decision Making"},
        {"id":"q7","label":"What process improvements or innovations have you introduced recently?","desc":"Highlight new tools, workflows, or ideas you implemented to drive efficiency or quality.","section":"Innovation & Improvement"},
        {"id":"q8","label":"How do you identify opportunities for improvement within your team or project?","desc":"Describe how you spot bottlenecks or inefficiencies and the steps you take to address them.","section":"Innovation & Improvement"},
        {"id":"q9","label":"How do you handle conflicts between teams or stakeholders?","desc":"Share an example of a difficult negotiation or conflict you resolved to ensure project alignment.","section":"Collaboration & Influence"},
        {"id":"q10","label":"How do you influence decisions without direct authority?","desc":"Describe how you use persuasion, data, and relationship-building to align others with your vision.","section":"Collaboration & Influence"},
        {"id":"q11","label":"What measurable results have you delivered in the last cycle?","desc":"Focus on KPIs, cost savings, revenue growth, or technical milestones that demonstrate your impact.","section":"Performance & Results"},
        {"id":"q12","label":"How do you ensure consistent high performance under pressure?","desc":"Describe your strategies for maintaining quality and team morale during high-intensity periods.","section":"Performance & Results"}
    ]'::jsonb
);
