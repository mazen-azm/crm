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
  shell: {
    navLabel: 'التنقل الرئيسي',
    navHome: 'الرئيسية',
    switchToDark: 'الوضع الداكن',
    switchToLight: 'الوضع الفاتح',
    // Each language is named in its own words, in BOTH files on purpose: the
    // button says which language you would switch TO, so it reads the same
    // whichever way round you are. Do not "translate" these.
    switchToArabic: 'العربية',
    switchToEnglish: 'English',
  },
  home: {
    heading: 'مكتب الدعم',
    signOut: 'تسجيل الخروج',
  },
  errors: {
    BAD_REQUEST: 'تعذّرت قراءة هذا الطلب. أعد تحميل الصفحة وحاول مرة أخرى.',
    UNAUTHENTICATED: 'انتهت جلستك. سجّل الدخول مرة أخرى للمتابعة.',
    FORBIDDEN: 'حسابك لا يملك صلاحية الوصول إلى هذا.',
    NOT_FOUND: 'هذا غير موجود هنا. ربما نُقل أو حُذف.',
    CONFLICT: 'غيّر شخص آخر هذا أثناء عملك. أعد التحميل لرؤيته.',
    VALIDATION_FAILED: 'راجع الحقول المطلوبة وحاول مرة أخرى.',
    RATE_LIMITED: 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
    INTERNAL: 'حدث خطأ عندنا. حاول مرة أخرى.',
  },
  states: {
    loading: 'جارٍ التحميل',
    errorTitle: 'تعذّر التحميل',
    retry: 'حاول مرة أخرى',
  },
});
