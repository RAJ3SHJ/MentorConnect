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

// POST /api/mentor/link
router.post('/link', auth, async (req, res) => {
    const { mentor_id, student_id } = req.body;
    if (!mentor_id || !student_id)
        return res.status(400).json({ error: 'mentor_id and student_id required' });

    try {
        const existing = await get('SELECT id FROM mentor_assignments WHERE student_id = ?', [student_id]);
        if (existing) {
            await run(`UPDATE mentor_assignments SET mentor_id = ?, assigned_at = ${isPG ? 'CURRENT_TIMESTAMP' : "datetime('now')"} WHERE student_id = ?`,
                [mentor_id, student_id]);
        } else {
            await runGetId('INSERT INTO mentor_assignments (mentor_id, student_id) VALUES (?, ?)',
                [mentor_id, student_id]);
        }
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
        const user = await get('SELECT id, name, email FROM users WHERE id = ?', [req.params.studentId]);
        if (!user) return res.status(404).json({ error: 'Student not found' });

        const skills = await get('SELECT * FROM student_skills WHERE student_id = ?', [req.params.studentId]);
        const submissions = await all(`
            SELECT es.id, es.student_id, es.exam_id, es.answers, es.status,
                   es.mentor_remarks, es.submitted_at, es.reviewed_at, e.title AS exam_title
            FROM exam_submissions es
            JOIN exams e ON e.id = es.exam_id
            WHERE es.student_id = ?
            ORDER BY es.submitted_at DESC
        `, [req.params.studentId]);

        res.json({
            student: user,
            skills: skills ? { ...skills, skills: JSON.parse(skills.skills || '[]') } : null,
            submissions: submissions.map(s => ({ ...s, answers: JSON.parse(s.answers || '[]') })),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/mentor/validate/:submissionId
router.post('/validate/:submissionId', auth, async (req, res) => {
    const { status, remarks } = req.body;
    if (!['Approved', 'Needs Improvement'].includes(status))
        return res.status(400).json({ error: 'status must be Approved or Needs Improvement' });

    try {
        await run(`
            UPDATE exam_submissions
            SET status = ?, mentor_remarks = ?, reviewed_at = ${isPG ? 'CURRENT_TIMESTAMP' : "datetime('now')"}
            WHERE id = ?
        `, [status, remarks || null, req.params.submissionId]);

        // Notify the student of their review result
        try {
            const sub = await get('SELECT student_id FROM exam_submissions WHERE id = ?', [req.params.submissionId]);
            if (sub) {
                await run(
                    'INSERT INTO notifications (type, student_id, reference_id) VALUES (?, ?, ?)',
                    ['exam_reviewed', sub.student_id, req.params.submissionId]
                );
            }
        } catch (_) { /* non-critical — notification failure should not block response */ }

        res.json({ message: 'Validation saved' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/mentor/unified-review/:studentId — unified review for skills and exams
router.post('/unified-review/:studentId', auth, async (req, res) => {
    const { status, remarks } = req.body;
    if (!['Approved', 'Needs Improvement'].includes(status))
        return res.status(400).json({ error: 'status must be Approved or Needs Improvement' });

    try {
        // 1. Update Student Skills
        const skillsRow = await get('SELECT id FROM student_skills WHERE student_id = ?', [req.params.studentId]);
        if (skillsRow) {
            await run(
                `UPDATE student_skills SET status = ?, mentor_remarks = ?, reviewed_at = ${isPG ? 'CURRENT_TIMESTAMP' : "datetime('now')"} WHERE student_id = ?`,
                [status, remarks || null, req.params.studentId]
            );
            
            // Notify for skills
            await run(
                'INSERT INTO notifications (type, student_id, reference_id) VALUES (?, ?, ?)',
                ['skills_reviewed', req.params.studentId, skillsRow.id]
            ).catch(() => {});
        }

        // 2. Update all Pending Exams
        const pendingExams = await all(
            "SELECT id FROM exam_submissions WHERE student_id = ? AND (status = 'Submitted' OR status = 'Pending Review')",
            [req.params.studentId]
        );

        if (pendingExams && pendingExams.length > 0) {
            for (const exam of pendingExams) {
                await run(
                    `UPDATE exam_submissions SET status = ?, mentor_remarks = ?, reviewed_at = ${isPG ? 'CURRENT_TIMESTAMP' : "datetime('now')"} WHERE id = ?`,
                    [status, remarks || null, exam.id]
                );

                // Notify for each exam
                await run(
                    'INSERT INTO notifications (type, student_id, reference_id) VALUES (?, ?, ?)',
                    ['exam_reviewed', req.params.studentId, exam.id]
                ).catch(() => {});
            }
        }

        // 3. Mark all notifications for this student as claimed
        await run(
            'UPDATE mentor_notifications SET is_claimed = 1, claimed_by_mentor_id = ? WHERE student_id = ?',
            [req.user.id, req.params.studentId]
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

// GET /api/mentor/my-students — isolated to current mentor
router.get('/my-students', auth, async (req, res) => {
    try {
        const mentorId = req.user.id; // This is the Supabase UUID from the JWT

        // Fetch students assigned to this specific mentor UID
        const students = await all(`
            SELECT u.id, u.name, u.email, u.created_at, ma.assigned_at
            FROM mentor_assignments ma
            JOIN users u ON u.id = ma.student_id
            WHERE ma.mentor_id = ?
            ORDER BY ma.assigned_at DESC
        `, [mentorId]);

        res.json(students);
    } catch (e) {
        console.error('Fetch Students Error:', e.message);
        res.status(500).json({ error: 'Failed to retrieve your student roster' });
    }
});

// GET /api/mentor/my-assessments — filtered by mentor's assigned students
router.get('/my-assessments', auth, async (req, res) => {
    try {
        const mentorId = req.user.id;

        const submissions = await all(`
            SELECT es.id, es.student_id, es.exam_id, es.answers, es.status,
                   es.mentor_remarks, es.submitted_at, es.reviewed_at, 
                   e.title AS exam_title, u.name AS student_name
            FROM exam_submissions es
            JOIN exams e ON e.id = es.exam_id
            JOIN users u ON u.id = es.student_id
            JOIN mentor_assignments ma ON ma.student_id = u.id
            WHERE ma.mentor_id = ? AND es.status IN ('Submitted', 'Pending Review')
            ORDER BY es.submitted_at DESC
        `, [mentorId]);
        
        const result = submissions.map(sub => ({ 
            ...sub, 
            answers: JSON.parse(sub.answers || '[]') 
        }));
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
        const notifications = await all(`
            SELECT mn.id, mn.student_id, mn.trigger_type, mn.reference_id, mn.created_at,
                   u.name AS student_name, u.email AS student_email,
                   CASE WHEN mn.trigger_type = 'exam' THEN e.title
                        WHEN mn.trigger_type = 'skills' THEN ss.goal
                        ELSE c.title
                   END AS reference_title,
                   es.status AS submission_status
            FROM mentor_notifications mn
            JOIN users u ON u.id = mn.student_id
            LEFT JOIN mentor_assignments ma ON ma.student_id = u.id
            LEFT JOIN exam_submissions es ON es.id = mn.reference_id AND mn.trigger_type = 'exam'
            LEFT JOIN exams e ON e.id = es.exam_id
            LEFT JOIN courses c ON c.id = mn.reference_id AND mn.trigger_type = 'course'
            LEFT JOIN student_skills ss ON ss.id = mn.reference_id AND mn.trigger_type = 'skills'
            WHERE mn.is_claimed = 0 AND (ma.id IS NULL OR ma.mentor_user_id = ?)
            ORDER BY mn.created_at DESC
        `, [req.user.id]);
        res.json(notifications);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/mentor/notification-count — badge count of unclaimed or personal notifications
router.get('/notification-count', auth, async (req, res) => {
    try {
        const row = await get(`
            SELECT COUNT(*) as count 
            FROM mentor_notifications mn
            LEFT JOIN mentor_assignments ma ON ma.student_id = mn.student_id
            WHERE mn.is_claimed = 0 AND (ma.id IS NULL OR ma.mentor_user_id = ?)
        `, [req.user.id]);
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
        const existing = await get('SELECT id FROM mentor_assignments WHERE student_id = ?', [studentId]);
        if (existing) {
            return res.status(409).json({ error: 'Student already connected to another mentor' });
        }

        await runGetId(
            'INSERT INTO mentor_assignments (mentor_id, student_id, mentor_user_id) VALUES (?, ?, ?)',
            [mentorId, studentId, mentorUserId]
        );

        await run('UPDATE users SET mentor_id = ? WHERE id = ?', [mentorUserId, studentId]);

        await run(
            'UPDATE mentor_notifications SET is_claimed = 1, claimed_by_mentor_id = ? WHERE student_id = ?',
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
