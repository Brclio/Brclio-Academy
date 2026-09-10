import type { Metadata } from 'next';
import '@fontsource-variable/noto-sans-sc';
import '@fontsource-variable/noto-serif-sc';
import '@fontsource-variable/fraunces';
import './globals.css';
export const metadata: Metadata = {
  title: 'Brclio Academy · 从理解到实践',
  description: '跟着系列课程动手实践，用文章与专栏连接知识。Brclio 的课程学习空间。',
  icons: { icon: '/brand/avatar.png' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
