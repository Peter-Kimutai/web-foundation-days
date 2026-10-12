
# School Database Design

## 1. Table Explanations

### Students
The students table stores information about each student, including their unique student ID, name and email address. The student ID is the primary key, while the email is required and must be unique to prevent duplicate student email addresses.

### Courses
The courses table stores the courses offered by the school. Each course has a unique course ID, a course name and a credit value. The course ID is the primary key, and the course name is required and unique.

### Enrolments
The enrolments table records which students are enrolled in which courses. It contains an enrolment ID, student ID, course ID and grade. The student ID and course ID are foreign keys referencing the students and courses tables. A unique constraint on the combination of student ID and course ID prevents a student from enrolling in the same course more than once.

## 2. Relationships

The relationship between students and enrolments is one-to-many because one student can enrol in several courses, while each enrolment record belongs to one student.

The relationship between courses and enrolments is also one-to-many because one course can have many students enrolled in it, while each enrolment record refers to one course.

The relationship between students and courses is many-to-many because one student can take multiple courses and each course can have multiple students.

A join table called enrolments is needed to implement the many-to-many relationship in a relational database. It stores the student ID and course ID for each enrolment and also records the student's grade for that course.

## 3. Recommended Index

I would add an index on enrolments(course_id). This helps the database locate enrolments for a particular course more efficiently, especially when finding all students taking a course. The index can improve retrieval performance as the number of enrolment records grows, although it requires additional storage and can add overhead to data modifications.

## 4. SQL or NoSQL?

I would choose a relational SQL database such as SQLite for this school system. The data has clear relationships between students, courses and enrolments, and the system requires primary keys, foreign keys, unique constraints and reliable updates. SQL supports JOIN operations for retrieving related information and GROUP BY for calculating the number of students per course. A relational database is therefore suitable for maintaining data consistency and reducing duplication. A NoSQL database could be useful for more flexible or unstructured data, but its flexibility is not necessary for the core requirements of this system.
