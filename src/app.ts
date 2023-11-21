import express from 'express';
import bodyParser from 'body-parser';
import basicAuth from 'express-basic-auth';
import low, { LowdbSync } from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import * as yup from 'yup';
import path from 'path';
import { parse, format } from 'date-fns';

import { User, Course, StudentCourse, DBSchema } from './utils/_interface';
import { userSchema, courseSchema, studentCourseSchema } from './utils/_schema';

const adapter = new FileSync<DBSchema>('db.json');
const db = low(adapter);

const apiRouter = express.Router();
const userRouter = express.Router();

const app = express();
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../public/pages'));

const users = db.get('users').value();
const basicAuthUsers = users.reduce((acc: { [key: string]: string }, user: User) => {
  acc[user.email] = user.password;
  return acc;
}, {});

function checkRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (req.user.role !== role) {
      return res.status(403).send({ message: 'Accès refusé' });
    }
    next();
  };
}

apiRouter.use(basicAuth({
  users: basicAuthUsers,
  challenge: true,
  unauthorizedResponse: 'Nom d\'utilisateur ou mot de passe incorrect',
}));

apiRouter.use((req: any, res, next) => {
  const authenticatedUser = users.find(user => user.email === req.auth.user);
  if (authenticatedUser) {
    req.user = authenticatedUser;
  }
  next();
});

apiRouter.get('/', (req, res) => {
  res.status(200).send({ message: 'Vous êtes connecté!' });
});

apiRouter.post('/add-users', checkRole('ADMIN'), async (req, res) => {
  let newUser: User;

  try {
    newUser = userSchema.validateSync(req.body);
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
    }
    return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
  }

  newUser = userSchema.cast(newUser);

  const existingUser = db.get('users').find({ email: newUser.email }).value();
  if (existingUser) {
    return res.status(409).send({ message: 'Un utilisateur avec cet email existe déjà' });
  }

  const newId = db.get('users').size().value() + 1;
  newUser.id = newId;

  db.get('users').push(newUser).write();

  res.status(201).send({ message: 'Utilisateur ajouté avec succès' });

  apiRouter.get('/courses', (req, res) => {
    const courses = db.get('courses').value();
    res.status(200).send(courses);
  });
});

apiRouter.post('/add-courses', checkRole('ADMIN'), (req, res) => {
  let newCourse: Course;

  try {
    newCourse = courseSchema.validateSync(req.body);
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
    }
    return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
  }

  newCourse = courseSchema.cast(newCourse);

  const newId = db.get('courses').size().value() + 1;
  newCourse.id = newId;

  db.get('courses').push(newCourse).write();

  res.status(201).send({ message: 'Cours ajouté avec succès' });
});

apiRouter.post('/add-studentcourse', checkRole('ADMIN'), (req, res) => {
  let newStudentCourse: StudentCourse = {
    ...req.body,
    registeredAt: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };

  const student = db.get('users').find({ id: newStudentCourse.studentId, role: 'STUDENT' }).value();
  if (!student) {
    return res.status(400).send({ message: 'L\'ID fourni ne correspond pas à un étudiant' });
  }

  try {
    newStudentCourse = studentCourseSchema.validateSync(newStudentCourse);
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
    }
    return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
  }

  newStudentCourse = studentCourseSchema.cast(newStudentCourse);

  const existingCourse = db.get('courses').find({ id: newStudentCourse.courseId }).value();
  if (!existingCourse) {
    return res.status(400).send({ message: 'Le cours avec cet ID n\'existe pas' });
  }

  const existingUser = db.get('users').find({ id: newStudentCourse.studentId }).value();
  if (!existingUser) {
    return res.status(400).send({ message: 'L\'utilisateur avec cet ID n\'existe pas' });
  }

  const newId = db.get('studentCourses').value().length + 1;
  newStudentCourse.id = newId;

  const now = new Date();
  const date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  newStudentCourse.registeredAt = `${date} ${time}`;

  db.get('studentCourses').push(newStudentCourse).write();

  res.status(201).send({ message: 'Inscription de l\'étudiant au cours ajoutée avec succès' });
});

