import { useTranslation } from 'react-i18next';
import { Button } from '@ouiboo/ui';

export default function Login() {
  const { t } = useTranslation('auth');
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form className="rounded bg-white p-8 shadow">
        <h1 className="mb-4 text-2xl font-bold">{t('login.title')}</h1>
        <label className="block">
          {t('login.email')}
          <input type="email" className="mt-1 block w-full rounded border p-2" required />
        </label>
        <label className="mt-4 block">
          {t('login.password')}
          <input type="password" className="mt-1 block w-full rounded border p-2" required />
        </label>
        <Button className="mt-6 w-full">{t('login.submit')}</Button>
      </form>
    </div>
  );
}
