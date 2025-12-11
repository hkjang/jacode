'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SsoCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');
    const error = searchParams.get('message');

    if (error) {
      setStatus('error');
      setMessage(decodeURIComponent(error));
      return;
    }

    if (token) {
      // Store tokens
      localStorage.setItem('token', token);
      if (refresh) {
        localStorage.setItem('refreshToken', refresh);
      }

      setStatus('success');
      setMessage('SSO 로그인 성공! 잠시 후 대시보드로 이동합니다.');

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } else {
      setStatus('error');
      setMessage('인증 토큰을 받지 못했습니다.');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 rounded-lg border bg-card max-w-md w-full">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <h2 className="text-lg font-semibold">SSO 인증 처리 중...</h2>
            <p className="text-muted-foreground mt-2">잠시만 기다려주세요.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-green-600">로그인 성공!</h2>
            <p className="text-muted-foreground mt-2">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-600">로그인 실패</h2>
            <p className="text-muted-foreground mt-2">{message}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/login')}
            >
              로그인 페이지로 돌아가기
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
