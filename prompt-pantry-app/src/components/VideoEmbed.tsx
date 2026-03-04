import {AlertTriangle} from 'lucide-react';

interface VideoEmbedProps {
    url: string;
}

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]+$/;
const VIMEO_ID_RE = /^\d+$/;

function extractYouTubeId(url: string): string | null {
    if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split(/[?#]/)[0];
        return id && YOUTUBE_ID_RE.test(id) ? id : null;
    }
    if (url.includes('youtube.com')) {
        const id = url.split('v=')[1]?.split('&')[0];
        return id && YOUTUBE_ID_RE.test(id) ? id : null;
    }
    return null;
}

function extractVimeoId(url: string): string | null {
    if (!url.includes('vimeo.com')) return null;
    const id = url.split('vimeo.com/')[1]?.split(/[?#]/)[0];
    return id && VIMEO_ID_RE.test(id) ? id : null;
}

const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

function isValidGenericVideoUrl(url: string): boolean {
    return url.startsWith('https://') && VIDEO_EXTENSIONS.test(url);
}

export function VideoEmbed({url}: VideoEmbedProps) {
    const youtubeId = extractYouTubeId(url);
    if (youtubeId) {
        return (
            <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        );
    }

    const vimeoId = extractVimeoId(url);
    if (vimeoId) {
        return (
            <iframe
                src={`https://player.vimeo.com/video/${vimeoId}`}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
            />
        );
    }

    if (isValidGenericVideoUrl(url)) {
        return (
            <video controls className="w-full h-full">
                <source src={url}/>
                Your browser does not support the video tag.
            </video>
        );
    }

    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-5 w-5 text-amber-500"/>
                <span>Invalid or unsupported video URL</span>
            </div>
        </div>
    );
}
