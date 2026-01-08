import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

// 本地开发时初始化 Cloudflare 平台
if (process.env.NODE_ENV === 'development') {
    await setupDevPlatform();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
            {
                source: '/file/:name*',
                destination: '/api/file/:name*',
            },
        ]
    },
};

export default nextConfig;
