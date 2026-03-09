import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PERFORMANCE_CATEGORIES } from '../data/constants';

const AppContext = createContext(null);

export function calculateScore(goals, goalRatings, workRating, behaviorRating) {
    const totalWeight = goals.reduce((sum, g) => sum + g.weightage, 0);
    if (totalWeight === 0) return 0;
    let goalScore = 0;
    goals.forEach(g => {
        const r = goalRatings[g.id] || 0;
        goalScore += (r / 5) * 100 * (g.weightage / totalWeight);
    });
    const workScore = (workRating / 5) * 100;
    const behaviorScore = (behaviorRating / 5) * 100;
    return Math.round(goalScore * 0.6 + workScore * 0.2 + behaviorScore * 0.2);
}

export function getCategory(score) {
    for (const cat of PERFORMANCE_CATEGORIES) {
        if (score >= cat.min) return cat;
    }
    return PERFORMANCE_CATEGORIES[PERFORMANCE_CATEGORIES.length - 1];
}

export function AppProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [cycles, setCycles] = useState([]);
    const [goals, setGoals] = useState([]);
    const [selfReviews, setSelfReviews] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);

    // ──── Fetch all data from Supabase ────
    const fetchAllData = useCallback(async () => {
        const [
            { data: profilesData },
            { data: cyclesData },
            { data: goalsData },
            { data: reviewsData },
            { data: evalsData },
            { data: approvalsData },
        ] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('cycles').select('*').order('created_at', { ascending: false }),
            supabase.from('goals').select('*'),
            supabase.from('self_reviews').select('*'),
            supabase.from('evaluations').select('*'),
            supabase.from('approvals').select('*'),
        ]);

        // Map snake_case DB columns → camelCase used by the UI
        setUsers((profilesData || []).map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
            role: p.role,
            department: p.department,
            avatar: p.avatar,
            managerId: p.manager_id,
        })));
        setCycles((cyclesData || []).map(c => ({
            id: c.id,
            name: c.name,
            startDate: c.start_date,
            endDate: c.end_date,
            status: c.status,
            createdBy: c.created_by,
        })));
        setGoals((goalsData || []).map(g => ({
            id: g.id,
            cycleId: g.cycle_id,
            employeeId: g.employee_id,
            managerId: g.manager_id,
            title: g.title,
            description: g.description,
            weightage: g.weightage,
            deadline: g.deadline,
            status: g.status,
        })));
        setSelfReviews((reviewsData || []).map(r => {
            let metadata = {};
            try {
                if (r.comments && r.comments.startsWith('{')) {
                    metadata = JSON.parse(r.comments);
                }
            } catch (e) {
                console.error("Failed to parse review metadata", e);
            }

            return {
                id: r.id,
                cycleId: r.cycle_id,
                employeeId: r.employee_id,
                summary: r.summary,
                goalRatings: r.goal_ratings || {},
                comments: metadata.comments || r.comments, // Fallback to raw if not JSON
                metadata: metadata, // Store full metadata object
                submittedAt: r.submitted_at,
            };
        }));
        setEvaluations((evalsData || []).map(e => ({
            id: e.id,
            cycleId: e.cycle_id,
            employeeId: e.employee_id,
            managerId: e.manager_id,
            goalRatings: e.goal_ratings || {},
            workPerformanceRating: e.work_performance_rating,
            behavioralRating: e.behavioral_rating,
            feedback: e.feedback,
            status: e.status,
            rejectionComment: e.rejection_comment,
            submittedAt: e.submitted_at,
        })));
        setApprovals((approvalsData || []).map(a => ({
            evalId: a.eval_id,
            approvedBy: a.approved_by,
            comment: a.comment,
            approvedAt: a.approved_at,
        })));
    }, []);

    // ──── Auth: restore session on page load + handle sign-out ────
    // IMPORTANT: onAuthStateChange callback must NOT be async — Supabase v2
    // awaits it before resolving signInWithPassword, which would block login().
    // login() handles its own profile fetch + data loading directly.
    useEffect(() => {
        let mounted = true;

        // Restore existing session on page refresh
        const init = async () => {
            const fakeRole = localStorage.getItem('fake_session_role');
            if (fakeRole && mounted) {
                const fakeUsers = {
                    'hr': { id: 'b065d8b6-fddf-4f21-a1d4-b26e23d40999', name: 'Surya Prabhakar Ganapathy Kannan', email: 'surya.p@techxle.com', role: 'hr', department: 'hr', avatar: 'SP', managerId: null },
                    'manager': { id: 'b7e82aea-1d9e-4765-82e1-802f40adcb26', name: 'Haran Sinka', email: 'haran@techxle.com', role: 'manager', department: 'manager', avatar: 'HS', managerId: null },
                    'employee': { id: '46342d06-791b-45e3-8ce2-a67eb322675c', name: 'Sreehari Palani', email: 'sreehari@techxle.com', role: 'employee', department: 'employee', avatar: 'SP', managerId: 'b7e82aea-1d9e-4765-82e1-802f40adcb26' }
                };
                if (fakeUsers[fakeRole]) {
                    setCurrentUser(fakeUsers[fakeRole]);
                    
                    try {
                        // Set fake users in state
                        setUsers(Object.values(fakeUsers));

                        // Load fake data from localStorage if exists, otherwise fallback to DB fetch
                        const fakeCycles = localStorage.getItem('fake_cycles');
                        if (fakeCycles) setCycles(JSON.parse(fakeCycles));
                        
                        const fakeGoals = localStorage.getItem('fake_goals');
                        if (fakeGoals) setGoals(JSON.parse(fakeGoals));
                        
                        const fakeReviews = localStorage.getItem('fake_reviews');
                        if (fakeReviews) setSelfReviews(JSON.parse(fakeReviews));
                        
                        const fakeEvals = localStorage.getItem('fake_evaluations');
                        if (fakeEvals) setEvaluations(JSON.parse(fakeEvals));
                        
                        const fakeApprovals = localStorage.getItem('fake_approvals');
                        if (fakeApprovals) setApprovals(JSON.parse(fakeApprovals));
                    } catch (e) {
                         console.error("Failed parsing fake local data", e);
                    }
                    
                    if (mounted) setLoading(false);
                    return;
                }
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (session && mounted) {
                let { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                // If profile doesn't exist (e.g., first time SSO login), auto-create it
                if (!profile) {
                    const metadata = session.user.user_metadata || {};
                    const fullName = metadata.full_name || metadata.name || session.user.email?.split('@')[0] || 'Unknown User';
                    const avatar = fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

                    const newProfile = {
                        id: session.user.id,
                        name: fullName,
                        email: session.user.email,
                        role: 'employee',
                        department: 'General',
                        avatar: avatar,
                    };

                    const { error } = await supabase.from('profiles').insert(newProfile);
                    if (!error) {
                        profile = newProfile;
                    } else {
                        console.error("Failed to auto-create profile:", error.message);
                    }
                }

                if (profile && mounted) {
                    setCurrentUser({
                        id: profile.id,
                        name: profile.name,
                        email: profile.email,
                        role: profile.role,
                        department: profile.department,
                        avatar: profile.avatar,
                        managerId: profile.manager_id,
                    });
                }
                await fetchAllData();
            }
            if (mounted) setLoading(false);
        };

        init();

        // This listener MUST be synchronous (not async) — Supabase v2 blocks
        // signInWithPassword until this callback completes. Only handle sign-out
        // here; login() handles SIGNED_IN directly.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, _session) => {
                if (event === 'SIGNED_OUT') {
                    setCurrentUser(null);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchAllData]);

    // ──── Auth Actions ────
    const loginWithMicrosoft = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'azure',
            options: {
                scopes: 'email profile',
            }
        });
        if (error) {
            console.error('Microsoft login error:', error.message);
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };

        // Wait for Supabase to finish storing the session internally.
        await new Promise(resolve => setTimeout(resolve, 100));

        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id);

        const profile = profiles?.[0];
        if (!profile) return { success: false, error: 'Profile not found. Contact admin.' };

        const user = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            department: profile.department,
            avatar: profile.avatar,
            managerId: profile.manager_id,
        };
        setCurrentUser(user);
        await fetchAllData();
        return { success: true, user };
    };

    const register = async ({ name, email, password, role, department }) => {
        // Create auth user in Supabase
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { success: false, error: error.message };

        const userId = data.user?.id;
        if (!userId) return { success: false, error: 'Registration failed. Please try again.' };

        // Create profile row
        const avatar = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const { error: profileError } = await supabase.from('profiles').insert({
            id: userId,
            name,
            email,
            role: role || 'employee',
            department: department || 'General',
            avatar,
        });
        if (profileError) return { success: false, error: profileError.message };

        return { success: true, message: 'Account created! You can now sign in.' };
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.removeItem('fake_session_role');
            setCurrentUser(null);
        }
    };

    const loginAsFake = async (role) => {
        const fakeUsers = {
            'hr': {
                id: 'b065d8b6-fddf-4f21-a1d4-b26e23d40999',
                name: 'Surya Prabhakar Ganapathy Kannan',
                email: 'surya.p@techxle.com',
                role: 'hr',
                department: 'hr',
                avatar: 'SP',
                managerId: null
            },
            'manager': {
                id: 'b7e82aea-1d9e-4765-82e1-802f40adcb26',
                name: 'Haran Sinka',
                email: 'haran@techxle.com',
                role: 'manager',
                department: 'manager',
                avatar: 'HS',
                managerId: null
            },
            'employee': {
                id: '46342d06-791b-45e3-8ce2-a67eb322675c',
                name: 'Sreehari Palani',
                email: 'sreehari@techxle.com',
                role: 'employee',
                department: 'employee',
                avatar: 'SP',
                managerId: 'b7e82aea-1d9e-4765-82e1-802f40adcb26'
            }
        };
        
        const user = fakeUsers[role];
        setCurrentUser(user);
        
        // Save fake session to localStorage so it persists on refresh
        localStorage.setItem('fake_session_role', role);
        
        try {
            // Set fake users in state
            setUsers(Object.values(fakeUsers));

            // Load fake data from localStorage if exists
            const fakeCycles = localStorage.getItem('fake_cycles');
            if (fakeCycles) setCycles(JSON.parse(fakeCycles));
            
            const fakeGoals = localStorage.getItem('fake_goals');
            if (fakeGoals) setGoals(JSON.parse(fakeGoals));
            
            const fakeReviews = localStorage.getItem('fake_reviews');
            if (fakeReviews) setSelfReviews(JSON.parse(fakeReviews));
            
            const fakeEvals = localStorage.getItem('fake_evaluations');
            if (fakeEvals) setEvaluations(JSON.parse(fakeEvals));
            
            const fakeApprovals = localStorage.getItem('fake_approvals');
            if (fakeApprovals) setApprovals(JSON.parse(fakeApprovals));
            
        } catch (e) {
            console.error("Failed to parse local fake data.", e);
        }
        
        return { success: true, user };
    };

    // ──── Users CRUD (HR only — manages profiles) ────
    const addUser = async (user) => {
        if (localStorage.getItem('fake_session_role')) {
            const mapped = { id: crypto.randomUUID(), name: user.name, email: user.email, role: user.role, department: user.department, avatar: user.avatar, managerId: user.managerId || null };
            setUsers(p => [...p, mapped]);
            return mapped;
        }

        // Create auth user first (requires service_role key in production — for demo we create profile only)
        const { data, error } = await supabase.from('profiles').insert({
            id: user.id, // Must be a valid auth.users UUID
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            avatar: user.avatar,
            manager_id: user.managerId || null,
        }).select().single();
        if (!error && data) {
            const mapped = { id: data.id, name: data.name, email: data.email, role: data.role, department: data.department, avatar: data.avatar, managerId: data.manager_id };
            setUsers(p => [...p, mapped]);
            return mapped;
        }
        return null;
    };

    const updateUser = async (id, updates) => {
        if (localStorage.getItem('fake_session_role')) {
            setUsers(p => p.map(u => u.id === id ? { ...u, ...updates } : u));
            return;
        }

        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        if (updates.department !== undefined) dbUpdates.department = updates.department;
        if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
        if (updates.managerId !== undefined) dbUpdates.manager_id = updates.managerId || null;

        const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
        if (error) console.error("Failed to update user profile in Supabase:", error.message);
        if (!error) {
            setUsers(p => p.map(u => u.id === id ? { ...u, ...updates, managerId: updates.managerId || null } : u));
        }
    };

    const deleteUser = async (id) => {
        if (localStorage.getItem('fake_session_role')) {
            setUsers(p => p.filter(u => u.id !== id));
            return;
        }

        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (!error) setUsers(p => p.filter(u => u.id !== id));
    };

    // ──── Cycles CRUD ────
    const addCycle = async (cycle) => {
        if (localStorage.getItem('fake_session_role')) {
            const mapped = { id: crypto.randomUUID(), name: cycle.name, startDate: cycle.startDate, endDate: cycle.endDate, status: cycle.status || 'draft', createdBy: currentUser?.id };
            setCycles(p => {
                const updated = [...p, mapped];
                localStorage.setItem('fake_cycles', JSON.stringify(updated));
                return updated;
            });
            return mapped;
        }

        const { data, error } = await supabase.from('cycles').insert({
            name: cycle.name,
            start_date: cycle.startDate,
            end_date: cycle.endDate,
            status: cycle.status || 'draft',
            created_by: currentUser?.id,
        }).select().single();
        if (error) {
            console.error('Supabase error adding cycle:', error.message);
            return null;
        }
        if (data) {
            const mapped = { id: data.id, name: data.name, startDate: data.start_date, endDate: data.end_date, status: data.status, createdBy: data.created_by };
            setCycles(p => [...p, mapped]);
            return mapped;
        }
        return null;
    };

    const updateCycle = async (id, updates) => {
        if (localStorage.getItem('fake_session_role')) {
            setCycles(p => {
                const updated = p.map(c => c.id === id ? { ...c, ...updates } : c);
                localStorage.setItem('fake_cycles', JSON.stringify(updated));
                return updated;
            });
            return;
        }

        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
        if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        const { error } = await supabase.from('cycles').update(dbUpdates).eq('id', id);
        if (!error) setCycles(p => p.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const deleteCycle = async (id) => {
        if (localStorage.getItem('fake_session_role')) {
            setCycles(p => {
                const updated = p.filter(c => c.id !== id);
                localStorage.setItem('fake_cycles', JSON.stringify(updated));
                return updated;
            });
            return;
        }

        const { error } = await supabase.from('cycles').delete().eq('id', id);
        if (!error) setCycles(p => p.filter(c => c.id !== id));
    };

    // ──── Goals CRUD ────
    const addGoal = async (goal) => {
        let mId = goal.managerId || currentUser?.id;

        if (currentUser?.role === 'hr') {
            const emp = users.find(u => u.id === goal.employeeId);
            if (emp && emp.managerId) mId = emp.managerId;
        }

        if (localStorage.getItem('fake_session_role')) {
            const mapped = { id: crypto.randomUUID(), cycleId: goal.cycleId, employeeId: goal.employeeId, managerId: mId, title: goal.title, description: goal.description, weightage: goal.weightage, deadline: goal.deadline, status: 'active' };
            setGoals(p => {
                const updated = [...p, mapped];
                localStorage.setItem('fake_goals', JSON.stringify(updated));
                return updated;
            });
            return mapped;
        }

        const { data, error } = await supabase.from('goals').insert({
            cycle_id: goal.cycleId,
            employee_id: goal.employeeId,
            manager_id: mId,
            title: goal.title,
            description: goal.description,
            weightage: goal.weightage,
            deadline: goal.deadline || null,
            status: 'active',
        }).select().single();
        if (error) {
            console.error('Supabase error adding goal:', error.message);
            return null;
        }
        if (data) {
            const mapped = { id: data.id, cycleId: data.cycle_id, employeeId: data.employee_id, managerId: data.manager_id, title: data.title, description: data.description, weightage: data.weightage, deadline: data.deadline, status: data.status };
            setGoals(p => [...p, mapped]);
            return mapped;
        }
        return null;
    };
    const updateGoal = async (id, updates) => {
        if (localStorage.getItem('fake_session_role')) {
            setGoals(p => {
                const updated = p.map(g => g.id === id ? { ...g, ...updates } : g);
                localStorage.setItem('fake_goals', JSON.stringify(updated));
                return updated;
            });
            return;
        }

        const dbUpdates = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.weightage !== undefined) dbUpdates.weightage = updates.weightage;
        if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        const { error } = await supabase.from('goals').update(dbUpdates).eq('id', id);
        if (!error) setGoals(p => p.map(g => g.id === id ? { ...g, ...updates } : g));
    };

    const deleteGoal = async (id) => {
        if (localStorage.getItem('fake_session_role')) {
            setGoals(p => {
                const updated = p.filter(g => g.id !== id);
                localStorage.setItem('fake_goals', JSON.stringify(updated));
                return updated;
            });
            return;
        }

        const { error } = await supabase.from('goals').delete().eq('id', id);
        if (!error) setGoals(p => p.filter(g => g.id !== id));
    };

    // ──── Self Reviews ────
    const submitSelfReview = async (review) => {
        const existing = selfReviews.find(r => r.cycleId === review.cycleId && r.employeeId === review.employeeId);
        
        // Comprehensive metadata storage
        const metadata = {
            comments: review.comments,
            progress: review.progress || {},
            competencies: review.competencies || {},
            feedback: review.feedback || '',
            achievements: review.achievements || '',
            learning: review.learning || ''
        };
        const packedComments = JSON.stringify(metadata);

        if (localStorage.getItem('fake_session_role')) {
            const mapped = { 
                id: existing ? existing.id : crypto.randomUUID(), 
                cycleId: review.cycleId, 
                employeeId: review.employeeId, 
                summary: review.summary, 
                goalRatings: review.goalRatings, 
                comments: review.comments,
                metadata: metadata,
                submittedAt: new Date().toISOString().split('T')[0] 
            };
            setSelfReviews(p => {
                const updated = existing ? p.map(x => x.id === existing.id ? mapped : x) : [...p, mapped];
                localStorage.setItem('fake_reviews', JSON.stringify(updated));
                return updated;
            });
            return mapped;
        }

        const payload = {
            cycle_id: review.cycleId,
            employee_id: review.employeeId,
            summary: review.summary,
            goal_ratings: review.goalRatings,
            comments: packedComments,
            submitted_at: new Date().toISOString()
        };

        let result;
        if (existing) {
            result = await supabase.from('self_reviews').update(payload).eq('id', existing.id).select().single();
        } else {
            result = await supabase.from('self_reviews').insert(payload).select().single();
        }

        if (!result.error && result.data) {
            const r = result.data;
            const mapped = {
                id: r.id,
                cycleId: r.cycle_id,
                employeeId: r.employee_id,
                summary: r.summary,
                goalRatings: r.goal_ratings,
                comments: review.comments,
                metadata: metadata,
                submittedAt: r.submitted_at
            };
            setSelfReviews(p => existing ? p.map(x => x.id === existing.id ? mapped : x) : [...p, mapped]);
            return mapped;
        }
        return null;
    };

    // ──── Evaluations ────
    const submitEvaluation = async (evaluation) => {
        const existing = evaluations.find(e => e.cycleId === evaluation.cycleId && e.employeeId === evaluation.employeeId);
        
        if (localStorage.getItem('fake_session_role')) {
            const mapped = { id: existing ? existing.id : crypto.randomUUID(), cycleId: evaluation.cycleId, employeeId: evaluation.employeeId, managerId: currentUser?.id, goalRatings: evaluation.goalRatings || {}, workPerformanceRating: evaluation.workPerformanceRating, behavioralRating: evaluation.behavioralRating, feedback: evaluation.feedback, status: 'pending_approval', rejectionComment: null, submittedAt: new Date().toISOString().split('T')[0] };
            setEvaluations(p => {
                const updated = existing ? p.map(x => x.id === existing.id ? mapped : x) : [...p, mapped];
                localStorage.setItem('fake_evaluations', JSON.stringify(updated));
                return updated;
            });
            return mapped;
        }

        const payload = {
            cycle_id: evaluation.cycleId,
            employee_id: evaluation.employeeId,
            manager_id: currentUser?.id,
            goal_ratings: evaluation.goalRatings,
            work_performance_rating: evaluation.workPerformanceRating,
            behavioral_rating: evaluation.behavioralRating,
            feedback: evaluation.feedback,
            status: 'pending_approval',
            submitted_at: new Date().toISOString().split('T')[0],
        };

        let result;
        if (existing) {
            result = await supabase.from('evaluations').update(payload).eq('id', existing.id).select().single();
        } else {
            result = await supabase.from('evaluations').insert(payload).select().single();
        }

        const { data, error } = result;

        if (error) {
            console.error('Supabase error submitting evaluation:', error.message);
            return null;
        }
        if (data) {
            const mapped = { id: data.id, cycleId: data.cycle_id, employeeId: data.employee_id, managerId: data.manager_id, goalRatings: data.goal_ratings || {}, workPerformanceRating: data.work_performance_rating, behavioralRating: data.behavioral_rating, feedback: data.feedback, status: data.status, rejectionComment: data.rejection_comment, submittedAt: data.submitted_at };
            if (existing) {
                setEvaluations(p => p.map(x => x.id === existing.id ? mapped : x));
            } else {
                setEvaluations(p => [...p, mapped]);
            }
            return mapped;
        }
        return null;
    };

    // ──── Approvals ────
    const approveEvaluation = async (evalId, comment = '') => {
        if (localStorage.getItem('fake_session_role')) {
            setEvaluations(p => {
                const updated = p.map(e => e.id === evalId ? { ...e, status: 'approved' } : e);
                localStorage.setItem('fake_evaluations', JSON.stringify(updated));
                return updated;
            });
            setApprovals(p => {
                const updated = [...p, { evalId, approvedBy: currentUser?.id, comment, approvedAt: new Date().toISOString().split('T')[0] }];
                localStorage.setItem('fake_approvals', JSON.stringify(updated));
                return updated;
            });
            return;
        }

        const { error: evalError } = await supabase.from('evaluations').update({ status: 'approved' }).eq('id', evalId);
        if (!evalError) {
            setEvaluations(p => p.map(e => e.id === evalId ? { ...e, status: 'approved' } : e));
            const approval = {
                eval_id: evalId,
                approved_by: currentUser?.id,
                comment,
                approved_at: new Date().toISOString().split('T')[0],
            };
            const { data } = await supabase.from('approvals').insert(approval).select().single();
            if (data) {
                setApprovals(p => [...p, { evalId: data.eval_id, approvedBy: data.approved_by, comment: data.comment, approvedAt: data.approved_at }]);
            }
        }
    };

    const rejectEvaluation = async (evalId, comment = '') => {
        if (localStorage.getItem('fake_session_role')) {
            setEvaluations(p => {
                const updated = p.map(e => e.id === evalId ? { ...e, status: 'rejected', rejectionComment: comment } : e);
                localStorage.setItem('fake_evaluations', JSON.stringify(updated));
                return updated;
            });
            return;
        }

        const { error } = await supabase.from('evaluations').update({ status: 'rejected', rejection_comment: comment }).eq('id', evalId);
        if (!error) {
            setEvaluations(p => p.map(e => e.id === evalId ? { ...e, status: 'rejected', rejectionComment: comment } : e));
        }
    };

    // ──── Helpers (pure, not async — use local state) ────
    const getActiveCycle = () => cycles.find(c => c.status === 'active');
    const getUserById = (id) => users.find(u => u.id === id);
    const getGoalsForEmployee = (empId, cycleId) => goals.filter(g => g.employeeId === empId && g.cycleId === cycleId);
    const getTeamEmployees = (managerId) => users.filter(u => u.managerId === managerId);
    const getSelfReview = (empId, cycleId) => selfReviews.find(r => r.employeeId === empId && r.cycleId === cycleId);
    const getEvaluation = (empId, cycleId) => evaluations.find(e => e.employeeId === empId && e.cycleId === cycleId);
    const getScore = (empId, cycleId) => {
        const ev = getEvaluation(empId, cycleId);
        if (!ev) return null;
        const empGoals = getGoalsForEmployee(empId, cycleId);
        const score = calculateScore(empGoals, ev.goalRatings, ev.workPerformanceRating, ev.behavioralRating);
        return { score, category: getCategory(score) };
    };


    return (
        <AppContext.Provider value={{
            currentUser, users, cycles, goals, selfReviews, evaluations, approvals,
            login, loginWithMicrosoft, logout, register, loginAsFake,
            addUser, updateUser, deleteUser,
            addCycle, updateCycle, deleteCycle,
            addGoal, updateGoal, deleteGoal,
            submitSelfReview, submitEvaluation,
            approveEvaluation, rejectEvaluation,
            getActiveCycle, getUserById, getGoalsForEmployee,
            getTeamEmployees, getSelfReview, getEvaluation, getScore,
            calculateScore, getCategory,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
