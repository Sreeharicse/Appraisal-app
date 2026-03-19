import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PERFORMANCE_CATEGORIES } from '../data/constants';
import { encrypt, decrypt, encryptJSON, decryptJSON, MASKED, AUTHORIZED_ROLES, logDecryptionAccess } from '../utils/encryption';
import { sendEmailNotification, employeeSubmitEmail, managerSubmitEmail, hrApproveEmail, cycleCreatedEmail } from '../utils/emailService';

const AppContext = createContext(null);

export function calculateScore(coreAvg, behavioralAvg, subRating, hrRating = 0) {
    // Option 2: Core vs. Behavioral Weighting
    // coreAvg: average of Questions 1-4 (Quality, Technical, Problem Solving, Productivity) (1-5)
    // behavioralAvg: average of Questions 5-10 (Communication, Collaboration, Initiative, Time, Project Success, Professionalism) (1-5)
    // subRating: manager final sub-rating (1-5)
    // hrRating: HR assessment (1-5)
    // Formula within 90% manager slot: (CoreAvg * 0.45) + (BehavioralAvg * 0.30) + (SubRating * 0.25)
    // HR gets 10% of overall
    const corePart = (coreAvg / 5) * 0.45 * 90 || 0;       // 40.5% of total
    const behavioralPart = (behavioralAvg / 5) * 0.30 * 90 || 0; // 27% of total
    const subPart = (subRating / 5) * 0.25 * 90 || 0;      // 22.5% of total
    const hrPart = (hrRating / 5) * 10 || 0;                // 10% of total
    return Math.round(corePart + behavioralPart + subPart + hrPart);
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
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [cycles, setCycles] = useState([]);
    const [selfReviews, setSelfReviews] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'dark');
    const [encryptionKey, _setEncryptionKey] = useState(localStorage.getItem('admin_encryption_key') || 'techxl-secure-2026');
    const [showDecrypted, setShowDecrypted] = useState(false);

    // Helper: check if current user can view decrypted data
    const canDecrypt = (user) => user && AUTHORIZED_ROLES.includes(user.role);

    // ──── Fetch all data from Supabase ────
    const fetchAllData = useCallback(async () => {
        if (localStorage.getItem('fake_session_role')) {
            try {
                const fakeCycles = localStorage.getItem('fake_cycles');
                if (fakeCycles) setCycles(JSON.parse(fakeCycles));

                const fakeReviews = localStorage.getItem('fake_reviews');
                if (fakeReviews) setSelfReviews(JSON.parse(fakeReviews));

                const fakeEvals = localStorage.getItem('fake_evaluations');
                if (fakeEvals) setEvaluations(JSON.parse(fakeEvals));

                const fakeApprovals = localStorage.getItem('fake_approvals');
                if (fakeApprovals) setApprovals(JSON.parse(fakeApprovals));

                const fakeNotifications = localStorage.getItem('fake_notifications');
                if (fakeNotifications) setNotifications(JSON.parse(fakeNotifications));
            } catch (e) {
                console.error("Failed to parse local fake data in refresh", e);
            }
            return;
        }

        const [
            { data: profilesData },
            { data: cyclesData },
            { data: reviewsData },
            { data: evalsData },
            { data: approvalsData },
            { data: notificationsData },
            { data: departmentsData },
            { data: designationsData },
        ] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('cycles').select('*').order('created_at', { ascending: false }),
            supabase.from('self_reviews').select('*'),
            supabase.from('evaluations').select('*'),
            supabase.from('approvals').select('*'),
            supabase.from('notifications').select('*').order('created_at', { ascending: false }),
            supabase.from('departments').select('*'),
            supabase.from('designations').select('*'),
        ]);

        // Map snake_case DB columns → camelCase used by the UI
        setUsers((profilesData || []).map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
            role: p.role,
            department: p.department,
            designation: p.designation,
            avatar: p.avatar,
            managerId: p.manager_id,
        })));
        setDepartments((departmentsData || []).map(d => ({ id: d.id, name: d.name })));
        setDesignations((designationsData || []).map(d => ({ id: d.id, name: d.name })));
        setCycles((cyclesData || []).map(c => ({
            id: c.id,
            name: c.name,
            startDate: c.start_date,
            endDate: c.end_date,
            status: c.status,
            createdBy: c.created_by,
        })));

        setSelfReviews((reviewsData || []).map(r => {
            let metadata = { status: 'draft' };
            try {
                if (r.comments && r.comments.startsWith('{')) {
                    metadata = JSON.parse(r.comments);
                    // Always decrypt — handles both AES: and [ENC] formats
                    if (metadata.comments) metadata.comments = decrypt(metadata.comments);
                    if (metadata.feedback) metadata.feedback = decrypt(metadata.feedback);
                    if (metadata.achievements) metadata.achievements = decrypt(metadata.achievements);
                    if (metadata.learning) metadata.learning = decrypt(metadata.learning);
                    if (metadata.summary) metadata.summary = decrypt(metadata.summary);
                    if (metadata.competencies) {
                        Object.keys(metadata.competencies).forEach(qid => {
                            if (metadata.competencies[qid]?.comment) {
                                metadata.competencies[qid].comment = decrypt(metadata.competencies[qid].comment);
                            }
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to parse review metadata", e);
            }

            const isJson = r.comments && r.comments.startsWith('{');
            return {
                id: r.id,
                cycleId: r.cycle_id,
                employeeId: r.employee_id,
                summary: decrypt(r.summary) || (isJson ? (metadata.summary || '') : ''),
                comments: isJson ? (metadata.comments || '') : (decrypt(r.comments) || r.comments),
                metadata: metadata,
                submittedAt: r.submitted_at,
                status: metadata.status || 'submitted'
            };
        }));
        setEvaluations((evalsData || []).map(e => {
            let metadata = {};
            try {
                if (e.feedback && e.feedback.startsWith('{')) {
                    metadata = JSON.parse(e.feedback);
                    if (metadata.feedback) metadata.feedback = decrypt(metadata.feedback);
                    if (metadata.competencies) {
                        Object.keys(metadata.competencies).forEach(qid => {
                            if (metadata.competencies[qid]?.comment) {
                                metadata.competencies[qid].comment = decrypt(metadata.competencies[qid].comment);
                            }
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to parse evaluation metadata", err);
            }

            // Decrypt numeric ratings — column is now text (encrypted or plain string from migration)
            const workRating = e.work_performance_rating
                ? (parseFloat(decrypt(e.work_performance_rating)) || parseFloat(e.work_performance_rating) || 0)
                : 0;
            const behavRating = e.behavioral_rating
                ? (parseFloat(decrypt(e.behavioral_rating)) || parseFloat(e.behavioral_rating) || 0)
                : 0;
            const hrRating = e.hr_rating
                ? (parseFloat(decrypt(e.hr_rating)) || parseFloat(e.hr_rating) || 0)
                : 0;
            const finalRating = e.final_rating ? (decrypt(e.final_rating) || e.final_rating) : null;
            const subRating = e.sub_rating || null; // Raw numeric column now
            // Decrypt rejection comment — handles both AES: and [ENC] formats
            const rejComment = e.rejection_comment ? decrypt(e.rejection_comment) : e.rejection_comment;
            const isJson = e.feedback && e.feedback.startsWith('{');
            return {
                id: e.id,
                cycleId: e.cycle_id,
                employeeId: e.employee_id,
                managerId: e.manager_id,
                workPerformanceRating: workRating,
                behavioralRating: behavRating,
                hrRating: hrRating,
                finalRating: finalRating,
                subRating: subRating,
                feedback: isJson ? (metadata.feedback || '') : (decrypt(e.feedback) || e.feedback),
                metadata: metadata,
                status: e.status,
                rejectionComment: rejComment,
                submittedAt: e.submitted_at,
            };
        }));
        setApprovals((approvalsData || []).map(a => {
            // Decrypt the comment field — stored as JSON {comment, hrRating}
            let plainComment = a.comment || '';
            let hrRatingFromApproval = 0;
            try {
                if (plainComment.startsWith('{')) {
                    const parsed = JSON.parse(plainComment);
                    plainComment = decrypt(parsed.comment || '') || parsed.comment || '';
                    hrRatingFromApproval = parsed.hrRating || 0;
                } else {
                    // Might be a bare encrypted or plain string
                    plainComment = decrypt(plainComment);
                }
            } catch (e) {
                plainComment = decrypt(a.comment || '') || a.comment || '';
            }
            return {
                evalId: a.eval_id,
                approvedBy: a.approved_by,
                comment: plainComment,
                hrRating: hrRatingFromApproval,
                approvedAt: a.approved_at,
            };
        }));

        setNotifications((notificationsData || []).map(n => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: n.is_read,
            createdAt: n.created_at,
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
                    'admin': { id: 'admin-001', name: 'System Administrator', email: 'admin@techxle.com', role: 'admin', department: 'IT / Operations', avatar: 'AD', managerId: null },
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

                        const fakeReviews = localStorage.getItem('fake_reviews');
                        if (fakeReviews) setSelfReviews(JSON.parse(fakeReviews));

                        const fakeEvals = localStorage.getItem('fake_evaluations');
                        if (fakeEvals) setEvaluations(JSON.parse(fakeEvals));

                        const fakeApprovals = localStorage.getItem('fake_approvals');
                        if (fakeApprovals) setApprovals(JSON.parse(fakeApprovals));

                        const fakeNotifications = localStorage.getItem('fake_notifications');
                        if (fakeNotifications) setNotifications(JSON.parse(fakeNotifications));
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

                // If profile doesn't exist (e.g., first time SSO login), auto-create or link it
                if (!profile) {
                    // First, check if there's a profile with this email (pre-registered by HR)
                    const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('email', session.user.email)
                        .single();

                    if (existingProfile) {
                        // Link existing profile to this Auth user ID
                        const { error: linkError } = await supabase
                            .from('profiles')
                            .update({ id: session.user.id })
                            .eq('email', session.user.email);

                        if (!linkError) {
                            profile = { ...existingProfile, id: session.user.id };
                        } else {
                            console.error("Failed to link profile:", linkError.message);
                        }
                    } else {
                        // No profile exists, create a new one
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

    // Apply theme class to body
    useEffect(() => {
        document.body.className = `${theme}-theme`;
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const toggleTheme = (newTheme) => {
        setTheme(newTheme);
    };

    const setEncryptionKey = (key) => {
        _setEncryptionKey(key);
        localStorage.setItem('admin_encryption_key', key);
    };

    const resetAndSeedFakeData = () => {
        // Clear existing local mock data
        localStorage.removeItem('fake_cycles');
        localStorage.removeItem('fake_reviews');
        localStorage.removeItem('fake_evaluations');
        localStorage.removeItem('fake_approvals');

        // Initial Seed
        const seedCycles = [
            { id: 'cycle-2026', name: 'Annual Review 2026', startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', createdBy: 'admin-001' }
        ];

        localStorage.setItem('fake_cycles', JSON.stringify(seedCycles));

        // Refresh state
        setCycles(seedCycles);
        setSelfReviews([]);
        setEvaluations([]);
        setApprovals([]);
    };

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
            'admin': {
                id: 'admin-001',
                name: 'System Administrator',
                email: 'admin@techxle.com',
                role: 'admin',
                department: 'IT / Operations',
                avatar: 'AD',
                managerId: null
            },
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
        const tempId = user.id || crypto.randomUUID();
        const profileData = {
            id: tempId,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            designation: user.designation,
            avatar: user.avatar,
            manager_id: user.managerId || null,
        };

        // Always attempt Supabase insert if not in purely offline/fake mode
        // If it fails (e.g. RLS), we still update local state for testing if in fake mode
        const { data, error } = await supabase.from('profiles').insert(profileData).select().single();

        if (error) {
            console.warn("Supabase insert failed (possibly due to RLS/Auth):", error.message);
        }

        const result = data ? {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            department: data.department,
            designation: data.designation,
            avatar: data.avatar,
            managerId: data.manager_id
        } : {
            ...user,
            id: tempId,
            managerId: user.managerId || null
        };

        setUsers(p => [...p, result]);
        return result;
    };

    const updateUser = async (id, updates) => {
        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        if (updates.department !== undefined) dbUpdates.department = updates.department;
        if (updates.designation !== undefined) dbUpdates.designation = updates.designation;
        if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
        if (updates.managerId !== undefined) dbUpdates.manager_id = updates.managerId || null;

        const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);

        if (error) {
            console.error("Supabase updateUser failed:", error.message, error.details, error.hint);
            // Still update local state so the UI reflects changes
            setUsers(p => p.map(u => u.id === id ? { ...u, ...updates, managerId: updates.managerId !== undefined ? updates.managerId : u.managerId } : u));
            return { success: false, error: error.message };
        }

        // Update local state on success
        setUsers(p => p.map(u => u.id === id ? { ...u, ...updates, managerId: updates.managerId !== undefined ? updates.managerId : u.managerId } : u));
        return { success: true };
    };

    const deleteUser = async (id) => {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) {
            console.warn("Supabase delete failed:", error.message);
        }
        // Always update local state
        setUsers(p => p.filter(u => u.id !== id));
    };

    // ──── Notifications ────
    const createNotification = async (userIds, title, message, type = 'info', link = null) => {
        if (!userIds || userIds.length === 0) return;
        const now = new Date().toISOString();
        
        // Pack link into the message string securely so we don't need a DB schema change
        const payloadStr = JSON.stringify({ text: message, link: link });

        if (localStorage.getItem('fake_session_role')) {
            const newNotifs = userIds.map(uid => ({
                id: crypto.randomUUID(), userId: uid, title, message: payloadStr, type, isRead: false, createdAt: now
            }));
            setNotifications(p => {
                const updated = [...newNotifs, ...p];
                localStorage.setItem('fake_notifications', JSON.stringify(updated));
                return updated;
            });
            return;
        }

        const inserts = userIds.map(uid => ({
            user_id: uid, title, message: payloadStr, type, created_at: now
        }));
        const { error } = await supabase.from('notifications').insert(inserts);
        if (error) console.error('Error creating notifications:', error.message);
        else {
            if (userIds.includes(currentUser?.id)) fetchAllData();
        }
    };

    const markNotificationAsRead = async (id) => {
        setNotifications(p => p.map(n => n.id === id ? { ...n, isRead: true } : n));
        
        if (localStorage.getItem('fake_session_role')) {
            const fakeNotifs = JSON.parse(localStorage.getItem('fake_notifications') || '[]');
            const updated = fakeNotifs.map(n => n.id === id ? { ...n, isRead: true } : n);
            localStorage.setItem('fake_notifications', JSON.stringify(updated));
            return;
        }
        
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
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
            
            // Notify all employees and managers
            const allUserIds = users.filter(u => u.role === 'employee' || u.role === 'manager').map(u => u.id);
            if (mapped.status === 'active') {
                createNotification(allUserIds, 'New Appraisal Cycle', `The ${mapped.name} cycle has been launched.`, 'info', '/employee/self-review');
                allUserIds.forEach(uid => {
                    const emp = users.find(u => u.id === uid);
                    if (emp) sendEmailNotification(emp.email, 'New Appraisal Cycle Launched', cycleCreatedEmail(emp.name, mapped.name, mapped.startDate, mapped.endDate));
                });
            }
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
            
            if (mapped.status === 'active') {
                const allUserIds = users.filter(u => u.role === 'employee' || u.role === 'manager').map(u => u.id);
                createNotification(allUserIds, 'New Appraisal Cycle', `The ${mapped.name} cycle has been launched.`, 'info', '/employee/self-review');
                allUserIds.forEach(uid => {
                    const emp = users.find(u => u.id === uid);
                    if (emp) sendEmailNotification(emp.email, 'New Appraisal Cycle Launched', cycleCreatedEmail(emp.name, mapped.name, mapped.startDate, mapped.endDate));
                });
            }
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
            if (updates.status === 'active') {
                const cName = cycles.find(c => c.id === id)?.name || updates.name || "A";
                const allUserIds = users.filter(u => u.role === 'employee' || u.role === 'manager').map(u => u.id);
                createNotification(allUserIds, 'Appraisal Cycle Active', `The ${cName} cycle is now active.`, 'info', '/employee/self-review');
                allUserIds.forEach(uid => {
                    const emp = users.find(u => u.id === uid);
                    if (emp) {
                        const cycle = cycles.find(c => c.id === id);
                        sendEmailNotification(emp.email, 'Appraisal Cycle Active', cycleCreatedEmail(emp.name, cName, cycle?.startDate || '', cycle?.endDate || ''));
                    }
                });
            }
            return;
        }

        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
        if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        const { error } = await supabase.from('cycles').update(dbUpdates).eq('id', id);
        if (!error) {
            setCycles(p => p.map(c => c.id === id ? { ...c, ...updates } : c));
            if (updates.status === 'active') {
                const cName = cycles.find(c => c.id === id)?.name || updates.name || "A";
                const allUserIds = users.filter(u => u.role === 'employee' || u.role === 'manager').map(u => u.id);
                createNotification(allUserIds, 'Appraisal Cycle Active', `The ${cName} cycle is now active.`, 'info', '/employee/self-review');
                allUserIds.forEach(uid => {
                    const emp = users.find(u => u.id === uid);
                    if (emp) {
                        const cycle = cycles.find(c => c.id === id);
                        sendEmailNotification(emp.email, 'Appraisal Cycle Active', cycleCreatedEmail(emp.name, cName, cycle?.startDate || '', cycle?.endDate || ''));
                    }
                });
            }
        }
    };

    const deleteCycle = async (id) => {
        if (localStorage.getItem('fake_session_role')) {
            setCycles(p => {
                const updated = p.filter(c => c.id !== id);
                localStorage.setItem('fake_cycles', JSON.stringify(updated));
                return updated;
            });
            return { success: true };
        }

        try {
            console.log(`[DEBUG] deleteCycle called for ID: ${id}`);
            console.log(`[DEBUG] Current user:`, currentUser);

            // 1. Fetch ALL evaluations for this cycle directly from DB to avoid missing any (stale local state)
            const { data: dbEvals, error: fetchError } = await supabase.from('evaluations').select('id').eq('cycle_id', id);
            if (fetchError) throw new Error(`Fetch evals failed: ${fetchError.message}`);
            
            const dbEvalIds = dbEvals?.map(e => e.id) || [];

            // 2. Delete approvals linked to those evaluations
            if (dbEvalIds.length > 0) {
                const { error: appError } = await supabase.from('approvals').delete().in('eval_id', dbEvalIds);
                if (appError) throw new Error(`Delete approvals failed: ${appError.message}`);
            }

            // 3. Delete evaluations linked to this cycle
            const { error: evalError } = await supabase.from('evaluations').delete().eq('cycle_id', id);
            if (evalError) throw new Error(`Delete evaluations failed: ${evalError.message}`);

            // 4. Delete self_reviews linked to this cycle
            const { error: selfError } = await supabase.from('self_reviews').delete().eq('cycle_id', id);
            if (selfError) throw new Error(`Delete self_reviews failed: ${selfError.message}`);


            // 6. Finally, delete the cycle itself
            console.log(`[DEBUG] Final step: Deleting cycle ${id}...`);
            const { data: deleteRes, error: cycleError } = await supabase.from('cycles').delete().eq('id', id).select();
            
            console.log(`[DEBUG] deleteRes:`, deleteRes);
            console.log(`[DEBUG] cycleError:`, cycleError);
            
            if (cycleError) throw new Error(`Delete cycle failed: ${cycleError.message}`);
            
            if (!deleteRes || deleteRes.length === 0) {
                throw new Error('Deletion failed: No cycle was removed from the database. This might be due to a permission issue (RLS).');
            } else {
                console.log(`Successfully deleted cycle ${id} from Supabase:`, deleteRes[0].name);
            }
            
            // 7. Refresh local state to ensure consistency
            await fetchAllData();
            return { success: true };

        } catch (err) {
            console.error('Cascade delete error:', err);
            return { success: false, error: err.message || 'Unknown error during cascade delete' };
        }
    };

    const requestCycleDelete = async (cycle) => {
        const admins = users.filter(u => u.role === 'admin').map(u => u.id);
        if (admins.length > 0) {
            await createNotification(
                admins, 
                '🗑️ Cycle Delete Request', 
                `${currentUser?.name} (HR) has requested deletion of the '${cycle.name}' cycle. Please review and delete from Appraisal Cycles if approved.`, 
                'warning'
            );
        }
    };


    // ──── Self Reviews ────
    const submitSelfReview = async (review) => {
        const existing = selfReviews.find(r => r.cycleId === review.cycleId && r.employeeId === review.employeeId);

        const encryptedCompetencies = {};
        if (review.competencies) {
            Object.keys(review.competencies).forEach(qid => {
                encryptedCompetencies[qid] = {
                    ...review.competencies[qid],
                    comment: encrypt(review.competencies[qid].comment)
                };
            });
        }

        const metadataForStorage = {
            progress: review.progress || {},
            competencies: encryptedCompetencies,
            feedback: encrypt(review.feedback || ''),
            achievements: encrypt(review.achievements || ''),
            learning: encrypt(review.learning || ''),
            status: review.status || 'draft'
        };

        const packedComments = JSON.stringify(metadataForStorage);

        const unencryptedMetadata = {
            progress: review.progress || {},
            competencies: review.competencies || {},
            feedback: review.feedback || '',
            achievements: review.achievements || '',
            learning: review.learning || '',
            status: review.status || 'draft'
        };


        if (localStorage.getItem('fake_session_role')) {
            const mapped = {
                id: existing ? existing.id : crypto.randomUUID(),
                cycleId: review.cycleId,
                employeeId: review.employeeId,
                summary: review.summary,
                metadata: unencryptedMetadata,

                submittedAt: new Date().toISOString().split('T')[0]
            };
            setSelfReviews(p => {
                const updated = existing ? p.map(x => x.id === existing.id ? mapped : x) : [...p, mapped];
                localStorage.setItem('fake_reviews', JSON.stringify(updated));
                return updated;
            });
            
            // Notify Manager or HR fallback ONLY if state just changed to submitted
            if (mapped.status === 'submitted' && (!existing || existing.status !== 'submitted')) {
                const employee = users.find(u => u.id === mapped.employeeId);
                const managerId = employee?.managerId;
                const empManager = users.find(u => u.id === managerId);
                const empName = employee?.name || 'An employee';

                console.log(`[SelfReview-Fake] Submitting for: ${empName}, managerId: ${managerId}`);

                if (empManager) {
                    console.log(`[SelfReview-Fake] Found manager: ${empManager.name} (${empManager.email})`);
                    createNotification([empManager.id], 'Self-Review Submitted', `${empName} has submitted their self-review.`, 'success', '/manager/evaluate');
                    sendEmailNotification(empManager.email, `Self-Review Submitted by ${empName}`, employeeSubmitEmail(empName, empManager.name));
                } else {
                    console.log(`[SelfReview-Fake] No manager found for ${empName}, falling back to HR.`);
                    const hrs = users.filter(u => u.role === 'admin' || u.role === 'hr');
                    if (hrs.length > 0) {
                        createNotification(hrs.map(h => h.id), 'Self-Review Submitted', `${empName} has submitted their self-review (no manager assigned).`, 'success', '/hr/evaluations');
                        hrs.forEach(hr => sendEmailNotification(hr.email, `Self-Review Submitted by ${empName}`, employeeSubmitEmail(empName, hr.name)));
                    }
                }
            }

            return mapped;
        }

        const payload = {
            cycle_id: review.cycleId,
            employee_id: review.employeeId,
            summary: encrypt(review.summary),
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
                summary: review.summary,
                metadata: unencryptedMetadata,

                submittedAt: r.submitted_at,
                status: review.status || 'draft'
            };
            setSelfReviews(p => existing ? p.map(x => x.id === existing.id ? mapped : x) : [...p, mapped]);
            // Notify Manager or HR fallback ONLY if state just changed to submitted
            if (mapped.status === 'submitted' && (!existing || existing.status !== 'submitted')) {
                const employee = users.find(u => u.id === mapped.employeeId);
                const managerId = employee?.managerId;
                const empManager = users.find(u => u.id === managerId);
                const empName = employee?.name || 'An employee';

                console.log(`[SelfReview] Submitting for: ${empName}, managerId: ${managerId}`);

                if (empManager) {
                    console.log(`[SelfReview] Found manager: ${empManager.name} (${empManager.email})`);
                    createNotification([empManager.id], 'Self-Review Submitted', `${empName} has submitted their self-review.`, 'success', '/manager');
                    sendEmailNotification(empManager.email, `Self-Review Submitted by ${empName}`, employeeSubmitEmail(empName, empManager.name));
                } else {
                    console.log(`[SelfReview] No manager found for ${empName}, falling back to HR.`);
                    const hrs = users.filter(u => u.role === 'admin' || u.role === 'hr');
                    if (hrs.length > 0) {
                        createNotification(hrs.map(h => h.id), 'Self-Review Submitted', `${empName} has submitted their self-review (no manager assigned).`, 'success', '/hr/approvals');
                        hrs.forEach(hr => sendEmailNotification(hr.email, `Self-Review Submitted by ${empName}`, employeeSubmitEmail(empName, hr.name)));
                    }
                }
            }

            return mapped;
        } else if (result.error) {
            console.error('Supabase error submitting self review:', result.error);
        }
        return null;
    };

    // ──── Evaluations ────
    const submitEvaluation = async (evaluation) => {
        const existing = evaluations.find(e => e.cycleId === evaluation.cycleId && e.employeeId === evaluation.employeeId);

        const encryptedCompetencies = {};
        if (evaluation.competencies) {
            Object.keys(evaluation.competencies).forEach(qid => {
                encryptedCompetencies[qid] = {
                    ...evaluation.competencies[qid],
                    comment: encrypt(evaluation.competencies[qid].comment)
                };
            });
        }

        const metadataForStorage = {
            feedback: encrypt(evaluation.feedback),
            competencies: encryptedCompetencies
        };
        const packedFeedback = JSON.stringify(metadataForStorage);

        const unencryptedMetadata = {
            feedback: evaluation.feedback,
            competencies: evaluation.competencies || {}
        };

        if (localStorage.getItem('fake_session_role')) {
            const mapped = {
                id: existing ? existing.id : crypto.randomUUID(),
                cycleId: evaluation.cycleId,
                employeeId: evaluation.employeeId,
                managerId: currentUser?.id,
                workPerformanceRating: evaluation.workPerformanceRating,
                behavioralRating: evaluation.behavioralRating,
                finalRating: evaluation.finalRating,
                subRating: evaluation.subRating,
                feedback: evaluation.feedback,
                metadata: unencryptedMetadata,
                status: evaluation.status || 'draft',
                rejectionComment: null,
                submittedAt: new Date().toISOString().split('T')[0]
            };
            setEvaluations(p => {
                const updated = existing ? p.map(x => x.id === existing.id ? mapped : x) : [...p, mapped];
                localStorage.setItem('fake_evaluations', JSON.stringify(updated));
                return updated;
            });
            
            // Only Notify Employee & HR if fully submitted and state just changed
            if (mapped.status === 'pending_approval' && (!existing || existing.status !== 'pending_approval')) {
                const hrs = users.filter(u => u.role === 'admin' || u.role === 'hr');
                const emp = users.find(u => u.id === evaluation.employeeId);
                if (emp) {
                    createNotification([emp.id], 'Evaluation Submitted', `Your manager has submitted your evaluation. Pending HR approval.`, 'success', '/employee/results');
                    sendEmailNotification(emp.email, 'Evaluation Assessed', managerSubmitEmail(emp.name));
                }
                createNotification(hrs.map(h => h.id), 'Pending HR Approval', `Evaluation for ${emp?.name} is awaiting your approval.`, 'warning', '/hr/approvals');
            }

            return mapped;
        }

        const payload = {
            cycle_id: evaluation.cycleId,
            employee_id: evaluation.employeeId,
            manager_id: currentUser?.id,
            // Legacy columns with NOT NULL constraints - sending defaults
            work_performance_rating: encrypt('0'),
            behavioral_rating: encrypt('0'),
            final_rating: evaluation.finalRating ? encrypt(evaluation.finalRating) : null,
            sub_rating: evaluation.subRating || null, // Plain number for DB
            feedback: packedFeedback,
            status: evaluation.status || 'draft',
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
            console.error('Supabase error submitting evaluation:', error);
            console.error('Full error details:', JSON.stringify(error));
            console.error('Payload sent:', JSON.stringify(payload));
            alert(`Evaluation save failed: ${error.message || JSON.stringify(error)}`);
            return null;
        }
        if (data) {
            const mapped = {
                id: data.id,
                cycleId: data.cycle_id,
                employeeId: data.employee_id,
                managerId: data.manager_id,
                workPerformanceRating: data.work_performance_rating,
                behavioralRating: data.behavioral_rating,
                finalRating: evaluation.finalRating,
                subRating: evaluation.subRating,
                feedback: evaluation.feedback,
                metadata: unencryptedMetadata,
                status: data.status,
                rejectionComment: data.rejection_comment,
                submittedAt: data.submitted_at
            };
            if (existing) {
                setEvaluations(p => p.map(x => x.id === existing.id ? mapped : x));
            } else {
                setEvaluations(p => [...p, mapped]);
            }
            
            // Only Notify Employee & HR if fully submitted and state just changed
            if (mapped.status === 'pending_approval' && (!existing || existing.status !== 'pending_approval')) {
                const hrs = users.filter(u => u.role === 'admin' || u.role === 'hr');
                const emp = users.find(u => u.id === evaluation.employeeId);
                if (emp) {
                    createNotification([emp.id], 'Evaluation Submitted', `Your manager has submitted your evaluation. Pending HR approval.`, 'success', '/employee/results');
                    sendEmailNotification(emp.email, 'Evaluation Assessed', managerSubmitEmail(emp.name));
                }
                createNotification(hrs.map(h => h.id), 'Pending HR Approval', `Evaluation for ${emp?.name} is awaiting your approval.`, 'warning', '/hr/approvals');
            }

            return mapped;
        }
        return null;
    };

    // ──── Approvals ────
    const approveEvaluation = async (evalId, comment = '', hrRating = 0) => {
        if (localStorage.getItem('fake_session_role')) {
            setEvaluations(p => {
                const updated = p.map(e => e.id === evalId ? { ...e, status: 'approved', hrRating } : e);
                localStorage.setItem('fake_evaluations', JSON.stringify(updated));
                return updated;
            });
            setApprovals(p => {
                const updated = [...p, { evalId, approvedBy: currentUser?.id, comment, hrRating, approvedAt: new Date().toISOString().split('T')[0] }];
                localStorage.setItem('fake_approvals', JSON.stringify(updated));
                return updated;
            });

            // Notify Employee & Manager
            const theEval = evaluations.find(e => e.id === evalId);
            console.log(`[Approve-Fake] Approving evalId: ${evalId}, found: ${!!theEval}`);
            if (theEval) {
                const emp = users.find(u => u.id === theEval.employeeId);
                console.log(`[Approve-Fake] Employee: ${emp?.name} (${emp?.email})`);
                if (emp) {
                    createNotification([emp.id], 'Evaluation Approved', 'Your appraisal results are now officially approved and available.', 'success', '/employee/results');
                    sendEmailNotification(emp.email, 'Evaluation Finalized', hrApproveEmail(emp.name));
                }
                createNotification([theEval.managerId], 'Evaluation Approved', `HR approved your evaluation for ${emp?.name}.`, 'success', '/manager');
            }
            return;
        }

        // Insert approval record first (HR has INSERT on approvals)
        const approval = {
            eval_id: evalId,
            approved_by: currentUser?.id,
            comment: JSON.stringify({ comment: encrypt(comment), hrRating }),
            approved_at: new Date().toISOString().split('T')[0],
        };
        const { data: approvalData, error: approvalError } = await supabase.from('approvals').insert(approval).select().single();
        if (approvalError) {
            console.error('Approvals insert error:', approvalError.message, approvalError.details, approvalError.hint);
        } else if (approvalData) {
            setApprovals(p => [...p, { evalId: approvalData.eval_id, approvedBy: approvalData.approved_by, comment, hrRating, approvedAt: approvalData.approved_at }]);
        }

        // Update evaluation: status + all ratings encrypted (re-encrypt existing ratings too)
        const theEvalToApprove = evaluations.find(e => e.id === evalId);
        const updatePayload = {
            status: 'approved',
            hr_rating: encrypt(String(hrRating)),
        };

        const { error: evalError } = await supabase
            .from('evaluations')
            .update(updatePayload)
            .eq('id', evalId);
        if (evalError) {
            console.error('Evaluation update error:', evalError.message, evalError.details, evalError.hint);
            // Fallback: try updating status only
            await supabase.from('evaluations').update({ status: 'approved' }).eq('id', evalId);
        }
        setEvaluations(p => p.map(e => e.id === evalId ? { ...e, status: 'approved', hrRating } : e));
        
        if (theEvalToApprove) {
            const emp = users.find(u => u.id === theEvalToApprove.employeeId);
            console.log(`[Approve] Employee: ${emp?.name} (${emp?.email})`);
            if (emp) {
                createNotification([emp.id], 'Evaluation Approved', 'Your appraisal results are now officially approved and available.', 'success', '/employee/results');
                sendEmailNotification(emp.email, 'Evaluation Finalized', hrApproveEmail(emp.name));
            }
            createNotification([theEvalToApprove.managerId], 'Evaluation Approved', `HR approved your evaluation for ${emp?.name}.`, 'success', '/manager');
        }
    };

    const rejectEvaluation = async (evalId, comment = '') => {
        if (localStorage.getItem('fake_session_role')) {
            setEvaluations(p => {
                const updated = p.map(e => e.id === evalId ? { ...e, status: 'rejected', rejectionComment: comment } : e);
                localStorage.setItem('fake_evaluations', JSON.stringify(updated));
                return updated;
            });
            
            const theEval = evaluations.find(e => e.id === evalId);
            if (theEval) {
                createNotification([theEval.managerId], 'Evaluation Rejected', `HR rejected your evaluation for ${users.find(u => u.id === theEval.employeeId)?.name}. Please review and resubmit.`, 'danger', '/manager');
            }
            return;
        }

        const { error } = await supabase.from('evaluations').update({ status: 'rejected', rejection_comment: comment }).eq('id', evalId);
        if (!error) {
            setEvaluations(p => p.map(e => e.id === evalId ? { ...e, status: 'rejected', rejectionComment: comment } : e));
            const theEval = evaluations.find(e => e.id === evalId);
            if (theEval) {
                createNotification([theEval.managerId], 'Evaluation Rejected', `HR rejected your evaluation for ${users.find(u => u.id === theEval.employeeId)?.name}. Please review and resubmit.`, 'danger', '/manager');
            }
        }
    };

    // ──── Departments & Designations CRUD ────
    const addDepartment = async (name) => {
        const { data, error } = await supabase.from('departments').insert({ name }).select().single();
        if (error) {
            console.error("Supabase addDepartment failed:", error.message);
            return { success: false, error: error.message };
        }
        if (data) setDepartments(p => [...p, { id: data.id, name: data.name }]);
        return { success: true };
    };

    const deleteDepartment = async (id) => {
        const { error } = await supabase.from('departments').delete().eq('id', id);
        if (error) {
            console.error("Supabase deleteDepartment failed:", error.message);
            return { success: false, error: error.message };
        }
        setDepartments(p => p.filter(d => d.id !== id));
        return { success: true };
    };

    const addDesignation = async (name) => {
        const { data, error } = await supabase.from('designations').insert({ name }).select().single();
        if (error) {
            console.error("Supabase addDesignation failed:", error.message);
            return { success: false, error: error.message };
        }
        if (data) setDesignations(p => [...p, { id: data.id, name: data.name }]);
        return { success: true };
    };

    const deleteDesignation = async (id) => {
        const { error } = await supabase.from('designations').delete().eq('id', id);
        if (error) {
            console.error("Supabase deleteDesignation failed:", error.message);
            return { success: false, error: error.message };
        }
        setDesignations(p => p.filter(d => d.id !== id));
        return { success: true };
    };

    // ──── Helpers (pure, not async — use local state) ────
    const getActiveCycle = () => cycles.find(c => c.status === 'active');
    const getUserById = (id) => users.find(u => u.id === id);
    const getTeamEmployees = (managerId) => users.filter(u => String(u.managerId) === String(managerId));
    const getSelfReview = (empId, cycleId) => selfReviews.find(r => String(r.employeeId) === String(empId) && String(r.cycleId) === String(cycleId));
    const getEvaluation = (empId, cycleId) => evaluations.find(e => String(e.employeeId) === String(empId) && String(e.cycleId) === String(cycleId));
    const getScore = (empId, cycleId) => {
        const ev = getEvaluation(empId, cycleId);
        // Only calculate and expose scores once HR has approved the evaluation
        if (!ev || ev.status !== 'approved') return null;

        // Split competencies into Core (Q1-4) and Behavioral (Q5-10)
        const comps = ev.metadata?.competencies || {};
        const CORE_IDS = ['q1', 'q2', 'q3', 'q4'];
        const BEHAVIORAL_IDS = ['q5', 'q6', 'q7', 'q10', 'q11', 'q14'];

        const coreRatings = CORE_IDS.map(id => comps[id]?.rating).filter(r => r > 0);
        const behavioralRatings = BEHAVIORAL_IDS.map(id => comps[id]?.rating).filter(r => r > 0);

        const coreAvg = coreRatings.length > 0 ? coreRatings.reduce((a, b) => a + b, 0) / coreRatings.length : 0;
        const behavioralAvg = behavioralRatings.length > 0 ? behavioralRatings.reduce((a, b) => a + b, 0) / behavioralRatings.length : 0;

        const score = calculateScore(coreAvg, behavioralAvg, ev.subRating || 0, ev.hrRating || 0);
        return { score, category: getCategory(score) };
    };


    return (
        <AppContext.Provider value={{
            currentUser, users, departments, designations, cycles, selfReviews, evaluations, approvals, notifications,
            login, loginWithMicrosoft, logout, register, loginAsFake,
            addUser, updateUser, deleteUser,
            addDepartment, deleteDepartment,
            addDesignation, deleteDesignation,
            addCycle, updateCycle, deleteCycle, requestCycleDelete,
            submitSelfReview, submitEvaluation,
            theme, toggleTheme, refreshData: fetchAllData,
            encryptionKey, setEncryptionKey, resetAndSeedFakeData,
            approveEvaluation, rejectEvaluation,
            getActiveCycle, getUserById,
            getTeamEmployees, getSelfReview, getEvaluation, getScore,
            calculateScore, getCategory,
            createNotification, markNotificationAsRead,
            showDecrypted, setShowDecrypted, canDecrypt,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
