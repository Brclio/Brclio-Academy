import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: ({ alt, src }) => {
            const allowed =
              typeof src === 'string' &&
              (/^https:\/\//.test(src) || (src.startsWith('/') && !src.startsWith('//')));
            return allowed ? (
              <img src={src} alt={alt || '文章配图'} loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <span className="muted">[图片：{alt || '配图'}]</span>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
