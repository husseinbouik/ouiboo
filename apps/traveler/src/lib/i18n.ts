import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            login: {
                title: "Welcome back",
                subtitle: "Please enter your details to sign in.",
                email: "Email",
                emailPlaceholder: "Enter your email",
                password: "Password",
                passwordPlaceholder: "••••••••",
                forgotPassword: "Forgot password?",
                signIn: "Sign In",
                orContinue: "Or continue with",
                google: "Google",
                facebook: "Facebook",
                noAccount: "Don't have an account?",
                signUpLink: "Sign up for free"
            },
            signup: {
                title: "Create an account",
                subtitle: "Join Ouiboo and start your journey.",
                name: "Full Name",
                namePlaceholder: "John Doe",
                email: "Email",
                emailPlaceholder: "Enter your email",
                password: "Password",
                passwordPlaceholder: "Create a password",
                createAccount: "Create Account",
                orSignUp: "Or sign up with",
                google: "Google",
                facebook: "Facebook",
                hasAccount: "Already have an account?",
                logInLink: "Log in"
            }
        }
    },
    fr: {
        translation: {
            login: {
                title: "Bon retour",
                subtitle: "Veuillez entrer vos informations pour vous connecter.",
                email: "Email",
                emailPlaceholder: "Entrez votre email",
                password: "Mot de passe",
                passwordPlaceholder: "••••••••",
                forgotPassword: "Mot de passe oublié?",
                signIn: "Se connecter",
                orContinue: "Ou continuer avec",
                google: "Google",
                facebook: "Facebook",
                noAccount: "Pas de compte?",
                signUpLink: "Inscrivez-vous gratuitement"
            },
            signup: {
                title: "Créer un compte",
                subtitle: "Rejoignez Ouiboo et commencez votre voyage.",
                name: "Nom complet",
                namePlaceholder: "Jean Dupont",
                email: "Email",
                emailPlaceholder: "Entrez votre email",
                password: "Mot de passe",
                passwordPlaceholder: "Créer un mot de passe",
                createAccount: "Créer un compte",
                orSignUp: "Ou s'inscrire avec",
                google: "Google",
                facebook: "Facebook",
                hasAccount: "Vous avez déjà un compte?",
                logInLink: "Se connecter"
            }
        }
    },
    ar: {
        translation: {
            login: {
                title: "مرحباً بعودتك",
                subtitle: "الرجاء إدخال بياناتك لتسجيل الدخول.",
                email: "البريد الإلكتروني",
                emailPlaceholder: "أدخل بريدك الإلكتروني",
                password: "كلمة المرور",
                passwordPlaceholder: "••••••••",
                forgotPassword: "نسيت كلمة المرور؟",
                signIn: "تسجيل الدخول",
                orContinue: "أو تابع مع",
                google: "جوجل",
                facebook: "فيسبوك",
                noAccount: "ليس لديك حساب؟",
                signUpLink: "سجل مجاناً"
            },
            signup: {
                title: "إنشاء حساب",
                subtitle: "انضم إلى Ouiboo وابدأ رحلتك.",
                name: "الاسم الكامل",
                namePlaceholder: "أحمد محمد",
                email: "البريد الإلكتروني",
                emailPlaceholder: "أدخل بريدك الإلكتروني",
                password: "كلمة المرور",
                passwordPlaceholder: "أنشئ كلمة مرور",
                createAccount: "إنشاء حساب",
                orSignUp: "أو سجل مع",
                google: "جوجل",
                facebook: "فيسبوك",
                hasAccount: "لديك حساب بالفعل؟",
                logInLink: "تسجيل الدخول"
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
