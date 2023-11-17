import express from 'express';
import bodyParser from 'body-parser';
import basicAuth from 'express-basic-auth';
import low, { LowdbSync } from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import * as yup from 'yup';

interface User {
  id?: number;
  email: string;
  password: string;
  role: 'STUDENT' | 'ADMIN';
}

interface Course {
  id?: number;
  title: string;
  date: string;
  heure: string;
}

interface StudentCourse {
  id?: number;
  studentId: number;
  courseId: number;
  registeredAt: string | null;
  signedAt: string | null; 
}

interface DBSchema {
  users: User[];
  courses: Course[];
  studentCourses: StudentCourse[];
}

const adapter = new FileSync<DBSchema>('db.json');
const db = low(adapter);

const app = express();
app.use(bodyParser.json());

const users = db.get('users').value();
const basicAuthUsers = users.reduce((acc: { [key: string]: string }, user: User) => {
  acc[user.email] = user.password;
  return acc;
}, {});

app.use(basicAuth({
  users: basicAuthUsers,
  challenge: true,
  unauthorizedResponse: 'Nom d\'utilisateur ou mot de passe incorrect',
}));

app.use((req: any, res, next) => {
  const authenticatedUser = users.find(user => user.email === req.auth.user);
  if (authenticatedUser) {
    req.user = authenticatedUser;
  }
  next();
});

const userSchema = yup.object().shape({
  email: yup.string().email().required().defined(),
  password: yup.string().required().defined(),
  role: yup.string().oneOf(['STUDENT', 'ADMIN']).required().defined(),
}).noUnknown().strict().required().defined();

const courseSchema = yup.object().shape({
  title: yup.string().required().defined(),
  date: yup.string().matches(/^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d$/, 'La date doit être au format jj/mm/AAAA').required().defined(),
  heure: yup.string().matches(/^([01]\d|2[0-3]):([0-5]\d)$/, 'L\'heure doit être au format HH:MM en 24 heures').required().defined(),
}).noUnknown().strict().required().defined();

const studentCourseSchema = yup.object().shape({
  studentId: yup.number().required().defined(),
  courseId: yup.number().required().defined(),
  registeredAt: yup.string().matches(/^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d (0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'La date et l\'heure doivent être au format jj/mm/AAAA HH:MM').defined(),
  signedAt: yup.string().matches(/^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d (0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'La date et l\'heure doivent être au format jj/mm/AAAA HH:MM').nullable().default(null),
}).noUnknown().strict().required().defined();

function checkRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (req.user.role !== role) {
      return res.status(403).send({ message: 'Accès refusé' });
    }
    next();
  };
}

app.get('/', (req, res) => {
  res.status(200).send({ message: 'Vous êtes connecté!' });
});

app.post('/add-users', checkRole('ADMIN'), async (req, res) => {
  let newUser: User;

  try {
    newUser = userSchema.validateSync(req.body);
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
    }
    // handle other types of errors
    return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
  }

  // Supprimez les champs inconnus
  newUser = userSchema.cast(newUser);

  // Vérifiez que l'utilisateur n'existe pas déjà
  const existingUser = db.get('users').find({ email: newUser.email }).value();
  if (existingUser) {
    return res.status(409).send({ message: 'Un utilisateur avec cet email existe déjà' });
  }

  // Générez un nouvel ID pour le nouvel utilisateur
  const newId = db.get('users').size().value() + 1;
  newUser.id = newId;

  // Ajoutez le nouvel utilisateur à la base de données
  db.get('users').push(newUser).write();

  // Renvoyez une réponse de succès
  res.status(201).send({ message: 'Utilisateur ajouté avec succès' });
});

app.get('/courses', (req, res) => {
  const courses = db.get('courses').value();
  res.status(200).send(courses);
});

app.post('/add-courses', checkRole('ADMIN'), (req, res) => {
  let newCourse: Course;

  try {
    newCourse = courseSchema.validateSync(req.body);
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
    }
    // handle other types of errors
    return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
  }

  // Supprimez les champs inconnus
  newCourse = courseSchema.cast(newCourse);

  // Générez un nouvel ID pour le nouveau cours
  const newId = db.get('courses').size().value() + 1;
  newCourse.id = newId;

  // Ajoutez le nouveau cours à la base de données
  db.get('courses').push(newCourse).write();

  // Renvoyez une réponse de succès
  res.status(201).send({ message: 'Cours ajouté avec succès' });
});

app.post('/add-studentcourse', checkRole('ADMIN'), (req, res) => {
  let newStudentCourse: StudentCourse = {
    ...req.body,
    registeredAt: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };

  // Vérifiez que studentId correspond à un utilisateur avec le rôle STUDENT
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
    // handle other types of errors
    return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
  }

  // Supprimez les champs inconnus
  newStudentCourse = studentCourseSchema.cast(newStudentCourse);

  // Vérifiez que le courseId existe
  const existingCourse = db.get('courses').find({ id: newStudentCourse.courseId }).value();
  if (!existingCourse) {
    return res.status(400).send({ message: 'Le cours avec cet ID n\'existe pas' });
  }

  // Vérifiez que le studentId existe
  const existingUser = db.get('users').find({ id: newStudentCourse.studentId }).value();
  if (!existingUser) {
    return res.status(400).send({ message: 'L\'utilisateur avec cet ID n\'existe pas' });
  }

  // Générez un nouvel ID pour le nouveau StudentCourse
  const newId = db.get('studentCourses').value().length + 1;
  newStudentCourse.id = newId;

  // Définissez registeredAt à la date et l'heure actuelles
  const now = new Date();
  const date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  newStudentCourse.registeredAt = `${date} ${time}`;

  // Ajoutez le nouveau StudentCourse à la base de données
  db.get('studentCourses').push(newStudentCourse).write();

  // Renvoyez une réponse de succès
  res.status(201).send({ message: 'Inscription de l\'étudiant au cours ajoutée avec succès' });
});

app.patch('/sign-course', checkRole('STUDENT'), (req, res) => {
  const { studentId, courseId } = req.body;

  // Vérifiez que studentId correspond à l'utilisateur connecté
  const user = (req as any).user;
  if (user && user.id !== studentId) {
    return res.status(403).send({ message: 'Vous ne pouvez signer que vos propres cours' });
  }
  // Trouvez le cours correspondant pour l'étudiant
  let studentCourse = db.get('studentCourses').find({ studentId, courseId }).value();

  // Si le cours n'existe pas, renvoyez une erreur
  if (!studentCourse) {
    return res.status(400).send({ message: 'Le cours avec cet ID n\'existe pas pour cet étudiant' });
  }

  // Si le cours a déjà été signé, renvoyez une erreur
  if (studentCourse.signedAt) {
    return res.status(400).send({ message: 'Le cours a déjà été signé' });
  }

  // Mettez à jour le champ signedAt avec la date et l'heure actuelles
  studentCourse.signedAt = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Mettez à jour le cours dans la base de données
  db.get('studentCourses').find({ studentId, courseId }).assign(studentCourse).write();

  // Renvoyez une réponse de succès
  res.status(200).send({ message: 'Cours signé avec succès' });
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});