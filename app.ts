import path from "path";
import util from "util";
import Koa from "koa";
import KoaRouter from "koa-router";
import KoaStatic from "koa-static";
import KoaBodyParser from "koa-bodyparser";
import KoaViews from "koa-views";
import SerializeJS from "serialize-javascript";
import Request from "request-promise";
import JWT from "json-web-token";
import Sqlite3 from "sqlite3";

import * as config from "./config";

const db = new Sqlite3.Database(config.SQLITE_DB_FILE);
const runQuery = util.promisify(db.run.bind(db));
db.exec("CREATE TABLE IF NOT EXISTS results (info TEXT)");
const app = new Koa();
const router = new KoaRouter();

const request = Request.defaults({
    simple: false,
    transform: body => JSON.parse(body)
});

async function getProfileWithCode(code): Promise<[string, string]> { // [err, res]
    try {
        const tokenResponse = await request.post(config.OAUTH2_TOKEN_URL, {
            auth: {
                user: config.OAUTH2_CLIENT_ID,
                password: config.OAUTH2_CLIENT_SECRET
            },
            form: {
                grant_type: "authorization_code",
                code: code
            }
        });
    
        if (tokenResponse.error) {
            return ["Failed to get access token: " + JSON.stringify(tokenResponse), null];
        }

        const profileResponse = await request.get(config.OAUTH2_PROFILE_URL, {
            auth: {
                bearer: tokenResponse.access_token
            }
        });
    
        if (profileResponse.error) {
            return ["Failed to get profile: " + JSON.stringify(profileResponse), null];
        }
    
        return [null, profileResponse];    
    } catch (e) {
        return ["Internal error: " + e.stack, null];
    }
}

router.get("/", async ctx => {
    let loginError = null, userProfile = null;
    if (ctx.query.code) {
        [loginError, userProfile] = await getProfileWithCode(ctx.query.code);
    }

    const userProfileToken = userProfile ? JWT.encode(config.JWT_TOKEN, userProfile).value : null;
    await ctx.render("index", {
        loginError: SerializeJS(loginError),
        userProfile: SerializeJS(userProfile),
        userProfileToken: SerializeJS(userProfileToken),
        oauthClientID: config.OAUTH2_CLIENT_ID
    });
});

router.post("/submit", async ctx => {
    let error = null;
    try {
        const data = (ctx.request as any).body;
        const jwtDecoded = JWT.decode(config.JWT_TOKEN, data.token);
        if (jwtDecoded.error) error = jwtDecoded.error.stack;
        delete data.token;
        data.profile = jwtDecoded.value;
        await runQuery("INSERT INTO results VALUES (?)", JSON.stringify(data));
    } catch (e) {
        error = e.stack;
    }

    ctx.body = {
        error: error,
        success: !error
    };
});

app.use(new KoaStatic(path.join(__dirname, "static")));
app.use(new KoaBodyParser());
app.use(KoaViews(path.join(__dirname, "./views"), {
    extension: "ejs"
}));
app.use(router.routes());

app.listen(3506, () => {
    console.log("App started");
});
