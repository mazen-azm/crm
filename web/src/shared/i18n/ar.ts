import type { Messages } from './en';

// Arabic resource file. The Messages type makes a key present in one file and
// missing in the other a compile error — that is what "always two languages"
// means in practice rather than as a promise. The wording is provisional and
// a translator revises it.
export const ar: Messages = {
  signIn: {
    heading: 'تسجيل الدخول',
    emailLabel: 'البريد الإلكتروني',
    passwordLabel: 'كلمة المرور',
    submit: 'تسجيل الدخول',
    stubNotice: 'تسجيل الدخول الحقيقي لم يُنفَّذ بعد — سيحل محله IDENTITY-1-API.',
  },
  home: {
    heading: 'مكتب الدعم',
    signOut: 'تسجيل الخروج',
  },
};
