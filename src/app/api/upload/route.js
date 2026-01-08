export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
};

// OPTIONS 请求处理（CORS 预检）
export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: corsHeaders
    });
}

export async function POST(request) {
    const { env } = getRequestContext();

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const clientIp = ip.split(',')[0].trim();
    const referer = request.headers.get('Referer') || 'direct';
    const req_url = new URL(request.url);

    // 解析表单数据
    let formData;
    try {
        formData = await request.formData();
    } catch (error) {
        return Response.json({
            code: 400,
            success: false,
            message: '无效的表单数据'
        }, { status: 400, headers: corsHeaders });
    }

    const file = formData.get('file');
    // 支持通过表单字段或查询参数指定存储类型
    const storage = formData.get('storage') || req_url.searchParams.get('storage') || 'tgchannel';

    if (!file) {
        return Response.json({
            code: 400,
            success: false,
            message: '缺少文件参数'
        }, { status: 400, headers: corsHeaders });
    }

    // 验证存储类型
    if (!['tgchannel', 'r2'].includes(storage)) {
        return Response.json({
            code: 400,
            success: false,
            message: '无效的存储类型，仅支持: tgchannel, r2'
        }, { status: 400, headers: corsHeaders });
    }

    try {
        let result;

        if (storage === 'tgchannel') {
            result = await uploadToTgChannel(env, file, req_url);
        } else {
            result = await uploadToR2(env, file, req_url);
        }

        // 记录到数据库
        if (env.IMG && result.success) {
            await insertImageData(env.IMG, result.path, referer, clientIp, 0, getNowTime());
        }

        return Response.json({
            code: 200,
            success: true,
            url: result.url,
            name: result.name,
            storage: storage
        }, { status: 200, headers: corsHeaders });

    } catch (error) {
        return Response.json({
            code: 500,
            success: false,
            message: error.message || '上传失败'
        }, { status: 500, headers: corsHeaders });
    }
}

// 上传到 TG Channel
async function uploadToTgChannel(env, file, req_url) {
    if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
        throw new Error('TG_BOT_TOKEN 或 TG_CHAT_ID 未配置');
    }

    const fileType = file.type;
    const fileTypeMap = {
        'image/': { url: 'sendPhoto', type: 'photo' },
        'video/': { url: 'sendVideo', type: 'video' },
        'audio/': { url: 'sendAudio', type: 'audio' },
        'application/pdf': { url: 'sendDocument', type: 'document' }
    };

    let endpoint = 'sendDocument';
    let fileTypeValue = 'document';

    for (const [key, value] of Object.entries(fileTypeMap)) {
        if (fileType.startsWith(key)) {
            endpoint = value.url;
            fileTypeValue = value.type;
            break;
        }
    }

    const uploadUrl = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${endpoint}`;
    const newFormData = new FormData();
    newFormData.append('chat_id', env.TG_CHAT_ID);
    newFormData.append(fileTypeValue, file);

    const res = await fetch(uploadUrl, {
        method: 'POST',
        body: newFormData,
    });

    const responseData = await res.json();

    if (!responseData.ok) {
        throw new Error(responseData.description || 'Telegram 上传失败');
    }

    const fileData = getFileFromResponse(responseData);
    if (!fileData) {
        throw new Error('无法获取文件信息');
    }

    return {
        success: true,
        url: `${req_url.origin}/api/cfile/${fileData.file_id}`,
        name: fileData.file_name,
        path: `/cfile/${fileData.file_id}`
    };
}

// 上传到 R2
async function uploadToR2(env, file, req_url) {
    if (!env.IMGRS) {
        throw new Error('R2 存储 (IMGRS) 未配置');
    }

    const filename = file.name;
    const header = new Headers();
    header.set('content-type', file.type);
    header.set('content-length', `${file.size}`);

    const object = await env.IMGRS.put(filename, file, {
        httpMetadata: header
    });

    if (!object) {
        throw new Error('R2 上传失败');
    }

    return {
        success: true,
        url: `${req_url.origin}/api/rfile/${filename}`,
        name: filename,
        path: `/rfile/${filename}`
    };
}

// 从 Telegram 响应中提取文件信息
function getFileFromResponse(response) {
    try {
        const getFileDetails = (file) => ({
            file_id: file.file_id,
            file_name: file.file_name || file.file_unique_id
        });

        if (response.result.photo) {
            const largestPhoto = response.result.photo.reduce((prev, current) =>
                (prev.file_size > current.file_size) ? prev : current
            );
            return getFileDetails(largestPhoto);
        }

        if (response.result.video) return getFileDetails(response.result.video);
        if (response.result.audio) return getFileDetails(response.result.audio);
        if (response.result.document) return getFileDetails(response.result.document);

        return null;
    } catch {
        return null;
    }
}

// 插入数据库记录（使用参数化查询防止SQL注入）
async function insertImageData(db, src, referer, ip, rating, time) {
    try {
        await db.prepare(
            `INSERT INTO imginfo (url, referer, ip, rating, total, time) VALUES (?, ?, ?, ?, 1, ?)`
        ).bind(src, referer, ip, rating, time).run();
    } catch (error) {
        console.error('数据库插入失败:', error.message);
    }
}

// 获取当前时间
function getNowTime() {
    return new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(new Date());
}
