"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentCourseSchema = exports.courseSchema = exports.userSchema = void 0;
var yup = require("yup");
exports.userSchema = yup.object().shape({
    email: yup.string().email().required().defined(),
    password: yup.string().required().defined(),
    role: yup.string().oneOf(['STUDENT', 'ADMIN']).required().defined(),
}).noUnknown().strict().required().defined();
exports.courseSchema = yup.object().shape({
    title: yup.string().required().defined(),
    date: yup.string().matches(/^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d$/, 'La date doit être au format jj/mm/AAAA').required().defined(),
    heure: yup.string().matches(/^([01]\d|2[0-3]):([0-5]\d)$/, 'L\'heure doit être au format HH:MM en 24 heures').required().defined(),
}).noUnknown().strict().required().defined();
exports.studentCourseSchema = yup.object().shape({
    studentId: yup.number().required().defined(),
    courseId: yup.number().required().defined(),
    registeredAt: yup.string().matches(/^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d (0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'La date et l\'heure doivent être au format jj/mm/AAAA HH:MM').defined(),
    signedAt: yup.string().matches(/^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d (0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'La date et l\'heure doivent être au format jj/mm/AAAA HH:MM').nullable().default(null),
}).noUnknown().strict().required().defined();
