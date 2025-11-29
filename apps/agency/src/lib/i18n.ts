import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            login: {
                title: "Agency Portal",
                subtitle: "Welcome back. Manage your bookings and grow your business.",
                email: "Work Email",
                emailPlaceholder: "name@agency.com",
                password: "Password",
                passwordPlaceholder: "••••••••",
                forgotPassword: "Forgot password?",
                signIn: "Sign In to Dashboard",
                orContinue: "Or continue with",
                google: "Google",
                linkedin: "LinkedIn",
                noAccount: "New agency?",
                signUpLink: "Register your business"
            },
            signup: {
                title: "Partner with Ouiboo",
                subtitle: "Create your agency account and start growing.",
                agencyName: "Agency Name",
                agencyPlaceholder: "Global Travels Ltd.",
                email: "Work Email",
                emailPlaceholder: "name@agency.com",
                password: "Password",
                passwordPlaceholder: "Create a password",
                createAccount: "Create Agency Account",
                orSignUp: "Or sign up with",
                google: "Google",
                linkedin: "LinkedIn",
                hasAccount: "Already a partner?",
                logInLink: "Log in to dashboard"
            }
        }
    },
    fr: {
        translation: {
            login: {
                title: "Portail Agence",
                subtitle: "Bon retour. Gérez vos réservations et développez votre entreprise.",
                email: "Email professionnel",
                emailPlaceholder: "nom@agence.com",
                password: "Mot de passe",
                passwordPlaceholder: "••••••••",
                forgotPassword: "Mot de passe oublié?",
                signIn: "Se connecter au tableau de bord",
                orContinue: "Ou continuer avec",
                google: "Google",
                linkedin: "LinkedIn",
                noAccount: "Nouvelle agence?",
                signUpLink: "Enregistrez votre entreprise"
            },
            signup: {
                title: "Partenaire avec Ouiboo",
                subtitle: "Créez votre compte d'agence et commencez à grandir.",
                agencyName: "Nom de l'agence",
                agencyPlaceholder: "Voyages Globaux Ltée",
                email: "Email professionnel",
                emailPlaceholder: "nom@agence.com",
                password: "Mot de passe",
                passwordPlaceholder: "Créer un mot de passe",
                createAccount: "Créer un compte d'agence",
                orSignUp: "Ou s'inscrire avec",
                google: "Google",
                linkedin: "LinkedIn",
                hasAccount: "Déjà partenaire?",
                logInLink: "Se connecter au tableau de bord"
            }
        }
    },
    ar: {
        translation: {
            login: {
                title: "بوابة الوكالة",
                subtitle: "مرحباً بعودتك. أدر حجوزاتك وطور عملك.",
                email: "البريد الإلكتروني للعمل",
                emailPlaceholder: "الاسم@الوكالة.com",
                password: "كلمة المرور",
                passwordPlaceholder: "••••••••",
                forgotPassword: "نسيت كلمة المرور؟",
                signIn: "تسجيل الدخول إلى لوحة التحكم",
                orContinue: "أو تابع مع",
                google: "جوجل",
                linkedin: "لينكد إن",
                noAccount: "وكالة جديدة؟",
                signUpLink: "سجل عملك"
            },
            signup: {
                title: "شارك مع Ouiboo",
                subtitle: "أنشئ حساب وكالتك وابدأ النمو.",
                agencyName: "اسم الوكالة",
                agencyPlaceholder: "شركة السفر العالمية",
                email: "البريد الإلكتروني للعمل",
                emailPlaceholder: "الاسم@الوكالة.com",
                password: "كلمة المرور",
                passwordPlaceholder: "أنشئ كلمة مرور",
                createAccount: "إنشاء حساب وكالة",
                orSignUp: "أو سجل مع",
                google: "جوجل",
                linkedin: "لينكد إن",
                hasAccount: "شريك بالفعل؟",
                logInLink: "تسجيل الدخول إلى لوحة التحكم"
            }
        }
    }
};

// Custom language detector that checks URL params first
const urlLanguageDetector = {
    name: 'urlParam',
    lookup() {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('lang');
        }
        return null;
    }
};

const languageDetector = new LanguageDetector();
languageDetector.addDetector(urlLanguageDetector);

i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        detection: {
            order: ['urlParam', 'localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupQuerystring: 'lang'
        },
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