apiRouter.patch('/sign-course', checkRole('STUDENT'), (req, res) => {
  const { studentId, courseId } = req.body;

  const user = (req as any).user;
  if (user && user.id !== studentId) {
    return res.status(403).send({ message: 'Vous ne pouvez signer que vos propres cours' });
  }
  let studentCourse = db.get('studentCourses').find({ studentId, courseId }).value();

  if (!studentCourse) {
    return res.status(400).send({ message: 'Le cours avec cet ID n\'existe pas pour cet étudiant' });
  }

  if (studentCourse.signedAt) {
    return res.status(400).send({ message: 'Le cours a déjà été signé' });
  }

  studentCourse.signedAt = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  db.get('studentCourses').find({ studentId, courseId }).assign(studentCourse).write();

  res.status(200).send({ message: 'Cours signé avec succès' });
});

userRouter.post('/login', (req, res) => {
  const { email, password } = req.body;

  const user = db.get('users').find({ email }).value();

  if (!user || user.password !== password) {
    return res.status(401).send({ message: 'Nom d\'utilisateur ou mot de passe incorrect' });
  }

  if (user.role === 'ADMIN') {
    const users = db.get('users').value();
    const courses = db.get('courses').value();
    const studentCourses = db.get('studentCourses').value();
    const formattedStudentCourses = studentCourses.map(sc => {
      const student = db.get('users').find({ id: sc.studentId, role: 'STUDENT' }).value();
      const course = db.get('courses').find({ id: sc.courseId }).value();
      return {
        studentEmail: student.email,
        courseTitle: course.title,
        courseDate: course.date,
        courseTime: course.heure,
        registeredAt: sc.registeredAt,
        signedAt: sc.signedAt
      };
    });
    
    res.render('admin', { users, courses, formattedStudentCourses });
  } else if (user.role === 'STUDENT') {
    const studentCourses = db.get('studentCourses').filter({ studentId: user.id }).value();
    const studentCourse = db.get('studentCourses').find({ studentId: user.id }).value();
    const courses = studentCourses.map(course => {
      return db.get('courses').find({ id: course.courseId }).value();
    });
    res.render('home', { courses, user, studentCourse });
  } else {
    res.status(403).send({ message: 'Accès non autorisé' });
  }
});

userRouter.post('/sign-course', (req, res) => {
  const { courseId, userId } = req.body;

  const courseIdNumber = Number(courseId);
  const userIdNumber = Number(userId);

  const course = db.get('courses').find({ id: courseIdNumber }).value();

  if (!course) {
    return res.status(404).send({ message: 'Cours non trouvé' });
  }

  db.get('studentCourses')
    .find({ courseId: courseIdNumber, studentId: userIdNumber })
    .assign({ signedAt: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })
    .write();

  res.send({ message: 'Cours signé avec succès' });
});

userRouter.post('/addUser', (req, res) => {
  let newUser: User;

  try {
    newUser = userSchema.validateSync(req.body);
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
    }
    return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
  }

  newUser = userSchema.cast(newUser);

  const existingUser = db.get('users').find({ email: newUser.email }).value();
  if (existingUser) {
    return res.status(409).send({ message: 'Un utilisateur avec cet email existe déjà' });
  }

  const newId = db.get('users').size().value() + 1;
  newUser.id = newId;

  db.get('users').push(newUser).write();

  res.status(201).send({ message: 'Utilisateur ajouté avec succès' });
});

userRouter.post('/addCourse', (req, res) => {
  let newCourse = req.body;
  
  const formattedDate = format(new Date(newCourse.date), 'dd/MM/yyyy');
  newCourse.date = formattedDate;

  try {
    newCourse = courseSchema.validateSync(newCourse);
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
    }
    return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
  }

  newCourse = courseSchema.cast(newCourse);

  const existingCourse = db.get('courses').find({ title: newCourse.title }).value();
  if (existingCourse) {
    return res.status(409).send({ message: 'Un cours avec ce titre existe déjà' });
  }

  const newId = db.get('courses').size().value() + 1;
  (newCourse as any).id = newId;

  db.get('courses').push(newCourse).write();

  res.status(201).send({ message: 'Cours ajouté avec succès', course: newCourse });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRouter);
app.use('/', userRouter);
app.use('/', express.static('public', { extensions: ['html'] }));
app.use('/', express.static('public/pages', { extensions: ['html'] }));

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});