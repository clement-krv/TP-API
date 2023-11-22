"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var bodyParser = require("body-parser");
var basicAuth = require("express-basic-auth");
var low = require("lowdb");
var FileSync = require("lowdb/adapters/FileSync");
var yup = require("yup");
var path = require("path");
var date_fns_1 = require("date-fns");
var _schema_1 = require("./utils/_schema");
var adapter = new FileSync('db.json');
var db = low(adapter);
var apiRouter = express.Router();
var userRouter = express.Router();
var app = express();
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../public/pages'));
var users = db.get('users').value();
var basicAuthUsers = users.reduce(function (acc, user) {
    acc[user.email] = user.password;
    return acc;
}, {});
function checkRole(role) {
    return function (req, res, next) {
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
apiRouter.use(function (req, res, next) {
    var authenticatedUser = users.find(function (user) { return user.email === req.auth.user; });
    if (authenticatedUser) {
        req.user = authenticatedUser;
    }
    next();
});
apiRouter.get('/', function (req, res) {
    res.status(200).send({ message: 'Vous êtes connecté!' });
});
apiRouter.get('/courses', function (req, res) {
    var courses = db.get('courses').value();
    res.status(200).send(courses);
});
apiRouter.post('/add-users', checkRole('ADMIN'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var newUser, existingUser, newId;
    return __generator(this, function (_a) {
        try {
            newUser = _schema_1.userSchema.validateSync(req.body);
        }
        catch (error) {
            if (error instanceof yup.ValidationError) {
                return [2 /*return*/, res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') })];
            }
            return [2 /*return*/, res.status(500).send({ message: 'Une erreur inattendue s\'est produite' })];
        }
        newUser = _schema_1.userSchema.cast(newUser);
        existingUser = db.get('users').find({ email: newUser.email }).value();
        if (existingUser) {
            return [2 /*return*/, res.status(409).send({ message: 'Un utilisateur avec cet email existe déjà' })];
        }
        newId = db.get('users').size().value() + 1;
        newUser.id = newId;
        db.get('users').push(newUser).write();
        res.status(201).send({ message: 'Utilisateur ajouté avec succès' });
        apiRouter.get('/courses', function (req, res) {
            var courses = db.get('courses').value();
            res.status(200).send(courses);
        });
        return [2 /*return*/];
    });
}); });
apiRouter.post('/add-courses', checkRole('ADMIN'), function (req, res) {
    var newCourse;
    try {
        newCourse = _schema_1.courseSchema.validateSync(req.body);
    }
    catch (error) {
        if (error instanceof yup.ValidationError) {
            return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
        }
        return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
    }
    newCourse = _schema_1.courseSchema.cast(newCourse);
    var newId = db.get('courses').size().value() + 1;
    newCourse.id = newId;
    db.get('courses').push(newCourse).write();
    res.status(201).send({ message: 'Cours ajouté avec succès' });
});
apiRouter.post('/add-studentcourse', checkRole('ADMIN'), function (req, res) {
    var newStudentCourse = __assign(__assign({}, req.body), { registeredAt: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) });
    var student = db.get('users').find({ id: newStudentCourse.studentId, role: 'STUDENT' }).value();
    if (!student) {
        return res.status(400).send({ message: 'L\'ID fourni ne correspond pas à un étudiant' });
    }
    try {
        newStudentCourse = _schema_1.studentCourseSchema.validateSync(newStudentCourse);
    }
    catch (error) {
        if (error instanceof yup.ValidationError) {
            return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
        }
        return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
    }
    newStudentCourse = _schema_1.studentCourseSchema.cast(newStudentCourse);
    var existingCourse = db.get('courses').find({ id: newStudentCourse.courseId }).value();
    if (!existingCourse) {
        return res.status(400).send({ message: 'Le cours avec cet ID n\'existe pas' });
    }
    var existingUser = db.get('users').find({ id: newStudentCourse.studentId }).value();
    if (!existingUser) {
        return res.status(400).send({ message: 'L\'utilisateur avec cet ID n\'existe pas' });
    }
    var newId = db.get('studentCourses').value().length + 1;
    newStudentCourse.id = newId;
    var now = new Date();
    var date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    var time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    newStudentCourse.registeredAt = "".concat(date, " ").concat(time);
    db.get('studentCourses').push(newStudentCourse).write();
    res.status(201).send({ message: 'Inscription de l\'étudiant au cours ajoutée avec succès' });
});
apiRouter.patch('/sign-course', checkRole('STUDENT'), function (req, res) {
    var _a = req.body, studentId = _a.studentId, courseId = _a.courseId;
    var user = req.user;
    if (user && user.id !== studentId) {
        return res.status(403).send({ message: 'Vous ne pouvez signer que vos propres cours' });
    }
    var studentCourse = db.get('studentCourses').find({ studentId: studentId, courseId: courseId }).value();
    if (!studentCourse) {
        return res.status(400).send({ message: 'Le cours avec cet ID n\'existe pas pour cet étudiant' });
    }
    if (studentCourse.signedAt) {
        return res.status(400).send({ message: 'Le cours a déjà été signé' });
    }
    studentCourse.signedAt = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    db.get('studentCourses').find({ studentId: studentId, courseId: courseId }).assign(studentCourse).write();
    res.status(200).send({ message: 'Cours signé avec succès' });
});
userRouter.post('/login', function (req, res) {
    var _a = req.body, email = _a.email, password = _a.password;
    var user = db.get('users').find({ email: email }).value();
    if (!user || user.password !== password) {
        return res.status(401).send({ message: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }
    if (user.role === 'ADMIN') {
        var users_1 = db.get('users').value();
        var courses = db.get('courses').value();
        var studentCourses = db.get('studentCourses').value();
        var formattedStudentCourses = studentCourses.map(function (sc) {
            var student = db.get('users').find({ id: sc.studentId, role: 'STUDENT' }).value();
            var course = db.get('courses').find({ id: sc.courseId }).value();
            return {
                studentEmail: student.email,
                courseTitle: course.title,
                courseDate: course.date,
                courseTime: course.heure,
                registeredAt: sc.registeredAt,
                signedAt: sc.signedAt
            };
        });
        res.render('admin', { users: users_1, courses: courses, formattedStudentCourses: formattedStudentCourses });
    }
    else if (user.role === 'STUDENT') {
        var studentCourses = db.get('studentCourses').filter({ studentId: user.id }).value();
        var studentCourse = db.get('studentCourses').find({ studentId: user.id }).value();
        var courses = studentCourses.map(function (course) {
            return db.get('courses').find({ id: course.courseId }).value();
        });
        res.render('home', { courses: courses, user: user, studentCourse: studentCourse });
    }
    else {
        res.status(403).send({ message: 'Accès non autorisé' });
    }
});
userRouter.post('/sign-course', function (req, res) {
    var _a = req.body, courseId = _a.courseId, userId = _a.userId;
    var courseIdNumber = Number(courseId);
    var userIdNumber = Number(userId);
    var course = db.get('courses').find({ id: courseIdNumber }).value();
    if (!course) {
        return res.status(404).send({ message: 'Cours non trouvé' });
    }
    db.get('studentCourses')
        .find({ courseId: courseIdNumber, studentId: userIdNumber })
        .assign({ signedAt: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) })
        .write();
    res.send({ message: 'Cours signé avec succès' });
});
userRouter.post('/addUser', function (req, res) {
    var newUser;
    try {
        newUser = _schema_1.userSchema.validateSync(req.body);
    }
    catch (error) {
        if (error instanceof yup.ValidationError) {
            return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
        }
        return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
    }
    newUser = _schema_1.userSchema.cast(newUser);
    var existingUser = db.get('users').find({ email: newUser.email }).value();
    if (existingUser) {
        return res.status(409).send({ message: 'Un utilisateur avec cet email existe déjà' });
    }
    var newId = db.get('users').size().value() + 1;
    newUser.id = newId;
    db.get('users').push(newUser).write();
    res.status(201).send({ message: 'Utilisateur ajouté avec succès' });
});
userRouter.post('/addCourse', function (req, res) {
    var newCourse = req.body;
    var formattedDate = (0, date_fns_1.format)(new Date(newCourse.date), 'dd-MM-yyyy');
    newCourse.date = formattedDate;
    try {
        newCourse = _schema_1.courseSchema.validateSync(newCourse);
    }
    catch (error) {
        if (error instanceof yup.ValidationError) {
            return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
        }
        return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
    }
    newCourse = _schema_1.courseSchema.cast(newCourse);
    var existingCourse = db.get('courses').find({ title: newCourse.title }).value();
    if (existingCourse) {
        return res.status(409).send({ message: 'Un cours avec ce titre existe déjà' });
    }
    var newId = db.get('courses').size().value() + 1;
    newCourse.id = newId;
    db.get('courses').push(newCourse).write();
    res.status(201).send({ message: 'Cours ajouté avec succès' });
});
userRouter.post('/addStudentCourse', function (req, res) {
    var studentEmail = req.body.studentEmail;
    var courseTitle = req.body.courseTitle;
    // Trouver l'étudiant et le cours correspondants
    var student = db.get('users').find({ email: studentEmail, role: 'STUDENT' }).value();
    var course = db.get('courses').find({ title: courseTitle }).value();
    if (!student || !course || student.id === undefined || course.id === undefined) {
        res.status(400).send('Étudiant ou cours non trouvé');
        return;
    }
    // Créer une nouvelle entrée dans studentCourses
    var newStudentCourse = {
        id: db.get('studentCourses').size().value() + 1,
        studentId: student.id,
        courseId: course.id,
        registeredAt: (0, date_fns_1.format)(new Date(), 'dd-MM-yyyy HH:mm'),
        signedAt: null
    };
    db.get('studentCourses').push(newStudentCourse).write();
    res.status(201).send({ message: 'Signature ajoutée avec succès' });
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiRouter);
app.use('/', userRouter);
app.use('/', express.static('public', { extensions: ['html'] }));
app.use('/', express.static('public/pages', { extensions: ['html'] }));
app.listen(3000, function () {
    console.log('Server is listening on port 3000');
});
