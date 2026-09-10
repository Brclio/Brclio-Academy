'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, ExternalLink, Film } from 'lucide-react';
type Player = { getCurrentTime(): number; getPlayerState(): number; destroy(): void };
type YouTube = {
  Player: new (
    element: HTMLElement,
    options: {
      host: string;
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onError: (event: { data: number }) => void;
        onStateChange: (event: { data: number }) => void;
      };
    },
  ) => Player;
};
declare global {
  interface Window {
    YT?: YouTube;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let apiPromise: Promise<YouTube> | null = null;
function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise)
    apiPromise = new Promise<YouTube>((resolve, reject) => {
      const timeout = setTimeout(() => {
        apiPromise = null;
        reject(new Error('播放器加载超时，请检查网络后重试。'));
      }, 18000);
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timeout);
        if (window.YT) resolve(window.YT);
      };
      const existing = document.getElementById('youtube-api');
      existing?.remove();
      const script = document.createElement('script');
      script.id = 'youtube-api';
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => {
        clearTimeout(timeout);
        apiPromise = null;
        reject(new Error('暂时无法连接 YouTube。请检查网络后重试。'));
      };
      document.head.appendChild(script);
    });
  return apiPromise;
}
export default function VideoPlayer({
  videoId,
  title,
  startSeconds,
  onProgress,
  onEnded,
}: {
  videoId: string;
  title: string;
  startSeconds: number;
  onProgress: (seconds: number) => void;
  onEnded: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const progressRef = useRef(onProgress);
  const endedRef = useRef(onEnded);
  const lastSaved = useRef(0);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    progressRef.current = onProgress;
    endedRef.current = onEnded;
  }, [onProgress, onEnded]);
  const save = useCallback((force = false) => {
    if (!player.current || (!force && Date.now() - lastSaved.current < 15000)) return;
    const seconds = player.current.getCurrentTime?.();
    if (Number.isFinite(seconds)) {
      lastSaved.current = Date.now();
      progressRef.current(Math.max(0, Math.floor(seconds)));
    }
  }, []);
  useEffect(() => {
    if (!active) return;
    let canceled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    loadApi()
      .then((YT) => {
        if (canceled || !host.current) return;
        const mount = document.createElement('div');
        host.current.replaceChildren(mount);
        player.current = new YT.Player(mount, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            origin: window.location.origin,
            start: Math.floor(startSeconds),
            rel: 0,
            playsinline: 1,
            autoplay: 0,
          },
          events: {
            onReady: () => {
              const iframe = host.current?.querySelector('iframe');
              if (iframe) iframe.title = title;
              timer = setInterval(() => {
                if (player.current?.getPlayerState() === 1) save(true);
              }, 60000);
            },
            onError: (event) =>
              setError(
                [101, 150].includes(event.data)
                  ? '视频作者关闭了嵌入播放，请在 YouTube 中打开。'
                  : event.data === 100
                    ? '视频已删除或设为私享，请联系课程管理员。'
                    : '暂时无法播放此视频。你可以重试或在 YouTube 中打开。',
              ),
            onStateChange: (event) => {
              if (event.data === 2) save();
              if (event.data === 0) {
                save(true);
                endedRef.current();
              }
            },
          },
        });
      })
      .catch((e) => {
        if (!canceled) setError(e.message);
      });
    const hide = () => {
      if (document.visibilityState === 'hidden') save();
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      canceled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', hide);
      if (player.current) {
        save();
        player.current.destroy();
        player.current = null;
      }
    };
  }, [active, attempt, videoId, title, save, startSeconds]);
  return (
    <div className="player-wrap">
      {!active ? (
        <div className="player-poster">
          <span className="eyebrow">BRCLIO ACADEMY / VIDEO CLASS</span>
          <button className="player-start" onClick={() => setActive(true)} aria-label={`加载视频：${title}`}>
            <Play size={30} fill="currentColor" />
          </button>
          <strong>{title}</strong>
          <p>
            {startSeconds > 0
              ? `继续上次进度 · ${Math.floor(startSeconds / 60)}:${String(Math.floor(startSeconds % 60)).padStart(2, '0')}`
              : '准备好，就开始这一节。'}
          </p>
          <span className="poster-film">
            <Film size={120} strokeWidth={0.7} />
          </span>
        </div>
      ) : (
        <div className="youtube-host" ref={host} />
      )}
      {error && (
        <div className="player-error" role="alert">
          <p>{error}</p>
          <div className="button-row">
            <button
              className="btn small"
              onClick={() => {
                setError('');
                setAttempt((a) => a + 1);
              }}
            >
              重新加载
            </button>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn small"
            >
              在 YouTube 打开
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
      <div className="player-caption">
        <span>按自己的节奏学习 · 播放时每分钟保存进度</span>
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">
          YouTube <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
