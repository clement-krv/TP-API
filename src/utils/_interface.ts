export interface User {
    id?: number;
    email: string;
    password: string;
    role: 'STUDENT' | 'ADMIN';
  }
  
  export interface Course {
    id?: number;
    title: string;
    date: string;
    heure: string;
  }
  
  export interface StudentCourse {
    id?: number;
    studentId: number;
    courseId: number;
    registeredAt: string | null;
    signedAt: string | null; 
  }
  
  export interface DBSchema {
    users: User[];
    courses: Course[];
    studentCourses: StudentCourse[];
  }