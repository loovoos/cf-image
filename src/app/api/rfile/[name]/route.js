export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

export async function OPTIONS(request) {
  return new Response(null, { headers: corsHeaders });
}

export async function GET(request, { params }) {
  const { name } = params;
  let { env, cf, ctx } = getRequestContext();

  if (!env.IMGRS) {
    return Response.json({
      status: 500,
      message: `IMGRS is not Set`,
      success: false
    }, { status: 500, headers: corsHeaders });
  }

  const req_url = new URL(request.url);
  const cacheKey = new Request(req_url.toString(), request);
  const cache = caches.default;

  // 检查封禁状态
  try {
    const rating = await getRating(env.IMG, `/rfile/${name}`);
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
    const object = await env.IMGRS.get(name, {
      range: request.headers,
      onlyIf: request.headers,
    });

    if (object === null) {
      return Response.json({
        status: 404,
        message: 'File not found',
        success: false
      }, { status: 404, headers: corsHeaders });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    if (object.range) {
      headers.set("content-range", `bytes ${object.range.offset}-${object.range.end ?? object.size - 1}/${object.size}`);
    }

    const status = object.body ? (request.headers.get("range") !== null ? 206 : 200) : 304;
    let response_img = new Response(object.body, { headers, status });

    if (status === 200) {
      ctx.waitUntil(cache.put(cacheKey, response_img.clone()));
    }

    return response_img;
  } catch (error) {
    return Response.json({
      status: 500,
      message: error.message,
      success: false
    }, { status: 500, headers: corsHeaders });
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