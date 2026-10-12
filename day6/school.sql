
-- Day 6 Assignment: School Database
-- SQLite

PRAGMA foreign_keys = ON;

-- 1. Create the students table
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- 2. Create the courses table
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL UNIQUE,
    credits INTEGER NOT NULL
);

-- 3. Create the enrolments table
-- This table connects students and courses.
CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,

    FOREIGN KEY (student_id)
        REFERENCES students(student_id),

    FOREIGN KEY (course_id)
        REFERENCES courses(course_id),

    UNIQUE (student_id, course_id)
);

-- 4. Insert at least 3 students
INSERT INTO students (student_id, name, email) VALUES
(1, 'Ali Hassan', 'ali@example.com'),
(2, 'Mary Wanjiku', 'mary@example.com'),
(3, 'John Kamau', 'john@example.com');

-- 5. Insert at least 3 courses
INSERT INTO courses (course_id, course_name, credits) VALUES
(1, 'Database Systems', 3),
(2, 'Web Development', 4),
(3, 'Computer Networks', 3);

-- 6. Insert at least 5 enrolments
INSERT INTO enrolments
    (enrolment_id, student_id, course_id, grade)
VALUES
(1, 1, 1, 'B'),
(2, 1, 2, 'A'),
(3, 2, 1, 'A'),
(4, 2, 3, 'B'),
(5, 3, 2, 'C');

-- 7. Query 1: All courses taken by one student
-- Example student: Ali Hassan
SELECT s.name, c.course_name, e.grade
FROM students AS s
JOIN enrolments AS e ON s.student_id = e.student_id
JOIN courses AS c ON e.course_id = c.course_id
WHERE s.name = 'Ali Hassan';

-- 8. Query 2: All students enrolled in one course
-- Example course: Database Systems
SELECT c.course_name, s.name
FROM courses AS c
JOIN enrolments AS e ON c.course_id = e.course_id
JOIN students AS s ON e.student_id = s.student_id
WHERE c.course_name = 'Database Systems';

-- 9. Query 3: Number of students per course
-- LEFT JOIN also includes courses with zero enrolments.
SELECT c.course_name,
       COUNT(e.student_id) AS student_count
FROM courses AS c
LEFT JOIN enrolments AS e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name;

-- 10. Query 4: Students who have no enrolments
SELECT s.student_id, s.name
FROM students AS s
LEFT JOIN enrolments AS e ON s.student_id = e.student_id
WHERE e.student_id IS NULL;

-- 11. Query 5: Update one enrolment's grade
-- Change Ali Hassan's Database Systems grade from B to A.
UPDATE enrolments
SET grade = 'A'
WHERE enrolment_id = 1;

-- Verify the grade update
SELECT s.name, c.course_name, e.grade
FROM enrolments AS e
JOIN students AS s ON e.student_id = s.student_id
JOIN courses AS c ON e.course_id = c.course_id
WHERE e.enrolment_id = 1;

-- 12. Add an index to help find students enrolled in a course.
CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);
