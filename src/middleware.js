import { auth } from "@/auth"


const ROOT = '/';
const DEFAULT_REDIRECT = '/login';
const LOGIN = '/login'
const API_ADMIN = "/api/admin"
const ADMIN_PAGE = "/admin"
const AUTH_API = "/api/enableauthapi"
const enableAuthapi = process.env.ENABLE_AUTH_API === 'true';

export default auth(async (req) => {
    const { nextUrl } = req;

    const role = req?.auth?.user?.role;
    const isAuthenticated = !!req.auth;

    const isLoginPage = nextUrl.pathname === LOGIN;
    const isHomePage = nextUrl.pathname === ROOT;
    const isAPI_ADMIN = nextUrl.pathname.startsWith(API_ADMIN);
    const isADMIN_PAGE = nextUrl.pathname.startsWith(ADMIN_PAGE);
    const isAuthAPI = nextUrl.pathname.startsWith(AUTH_API);

    // 未登录时的处理
    if (!isAuthenticated) {
        // 登录页面允许访问
        if (isLoginPage) {
            return;
        }

        // 首页需要登录
        if (isHomePage) {
            return Response.redirect(new URL(LOGIN, nextUrl));
        }

        if (isAPI_ADMIN) {
            return Response.json(
                { status: "fail", message: "You are not logged in by admin !", success: false },
                { status: 401 },
            )
        }
        else if (isADMIN_PAGE) {
            return Response.redirect(new URL(LOGIN, nextUrl));
        }
        else if (isAuthAPI) {
            if (enableAuthapi) {
                return Response.json(
                    { status: "fail", message: "You are not logged in by user !", success: false },
                    { status: 401 }
                );
            }
            else {
                return
            }
        }
        else {
            return
        }
    }

    // 已登录用户访问登录页，重定向到首页
    if (isLoginPage) {
        return Response.redirect(new URL(ROOT, nextUrl));
    }

    if (role === 'admin') {
        return;
    }

    if (role === 'user') {
        if (isAPI_ADMIN || isADMIN_PAGE) {
            return Response.redirect(new URL(LOGIN, nextUrl));
        }
    }

})

// 使用静态 matcher 配置
export const config = {
    matcher: [
        "/",
        "/login",
        "/admin/:path*",
        "/api/admin/:path*",
        "/api/enableauthapi/:path*"
    ],
};