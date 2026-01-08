export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';




export async function POST(request) {



	const { env, cf, ctx } = getRequestContext();

	if (!env.IMGRS) {
		return Response.json({
			status: 500,
			message: `IMGRS is not Set`,
			success: false
		}, {
			status: 500,
			headers: corsHeaders,
		})
	}




	const req_url = new URL(request.url);



	const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.socket.remoteAddress;
	const clientIp = ip ? ip.split(',')[0].trim() : 'IP not found';
	const Referer = request.headers.get('Referer') || "Referer";

	const formData = await request.formData();
	const fileType = formData.get('file').type;
	const filename = formData.get('file').name;
	const file = formData.get('file');

	const header = new Headers()
	header.set("content-type", fileType)
	header.set("content-length", `${file.size}`)


	const corsHeaders = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400', // 24 hours
		'Content-Type': 'application/json'
	};





	try {

		const object = await env.IMGRS.put(filename, file, {
			httpMetadata: header
		})

		if (object === null) {
			return Response.json({
				status: 404,
				message: ` ${error.message}`,
				success: false
			}
				, {
					status: 404,
					headers: corsHeaders,
				})
		}

		const data = {
			"url": `${req_url.origin}/api/rfile/${filename}`,
			"code": 200,
			"name": filename
		}

		if (!env.IMG) {
			data.env_img = "null"
			return Response.json({
				...data,
				msg: "1"
			}, {
				status: 200,
				headers: corsHeaders,
			})
		} else {
			try {
				const nowTime = await get_nowTime();
				await insertImageData(env.IMG, `/rfile/${filename}`, clientIp, nowTime);

				return Response.json({
					...data,
					msg: "2",
					Referer: Referer,
					clientIp: clientIp,
					rating_index: rating_index,
					nowTime: nowTime
				}, {
					status: 200,
					headers: corsHeaders,
				})


			} catch (error) {
				console.log(error);
				const nowTime = await get_nowTime();
				await insertImageData(env.IMG, `/rfile/${filename}`, clientIp, nowTime);


				return Response.json({
					"msg": error.message
				}, {
					status: 500,
					headers: corsHeaders,
				})
			}
		}




	} catch (error) {
		return Response.json({
			status: 500,
			message: ` ${error.message}`,
			success: false
		}, {
			status: 500,
			headers: corsHeaders,
		})
	}

}






async function insertImageData(env, url, ip, time) {
	try {
		await env.prepare(
			`INSERT INTO imginfo (url, ip, time) VALUES (?, ?, ?)`
		).bind(url, ip, time).run();
	} catch (error) {
		console.error('数据库插入失败:', error.message);
	}
}



async function get_nowTime() {
	const options = {
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	};
	const timedata = new Date();
	const formattedDate = new Intl.DateTimeFormat('zh-CN', options).format(timedata);

	return formattedDate

}



async function getRating(env, url) {

	try {
		const apikey = env.ModerateContentApiKey
		const ModerateContentUrl = apikey ? `https://api.moderatecontent.com/moderate/?key=${apikey}&` : ""

		const ratingApi = env.RATINGAPI ? `${env.RATINGAPI}?` : ModerateContentUrl;

		if (ratingApi) {
			const res = await fetch(`${ratingApi}url=${url}`);
			const data = await res.json();
			const rating_index = data.hasOwnProperty('rating_index') ? data.rating_index : -1;

			// return data;
			return rating_index;
		} else {
			return 0
		}


	} catch (error) {
		return error
	}
}
