import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import basicAuth from 'express-basic-auth';
import low, { LowdbSync } from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

interface User {
  email: string;
  password: string;
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

app.get('/', (req, res) => {
  res.status(200).send({ message: 'Vous êtes connecté!' });
});

app.post('/add-users', async (req, res) => {
  const newUser: User = req.body;

  // Vérifiez que le nouvel utilisateur a un email et un mot de passe
  if (!newUser.email || !newUser.password) {
    return res.status(400).send({ message: 'Le nom d\'utilisateur et le mot de passe sont requis' });
  }

  // Vérifiez que l'utilisateur n'existe pas déjà
  const existingUser = db.get('users').find({ email: newUser.email }).value();
  if (existingUser) {
    return res.status(409).send({ message: 'Un utilisateur avec ce nom d\'utilisateur existe déjà' });
  }

  // Ajoutez le nouvel utilisateur à la base de données
  db.get('users').push(newUser).write();

  // Renvoyez une réponse de succès
  res.status(201).send({ message: 'Utilisateur ajouté avec succès' });
});

app.listen(3000, () => console.log('Serveur en écoute sur le port 3000'));