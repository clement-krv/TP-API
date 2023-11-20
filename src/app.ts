import express from 'express';
import bodyParser from 'body-parser';
import basicAuth from 'express-basic-auth';
import low, { LowdbSync } from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import * as yup from 'yup';

import { User, Course, StudentCourse, DBSchema } from './utils/_interface';
import { userSchema, courseSchema, studentCourseSchema } from './utils/_schema';

const adapter = new FileSync<DBSchema>('db.json');
const db = low(adapter);

const router = express.Router();

const app = express();
app.use(bodyParser.json());

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

router.use(basicAuth({
  users: basicAuthUsers,
  challenge: true,
  unauthorizedResponse: 'Nom d\'utilisateur ou mot de passe incorrect',
}));

router.use((req: any, res, next) => {
  const authenticatedUser = users.find(user => user.email === req.auth.user);
  if (authenticatedUser) {
    req.user = authenticatedUser;
  }
  next();
});

router.get('/', (req, res) => {
  res.status(200).send({ message: 'Vous êtes connecté!' });
});

router.post('/add-users', checkRole('ADMIN'), async (req, res) => {
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

  app.get('/courses', (req, res) => {
    const courses = db.get('courses').value();
    res.status(200).send(courses);
  });
});

router.post('/add-courses', checkRole('ADMIN'), (req, res) => {
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

router.post('/add-studentcourse', checkRole('ADMIN'), (req, res) => {
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

router.patch('/sign-course', checkRole('STUDENT'), (req, res) => {
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

app.use('/api', router);

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});