import { defineLocale } from './en';

// Arabic resource file. defineLocale makes both directions a compile error: a key English has and Arabic lacks, and a key Arabic has that
// English does not. That is what "always two languages" means in practice
// rather than as a promise. The wording is provisional; a translator revises it.
export const ar = defineLocale({
  signIn: {
    heading: 'تسجيل الدخول',
    emailLabel: 'البريد الإلكتروني',
    passwordLabel: 'كلمة المرور',
    submit: 'تسجيل الدخول',
    submitting: 'جارٍ تسجيل الدخول…',
    errorUnauthenticated: 'البريد الإلكتروني وكلمة المرور لا يطابقان أي حساب.',
    errorValidationFailed: 'راجع الحقول المطلوبة وحاول مرة أخرى.',
    errorInternal: 'حدث خطأ عندنا. حاول مرة أخرى.',
    errorUnknown: 'فشل تسجيل الدخول.',
  },
  home: {
    heading: 'مكتب الدعم',
    signOut: 'تسجيل الخروج',
  },
});
