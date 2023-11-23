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
var adapter = new FileSync('db.json');
var db = low(adapter);
var app = express();
app.use(bodyParser.json());
var users = db.get('users').value();
var basicAuthUsers = users.reduce(function (acc, user) {
    acc[user.email] = user.password;
    return acc;
}, {});
var userSchema = yup.object().shape({
    email: yup.string().email().required().defined(),
    password: yup.string().required().defined(),
    role: yup.string().oneOf(['STUDENT', 'ADMIN']).required().defined(),
}).noUnknown().strict().required().defined();
var courseSchema = yup.object().shape({
    title: yup.string().required().defined(),
    date: yup.string().matches(/^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d$/, 'La date doit être au format jj/mm/AAAA').required().defined(),
    heure: yup.string().matches(/^([01]\d|2[0-3]):([0-5]\d)$/, 'L\'heure doit être au format HH:MM en 24 heures').required().defined(),
}).noUnknown().strict().required().defined();
var studentCourseSchema = yup.object().shape({
    studentId: yup.number().required().defined(),
    courseId: yup.number().required().defined(),
    registeredAt: yup.string().matches(/^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d (0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'La date et l\'heure doivent être au format jj/mm/AAAA HH:MM').defined(),
    signedAt: yup.string().matches(/^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d (0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'La date et l\'heure doivent être au format jj/mm/AAAA HH:MM').nullable().default(null),
}).noUnknown().strict().required().defined();
app.use(basicAuth({
    users: basicAuthUsers,
    challenge: true,
    unauthorizedResponse: 'Nom d\'utilisateur ou mot de passe incorrect',
}));
app.use(function (req, res, next) {
    var authenticatedUser = users.find(function (user) { return user.email === req.auth.user; });
    if (authenticatedUser) {
        req.user = authenticatedUser;
    }
    next();
});
function checkRole(role) {
    return function (req, res, next) {
        if (req.user.role !== role) {
            return res.status(403).send({ message: 'Accès refusé' });
        }
        next();
    };
}
app.get('/', function (req, res) {
    res.status(200).send({ message: 'Vous êtes connecté!' });
});
app.post('/add-users', checkRole('ADMIN'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var newUser, existingUser, newId;
    return __generator(this, function (_a) {
        try {
            newUser = userSchema.validateSync(req.body);
        }
        catch (error) {
            if (error instanceof yup.ValidationError) {
                return [2 /*return*/, res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') })];
            }
            return [2 /*return*/, res.status(500).send({ message: 'Une erreur inattendue s\'est produite' })];
        }
        newUser = userSchema.cast(newUser);
        existingUser = db.get('users').find({ email: newUser.email }).value();
        if (existingUser) {
            return [2 /*return*/, res.status(409).send({ message: 'Un utilisateur avec cet email existe déjà' })];
        }
        newId = db.get('users').size().value() + 1;
        newUser.id = newId;
        db.get('users').push(newUser).write();
        res.status(201).send({ message: 'Utilisateur ajouté avec succès' });
        return [2 /*return*/];
    });
}); });
app.get('/courses', function (req, res) {
    var courses = db.get('courses').value();
    res.status(200).send(courses);
});
app.post('/add-courses', checkRole('ADMIN'), function (req, res) {
    var newCourse;
    try {
        newCourse = courseSchema.validateSync(req.body);
    }
    catch (error) {
        if (error instanceof yup.ValidationError) {
            return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
        }
        return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
    }
    newCourse = courseSchema.cast(newCourse);
    var newId = db.get('courses').size().value() + 1;
    newCourse.id = newId;
    db.get('courses').push(newCourse).write();
    res.status(201).send({ message: 'Cours ajouté avec succès' });
});
app.post('/add-studentcourse', checkRole('ADMIN'), function (req, res) {
    var newStudentCourse = __assign(__assign({}, req.body), { registeredAt: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) });
    var student = db.get('users').find({ id: newStudentCourse.studentId, role: 'STUDENT' }).value();
    if (!student) {
        return res.status(400).send({ message: 'L\'ID fourni ne correspond pas à un étudiant' });
    }
    try {
        newStudentCourse = studentCourseSchema.validateSync(newStudentCourse);
    }
    catch (error) {
        if (error instanceof yup.ValidationError) {
            return res.status(400).send({ message: 'Les données fournies sont invalides : ' + error.errors.join(', ') });
        }
        return res.status(500).send({ message: 'Une erreur inattendue s\'est produite' });
    }
    newStudentCourse = studentCourseSchema.cast(newStudentCourse);
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
app.patch('/sign-course', checkRole('STUDENT'), function (req, res) {
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
app.listen(3000, function () {
    console.log('Server is listening on port 3000');
});
