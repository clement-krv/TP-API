import express from 'express';
import basicAuth from 'express-basic-auth';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

// Créez une instance de la base de données
const adapter = new FileSync('db.json');
const db = low(adapter);

// Créez une instance de l'application Express
const app = express();

// Configurez le middleware d'authentification
app.use(basicAuth({
    users: db.get('users').value().reduce((users: { [email: string]: string }, user: { email: string, password: string }) => {
        users[user.email] = user.password;
        return users;
    }, {}),
    challenge: true,
}));

// Créez une route qui nécessite une authentification
app.get('/', (req, res) => {
    res.send('Vous êtes authentifié !');
});

// Démarrez le serveur
app.listen(3000, () => {
    console.log('Le serveur est en écoute sur le port 3000');
});