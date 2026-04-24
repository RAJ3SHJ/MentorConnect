const router = require('express').Router();
const { run, get, all, runGetId, isPG } = require('../db');
const auth = require('../middleware/auth');

// GET /api/mentor/students
router.get('/students', auth, async (req, res) => {
    try {
        const students = await all(`
            SELECT u.id, u.name, u.email, u.created_at,
                   m.id AS mentor_id, m.name AS mentor_name
            FROM users u
            LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
            LEFT JOIN mentors m ON m.id = ma.mentor_id
            ORDER BY u.created_at DESC
        `);
        res.json(students);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/mentor/my-students
router.get('/my-students', auth, async (req, res) => {
    try {
        const students = await all(`
            SELECT u.id, u.name, u.email, es.status as status, u.created_at,
                   (SELECT COUNT(*) FROM roadmap r WHERE r.student_id = u.id) as has_roadmap
            FROM users u
            JOIN exam_submissions es ON es.student_id = u.id
            LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
            WHERE (ma.mentor_user_id = ? OR u.mentor_id = ?)
              AND es.status IN ('pending_roadmap', 'active')
            ORDER BY u.created_at DESC
        `, [req.user.id, req.user.id]);
        res.json(students);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/mentor/student-status/:studentId — Update learner workflow status
router.patch('/student-status/:studentId', auth, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { status } = req.body; // e.g., 'pending_roadmap', 'active'
        const mentorId = req.user.id;
        
        if (!['awaiting_review', 'pending_roadmap', 'active'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Set status in exam_submissions instead of users table
        await run('UPDATE exam_submissions SET status = ? WHERE student_id = ?', [status, studentId]);

        // Safer approach: Verify the submission exists
        const exists = await get('SELECT id FROM exam_submissions WHERE student_id = ?', [studentId]);
        if (!exists) {
            return res.status(404).json({ error: 'Learner exam submission not found' });
        }

        // Trigger: Simultaneously insert a new record into the roadmap table
        if (status === 'pending_roadmap') {
            const existingRoadmap = await get('SELECT id FROM roadmap WHERE student_id = ?', [studentId]);
            if (!existingRoadmap) {
                await run('INSERT INTO roadmap (student_id) VALUES (?)', [studentId]);
            }
        }
        res.json({ 
            message: 'Status updated successfully', 
            studentId, 
            status,
            mentor_id: mentorId 
        });
    } catch (e) { 
        console.error('Status Update Error:', e.message);
        res.status(500).json({ error: e.message || 'Database permission denied or network error' }); 
    }
});

// POST /api/mentor/link
router.post('/link', auth, async (req, res) => {
    const { mentor_id, student_id } = req.body;
    if (!mentor_id || !student_id)
        return res.status(400).json({ error: 'mentor_id and student_id required' });

    try {
        // Resolve mentor's user ID (Supabase UID) for dashboard consistency
        const mentorProfile = await get('SELECT email FROM mentors WHERE id = ?', [mentor_id]);
        let mentorUserId = mentor_id; // Default to the ID passed
        if (mentorProfile) {
            const mentorUser = await get('SELECT id FROM users WHERE email = ?', [mentorProfile.email]);
            if (mentorUser) mentorUserId = mentorUser.id;
        }

        const existing = await get('SELECT id FROM mentor_assignments WHERE student_id = ?', [student_id]);
        if (existing) {
            await run(`UPDATE mentor_assignments SET mentor_id = ?, mentor_user_id = ?, assigned_at = ${isPG ? 'CURRENT_TIMESTAMP' : "datetime('now')"} WHERE student_id = ?`,
                [mentor_id, mentorUserId, student_id]);
        } else {
            await runGetId('INSERT INTO mentor_assignments (mentor_id, student_id, mentor_user_id) VALUES (?, ?, ?)',
                [mentor_id, student_id, mentorUserId]);
        }

        // Also update users table for redundancy/inclusive queries
        await run('UPDATE users SET mentor_id = ? WHERE id = ?', [mentorUserId, student_id]);

        res.json({ message: 'Mentor linked to student' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/mentor/submissions/:studentId
router.get('/submissions/:studentId', auth, async (req, res) => {
    try {
        const submissions = await all(`
            SELECT es.id, es.student_id, es.exam_id, es.answers, es.status,
                   es.mentor_remarks, es.submitted_at, es.reviewed_at, e.title AS exam_title
            FROM exam_submissions es
            JOIN exams e ON e.id = es.exam_id
            WHERE es.student_id = ?
            ORDER BY es.submitted_at DESC
        `, [req.params.studentId]);

        const result = submissions.map(sub => ({
            ...sub,
            answers: JSON.parse(sub.answers || '[]'),
        }));
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/mentor/student-detail/:studentId
router.get('/student-detail/:studentId', auth, async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const mentorUserId = req.user.id; // Supabase UID from JWT

        const [user, skills, submissions, assignment] = await Promise.all([
            get('SELECT id, name, email FROM users WHERE id = ?', [studentId]),
            get('SELECT * FROM student_skills WHERE student_id = ?', [studentId]),
            all(`
                SELECT es.id, es.student_id, es.exam_id, es.answers, es.status,
                       es.mentor_remarks, es.submitted_at, es.reviewed_at, e.title AS exam_title
                FROM exam_submissions es
                JOIN exams e ON e.id = es.exam_id
                WHERE es.student_id = ?
                ORDER BY es.submitted_at DESC
            `, [studentId]),
            get('SELECT id FROM mentor_assignments WHERE student_id = ? AND mentor_user_id = ?', [studentId, mentorUserId])
        ]);

        if (!user) return res.status(404).json({ error: 'Student not found' });

        res.json({
            student: user,
            skills: skills ? { ...skills, skills: JSON.parse(skills.skills || '[]') } : null,
            submissions: submissions.map(s => ({ ...s, answers: JSON.parse(s.answers || '[]') })),
            isConnected: !!assignment
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/mentor/validate/:submissionId
router.post('/validate/:submissionId', auth, async (req, res) => {
    const { status, remarks, type } = req.body;
    if (!['Approved', 'Needs Improvement'].includes(status))
        return res.status(400).json({ error: 'status must be Approved or Needs Improvement' });

    try {
        const submissionId = req.params.submissionId;
        const tableName = type === 'skills' ? 'student_skills' : 'exam_submissions';
        
        await run(`
            UPDATE ${tableName}
            SET status = ?, mentor_remarks = ?, reviewed_at = ${isPG ? 'CURRENT_TIMESTAMP' : "datetime('now')"}
            WHERE id = ?
        `, [status, remarks || null, submissionId]);

        // Notify the student
        try {
            const sub = await get(`SELECT student_id FROM ${tableName} WHERE id = ?`, [submissionId]);
            if (sub) {
                await run(
                    'INSERT INTO notifications (type, student_id, reference_id) VALUES (?, ?, ?)',
                    ['assessment_reviewed', sub.student_id, submissionId]
                );
            }
        } catch (_) {}

        res.json({ message: 'Validation saved' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/mentor/unified-review/:studentId
router.post('/unified-review/:studentId', auth, async (req, res) => {
    const { skillRemarks, examRemarks } = req.body;
    const status = 'Approved'; 

    try {
        const mentorUserId = req.user.id;
        const studentId = req.params.studentId;

        // Verify connection exists
        const assignment = await get('SELECT id FROM mentor_assignments WHERE student_id = ? AND mentor_user_id = ?', [studentId, mentorUserId]);
        if (!assignment) {
            return res.status(403).json({ error: 'You must connect with this student before submitting a review.' });
        }

        // 1. Update Student Skills
        const skillsRow = await get('SELECT id FROM student_skills WHERE student_id = ?', [studentId]);
        if (skillsRow) {
            await run(
                `UPDATE student_skills SET status = ?, mentor_remarks = ?, reviewed_at = ${isPG ? 'CURRENT_TIMESTAMP' : "datetime('now')"} WHERE student_id = ?`,
                [status, skillRemarks || null, studentId]
            );
            
            // Notify for skills
            await run(
                'INSERT INTO notifications (type, student_id, reference_id) VALUES (?, ?, ?)',
                ['skills_reviewed', studentId, skillsRow.id]
            ).catch(() => {});
        }

        // 2. Update all Pending Exams
        const pendingExams = await all(
            "SELECT id FROM exam_submissions WHERE student_id = ? AND status IN ('submitted', 'Submitted', 'Pending Review')",
            [studentId]
        );

        if (pendingExams && pendingExams.length > 0) {
            for (const exam of pendingExams) {
                await run(
                    `UPDATE exam_submissions SET status = ?, mentor_remarks = ?, reviewed_at = ${isPG ? 'CURRENT_TIMESTAMP' : "datetime('now')"} WHERE id = ?`,
                    [status, examRemarks || null, exam.id]
                );

                // Notify for each exam
                await run(
                    'INSERT INTO notifications (type, student_id, reference_id) VALUES (?, ?, ?)',
                    ['exam_reviewed', studentId, exam.id]
                ).catch(() => {});
            }
        }

        // 3. Mark all notifications for this student as claimed
        await run(
            'UPDATE mentor_notifications SET is_claimed = 1, claimed_by_mentor_id = ? WHERE student_id = ?',
            [mentorUserId, studentId]
        ).catch(() => {});

        res.json({ 
            message: 'Unified review submitted successfully ✅',
            skillsUpdated: !!skillsRow,
            examsUpdated: pendingExams?.length || 0
        });
    } catch (e) {
        console.error('Unified Review Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/mentor/assign-course
router.post('/assign-course', auth, async (req, res) => {
    const { student_id, course_ids } = req.body;
    if (!student_id || !Array.isArray(course_ids) || course_ids.length === 0)
        return res.status(400).json({ error: 'student_id and course_ids[] required' });

    try {
        for (const cid of course_ids) {
            const existing = await get('SELECT id FROM roadmap WHERE student_id = ? AND course_id = ?', [student_id, cid]);
            if (!existing) {
                await runGetId('INSERT INTO roadmap (student_id, course_id) VALUES (?, ?)', [student_id, cid]);
            }
        }
        res.json({ message: `${course_ids.length} course(s) assigned` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/mentor/list
router.get('/list', auth, async (req, res) => {
    try {
        const mentors = await all('SELECT * FROM mentors ORDER BY name');
        res.json(mentors);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PHASE 2: COMMAND CENTER ROUTES ───



// GET /api/mentor/my-assessments — filtered by mentor's assigned students
router.get('/my-assessments', auth, async (req, res) => {
    try {
        const mentorUserId = req.user.id;

        // 1. Fetch Exam Submissions
        const examSubmissions = await all(`
            SELECT es.id, es.student_id, 'exam' as type, es.exam_id, es.answers, es.status,
                   es.mentor_remarks, es.submitted_at, e.title AS exam_title, u.name AS student_name
            FROM exam_submissions es
            JOIN exams e ON e.id = es.exam_id
            JOIN users u ON u.id = es.student_id
            LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
            WHERE (ma.mentor_user_id = ? OR u.mentor_id = ?) AND es.status IN ('Submitted', 'Pending Review')
        `, [mentorUserId, mentorUserId]);

        // 2. Fetch Skills Submissions
        const skillsSubmissions = await all(`
            SELECT ss.id, ss.student_id, 'skills' as type, ss.goal, ss.skills as answers, ss.status,
                   ss.mentor_remarks, ss.submitted_at, 'Skills Assessment' AS exam_title, u.name AS student_name
            FROM student_skills ss
            JOIN users u ON u.id = ss.student_id
            LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
            WHERE (ma.mentor_user_id = ? OR u.mentor_id = ?) AND ss.status IN ('Submitted', 'Pending Review')
        `, [mentorUserId, mentorUserId]);

        // 3. Combine and Assign Priority Rankings
        const combined = [
            ...skillsSubmissions.map(s => ({ ...s, sort_rank: 1 })),
            ...examSubmissions.map(e => ({ ...e, sort_rank: 2, goal: null, exam_id: e.exam_id }))
        ];

        // 4. Enrichment Phase: Fetch Questions for Exams
        const rawExamIds = combined.filter(s => s.type === 'exam').map(s => s.exam_id);
        const examIds = [...new Set(rawExamIds)].filter(id => id !== undefined && id !== null).map(String);
        let questionsMap = {};

        if (examIds.length > 0 && supabaseAdmin) {
            try {
                const { data: qs, error } = await supabaseAdmin
                    .from('questions')
                    .select('*')
                    .in('exam_id', examIds);
                
                if (!error && qs) {
                    qs.forEach(q => {
                        const eid = String(q.exam_id);
                        if (!questionsMap[eid]) questionsMap[eid] = [];
                        questionsMap[eid].push(q);
                    });
                }
            } catch (sqErr) {
                console.error('❌ Supabase Connect Error:', sqErr.message);
            }
        }
        
        const result = combined.map(sub => {
            let parsedAnswers = [];
            try {
                parsedAnswers = typeof sub.answers === 'string' ? JSON.parse(sub.answers || '[]') : sub.answers;
            } catch (e) {
                parsedAnswers = sub.answers;
            }

            return { 
                ...sub, 
                answers: parsedAnswers,
                questions: sub.type === 'exam' ? (questionsMap[String(sub.exam_id)] || []) : null
            };
        }).sort((a, b) => a.sort_rank - b.sort_rank || new Date(b.submitted_at) - new Date(a.submitted_at));

        res.json(result);
    } catch (e) {
        console.error('Fetch Assessments Error:', e.message);
        res.status(500).json({ error: 'Failed to retrieve pending assessments' });
    }
});

// POST /api/mentor/courses
router.post('/courses', auth, async (req, res) => {
    const { title, description, link, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Course title required' });
    
    try {
        const courseId = await runGetId(
            'INSERT INTO courses (title, description, link, category, created_by_role, created_by_id) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description || null, link || null, category || null, req.user.role || 'mentor', req.user.id]
        );
        res.status(201).json({ message: 'Course created by Mentor', courseId });
    } catch (e) {
        res.status(500).json({ error: 'Failed to create course' });
    }
});

// ─── PHASE 6: NOTIFICATION & CONNECT SYSTEM ───

// GET /api/mentor/notifications — get unclaimed or personal notifications
router.get('/notifications', auth, async (req, res) => {
    try {
        const mentorUserId = req.user.id;
        // Also get the internal mentor profile ID to be safe
        const mentorProfile = await get('SELECT id FROM mentors WHERE email = ?', [req.user.email]);
        const mentorId = mentorProfile ? mentorProfile.id : null;

        const notifications = await all(`
            SELECT mn.id, mn.student_id, mn.trigger_type, mn.reference_id, mn.created_at,
                   u.name AS student_name, u.email AS student_email, u.status AS student_status,
                   CASE WHEN mn.trigger_type = 'exam' THEN e.title
                        WHEN mn.trigger_type = 'skills' THEN ss.goal
                        ELSE c.title
                   END AS reference_title,
                   es.status AS submission_status,
                   (CASE 
                        WHEN ma.mentor_user_id = ? 
                          OR (ma.mentor_id IS NOT NULL AND ma.mentor_id = ?)
                          OR u.mentor_id = ? 
                          OR (u.mentor_id IS NOT NULL AND u.mentor_id = ?)
                        THEN 1 ELSE 0 
                    END) as is_connected_to_me,
                   ma.mentor_user_id as claimed_by_uid
            FROM mentor_notifications mn
            JOIN users u ON u.id = mn.student_id
            LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
            LEFT JOIN exam_submissions es ON es.id = mn.reference_id AND mn.trigger_type = 'exam'
            LEFT JOIN exams e ON e.id = es.exam_id
            LEFT JOIN courses c ON c.id = mn.reference_id AND mn.trigger_type = 'course'
            LEFT JOIN student_skills ss ON ss.id = mn.reference_id AND mn.trigger_type = 'skills'
            WHERE mn.is_claimed = 0 
              AND es.status IN ('submitted', 'Submitted', 'Pending Review')
              AND (
                ma.id IS NULL 
                OR ma.mentor_user_id = ? 
                OR (ma.mentor_id IS NOT NULL AND ma.mentor_id = ?)
                OR u.mentor_id = ?
                OR (u.mentor_id IS NOT NULL AND u.mentor_id = ?)
              )
            ORDER BY mn.created_at DESC
        `, [
            mentorUserId, mentorId, mentorUserId, mentorId, // For CASE
            mentorUserId, mentorId, mentorUserId, mentorId  // For WHERE
        ]);
        res.json(notifications);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/mentor/notification-count — badge count of unclaimed or personal notifications
router.get('/notification-count', auth, async (req, res) => {
    try {
        const mentorUserId = req.user.id;
        const mentorProfile = await get('SELECT id FROM mentors WHERE email = ?', [req.user.email]);
        const mentorId = mentorProfile ? mentorProfile.id : null;

        const row = await get(`
            SELECT COUNT(DISTINCT mn.student_id) as count 
            FROM mentor_notifications mn
            JOIN users u ON u.id = mn.student_id
            LEFT JOIN exam_submissions es ON es.id = mn.reference_id AND mn.trigger_type = 'exam'
            LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
            WHERE mn.is_claimed = 0 
              AND es.status IN ('submitted', 'Submitted', 'Pending Review')
              AND (
                ma.id IS NULL 
                OR ma.mentor_user_id = ? 
                OR (ma.mentor_id IS NOT NULL AND ma.mentor_id = ?)
                OR u.mentor_id = ?
                OR (u.mentor_id IS NOT NULL AND u.mentor_id = ?)
              )
        `, [
            mentorUserId, mentorId, mentorUserId, mentorId
        ]);
        res.json({ count: row ? row.count : 0 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/mentor/connect/:studentId — ATOMIC student claim (race-condition-proof)
router.post('/connect/:studentId', auth, async (req, res) => {
    try {
        const studentId = req.params.studentId; // Keep as string — supports both integers and UUIDs
        const mentorUserId = req.user.id;
        const mentorEmail = req.user.email;
        const mentorName = req.user.name || mentorEmail;

        // Resolve mentor_id from the mentors table — auto-provision if needed
        let mentorProfile = await get('SELECT id FROM mentors WHERE email = ?', [mentorEmail]);
        if (!mentorProfile) {
            // Cloud-registered mentor — auto-create a mentors row using their user ID
            await run(
                'INSERT INTO mentors (id, name, email) VALUES (?, ?, ?)',
                [mentorUserId, mentorName, mentorEmail]
            );
            mentorProfile = await get('SELECT id FROM mentors WHERE email = ?', [mentorEmail]);
        }
        if (!mentorProfile) {
            return res.status(500).json({ error: 'Could not resolve mentor profile — please contact admin' });
        }
        const mentorId = mentorProfile.id;

        // Check if student is already connected to ANY mentor
        const existing = await get('SELECT mentor_user_id FROM mentor_assignments WHERE student_id = ?', [studentId]);
        if (existing) {
            if (existing.mentor_user_id === mentorUserId) {
                return res.json({ message: 'Already connected to student', studentId });
            }
            return res.status(409).json({ error: 'Student already connected to another mentor' });
        }

        await runGetId(
            'INSERT INTO mentor_assignments (mentor_id, student_id, mentor_user_id) VALUES (?, ?, ?)',
            [mentorId, studentId, mentorUserId]
        );

        await run('UPDATE users SET mentor_id = ? WHERE id = ?', [mentorUserId, studentId]);
        // Mark notifications as owned by this mentor but DON'T hide them yet.
        // They should remain visible until the mentor completes review + assigns roadmap.
        await run(
            'UPDATE mentor_notifications SET claimed_by_mentor_id = ? WHERE student_id = ? AND is_claimed = 0',
            [mentorUserId, studentId]
        );

        res.json({ message: 'Successfully connected to student', studentId });
    } catch (e) {
        if (e.message && e.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Student was just claimed by another mentor' });
        }
        console.error('Connect Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/mentor/feedback/:submissionId — give structured feedback on an exam
router.post('/feedback/:submissionId', auth, async (req, res) => {
    const { rating, verdict, comment } = req.body;
    if (!verdict || !['Approved', 'Needs Improvement'].includes(verdict)) {
        return res.status(400).json({ error: 'verdict must be "Approved" or "Needs Improvement"' });
    }
    if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }

    try {
        await run(`
            UPDATE exam_submissions
            SET status = ?, mentor_remarks = ?, rating = ?, verdict = ?, reviewed_at = ${isPG ? 'CURRENT_TIMESTAMP' : "datetime('now')"}
            WHERE id = ?
        `, [verdict, comment || null, rating || null, verdict, req.params.submissionId]);

        res.json({ message: 'Feedback submitted successfully' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
