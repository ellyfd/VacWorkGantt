import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

export default function UserNotRegisteredError() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center space-y-5">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-800">尚未開通使用權限</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            您的帳號尚未被加入此系統。請聯絡管理員協助開通，再以同一個帳號重新登入。
          </p>
        </div>
        <Button variant="outline" onClick={() => logout()}>
          切換帳號
        </Button>
      </div>
    </div>
  );
}
