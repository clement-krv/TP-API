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

interface DBSchema {
  users: User[];
}

const adapter = new FileSync<DBSchema>('db.json');
const db: LowdbSync<DBSchema> = low(adapter);

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

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});