import { Suspense } from 'react';
import Academy from '@/components/academy';
export default function Page() {
  return (
    <Suspense fallback={<div className="initial-loading">Brclio Academy · 正在打开学习空间…</div>}>
      <Academy />
    </Suspense>
  );
}
