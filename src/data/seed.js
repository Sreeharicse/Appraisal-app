// Seed data for the appraisal app
export const DEMO_USERS = [
    { id: 'u1', name: 'Sarah Mitchell', email: 'admin@company.com', password: 'admin123', role: 'hr', department: 'Human Resources', avatar: 'SM' },
    { id: 'u2', name: 'David Chen', email: 'manager@company.com', password: 'manager123', role: 'manager', department: 'Engineering', avatar: 'DC' },
    { id: 'u3', name: 'Priya Sharma', email: 'employee@company.com', password: 'emp123', role: 'employee', department: 'Engineering', managerId: 'u2', avatar: 'PS' },
    { id: 'u4', name: 'James Wilson', email: 'emp2@company.com', password: 'emp123', role: 'employee', department: 'Engineering', managerId: 'u2', avatar: 'JW' },
    { id: 'u5', name: 'Aisha Patel', email: 'mgr2@company.com', password: 'manager123', role: 'manager', department: 'Product', avatar: 'AP' },
    { id: 'u6', name: 'Carlos Rivera', email: 'emp3@company.com', password: 'emp123', role: 'employee', department: 'Product', managerId: 'u5', avatar: 'CR' },
];

export const DEMO_CYCLES = [
    {
        id: 'c1',
        name: 'Annual Review 2025',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active',
        createdBy: 'u1',
    },
    {
        id: 'c2',
        name: 'Mid-Year Review 2024',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        status: 'closed',
        createdBy: 'u1',
    },
];

export const DEMO_GOALS = [
    { id: 'g1', cycleId: 'c1', employeeId: 'u3', managerId: 'u2', title: 'Complete React Migration', description: 'Migrate legacy jQuery code to React components', weightage: 40, deadline: '2025-09-30', status: 'active' },
    { id: 'g2', cycleId: 'c1', employeeId: 'u3', managerId: 'u2', title: 'Improve Test Coverage', description: 'Increase unit test coverage from 60% to 85%', weightage: 30, deadline: '2025-08-31', status: 'active' },
    { id: 'g3', cycleId: 'c1', employeeId: 'u3', managerId: 'u2', title: 'Team Knowledge Sharing', description: 'Conduct 4 internal tech talks during the year', weightage: 30, deadline: '2025-12-01', status: 'active' },
    { id: 'g4', cycleId: 'c1', employeeId: 'u4', managerId: 'u2', title: 'API Performance Optimization', description: 'Reduce average API response time by 40%', weightage: 50, deadline: '2025-10-31', status: 'active' },
    { id: 'g5', cycleId: 'c1', employeeId: 'u4', managerId: 'u2', title: 'Documentation Improvement', description: 'Document all backend services with Swagger', weightage: 50, deadline: '2025-11-30', status: 'active' },
    { id: 'g6', cycleId: 'c1', employeeId: 'u6', managerId: 'u5', title: 'Product Roadmap Delivery', description: 'Deliver 90% of roadmap items on schedule', weightage: 60, deadline: '2025-12-01', status: 'active' },
    { id: 'g7', cycleId: 'c1', employeeId: 'u6', managerId: 'u5', title: 'User Research & Feedback', description: 'Conduct 10 user interviews and create insights report', weightage: 40, deadline: '2025-09-30', status: 'active' },
];

export const DEMO_SELF_REVIEWS = [
    {
        id: 'sr1', cycleId: 'c1', employeeId: 'u3',
        summary: 'I have made significant progress on the React migration, completing about 70% of planned components. Test coverage has improved to 78%. Delivered 3 out of 4 planned tech talks.',
        goalRatings: { g1: 4, g2: 4, g3: 3 },
        comments: 'I believe I have been a strong contributor this year and look forward to completing the remaining tasks.',
        submittedAt: '2025-11-10',
    },
    {
        id: 'sr2', cycleId: 'c1', employeeId: 'u4',
        summary: 'Reduced API response times by 35% already. Swagger docs are mostly done.',
        goalRatings: { g4: 4, g5: 3 },
        comments: 'Good progress overall this year.',
        submittedAt: '2025-11-12'
    },
    {
        id: 'sr3', cycleId: 'c1', employeeId: 'u6',
        summary: 'Delivered 80% of roadmap items on time. Conducted 6 user interviews.',
        goalRatings: { g6: 3, g7: 3 },
        comments: 'Solid year, moving towards completion.',
        submittedAt: '2025-11-15'
    }
];

export const DEMO_EVALUATIONS = [
    {
        id: 'ev1', cycleId: 'c1', employeeId: 'u3', managerId: 'u2',
        goalRatings: { g1: 4, g2: 4, g3: 3 },
        workPerformanceRating: 4,
        behavioralRating: 4,
        feedback: 'Priya has been an exceptional team member this year. Her technical skills are top notch and she has great collaboration spirit. The React migration is on track. Looking forward to seeing more leadership from her.',
        status: 'pending_approval',
        submittedAt: '2025-11-20',
    },
    {
        id: 'ev2', cycleId: 'c1', employeeId: 'u4', managerId: 'u2',
        goalRatings: { g4: 4, g5: 3 },
        workPerformanceRating: 3,
        behavioralRating: 3,
        feedback: 'James is a solid performer. The API optimization work is impressive.',
        status: 'approved',
        submittedAt: '2025-11-22',
    },
    {
        id: 'ev3', cycleId: 'c1', employeeId: 'u6', managerId: 'u5',
        goalRatings: { g6: 3, g7: 3 },
        workPerformanceRating: 5,
        behavioralRating: 4,
        feedback: 'Carlos has good attention to user needs. Roadmap delivery was solid.',
        status: 'approved',
        submittedAt: '2025-11-23',
    }
];

export const DEMO_APPROVED = [];

export const PERFORMANCE_CATEGORIES = [
    { min: 90, label: 'Outstanding', color: '#10b981', badge: 'badge-green' },
    { min: 75, label: 'Exceeds Expectations', color: '#06b6d4', badge: 'badge-blue' },
    { min: 60, label: 'Meets Expectations', color: '#7c3aed', badge: 'badge-purple' },
    { min: 45, label: 'Needs Improvement', color: '#f59e0b', badge: 'badge-yellow' },
    { min: 0, label: 'Unsatisfactory', color: '#ef4444', badge: 'badge-red' },
];

export function calculateScore(goals, goalRatings, workRating, behaviorRating) {
    const workScore = (workRating / 5) * 100 || 0;
    const behaviorScore = (behaviorRating / 5) * 100 || 0;
    return Math.round(workScore * 0.5 + behaviorScore * 0.5);
}

export function getCategory(score) {
    for (const cat of PERFORMANCE_CATEGORIES) {
        if (score >= cat.min) return cat;
    }
    return PERFORMANCE_CATEGORIES[PERFORMANCE_CATEGORIES.length - 1];
}
