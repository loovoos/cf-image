export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

function getContentType(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'html': 'text/html',
    'json': 'application/json',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'mkv': 'video/x-matroska'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

export async function OPTIONS(request) {
  return new Response(null, { headers: corsHeaders });
}

export async function GET(request, { params }) {
  const { name } = params;
  let { env, cf, ctx } = getRequestContext();
  let req_url = new URL(request.url);

  if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
    return Response.json({
      status: 500,
      message: `TG_BOT_TOKEN or TG_CHAT_ID is not Set`,
      success: false
    }, { status: 500, headers: corsHeaders });
  }

  const cacheKey = new Request(req_url.toString(), request);
  const cache = caches.default;

  // 检查封禁状态
  try {
    const rating = await getRating(env.IMG, `/cfile/${name}`);
    if (rating === 3) {
      return Response.redirect(`${req_url.origin}/img/blocked.png`, 302);
    }
  } catch (error) {
    console.log(error);
  }

  // 检查缓存
  let cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const file_path = await getFile_path(env, name);
    const fileName = file_path.split('/').pop();

    if (file_path === "error") {
      return Response.json({
        status: 500,
        message: 'File not found',
        success: false
      }, { status: 500, headers: corsHeaders });
    }

    // 不直接转发客户端的所有请求头，只发送必要的头信息
    const res = await fetch(`https://api.telegram.org/file/bot${env.TG_BOT_TOKEN}/${file_path}`, {
      method: request.method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "*/*"
      },
      body: request.body,
    });

    if (res.ok) {
      const fileBuffer = await res.arrayBuffer();
      const contentType = getContentType(fileName);
      const responseHeaders = {
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Access-Control-Allow-Origin": "*",
        "Content-Type": contentType
      };
      const response_img = new Response(fileBuffer, { headers: responseHeaders });

      ctx.waitUntil(cache.put(cacheKey, response_img.clone()));
      return response_img;
    } else {
      return Response.json({
        status: 500,
        message: 'Failed to fetch file',
        success: false
      }, { status: 500, headers: corsHeaders });
    }
  } catch (error) {
    return Response.json({
      status: 500,
      message: error.message,
      success: false
    }, { status: 500, headers: corsHeaders });
  }
}

async function getFile_path(env, file_id) {
  try {
    const url = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getFile?file_id=${file_id}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
    });
    let responseData = await res.json();
    if (responseData.ok) {
      return responseData.result.file_path;
    }
    return "error";
  } catch (error) {
    return "error";
  }
}

async function getRating(DB, url) {
  if (!DB) return null;
  try {
    const ps = DB.prepare(`SELECT rating FROM imginfo WHERE url=?`).bind(url);
    const result = await ps.first();
    return result ? result.rating : null;
  } catch {
    return null;
  }
}