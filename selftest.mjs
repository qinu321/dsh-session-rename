/**
 * Offline self-test for dsh-session-rename.
 *
 * Imports the plugin exactly as the Loader would, captures the registered
 * definition through a fake `ctx`, and exercises the schema shape, the render
 * path, and every error branch. No Harness runtime required.
 *
 * Run: node selftest.mjs
 */
import { apply, inject } from "./index.js";

let failures = 0;
const results = [];
function check(label, condition, detail) {
	if (condition) {
		results.push(`  ok   ${label}`);
		return;
	}
	failures += 1;
	results.push(`  FAIL ${label}${detail === undefined ? "" : ` — ${detail}`}`);
}

/** Minimal stand-in for the live Session object. */
const fakeSession = { id: "session-test" };

/** Minimal stand-in for ToolRunContext. */
function fakeExec(agent = { session: fakeSession }) {
	return { agent };
}

/**
 * Register the plugin against a fake `sessionTitle` and return the captured
 * tool definition, so each case is bound to its own service behaviour.
 * @param sessionTitle - stand-in for the sessionTitle Service.
 */
function buildTool(sessionTitle) {
	let definition;
	apply({
		tools: {
			register: (value) => {
				definition = value;
				return () => {};
			}
		},
		sessionTitle
	});
	return definition;
}

// --- 1. registration shape -------------------------------------------------
const renamed = [];
const tool = buildTool({
	rename: (session, title) => {
		renamed.push({ session, title });
		return { title: title.trim(), eventSeq: 42 };
	}
});

check("registers exactly one tool", tool !== undefined);
check("tool name", tool?.name === "session_rename", String(tool?.name));
check("inject declares tools + sessionTitle", JSON.stringify(inject) === JSON.stringify(["tools", "sessionTitle"]), JSON.stringify(inject));
check("execute is async", tool?.execute instanceof Function && tool.execute.constructor.name === "AsyncFunction");
check("output.render is a function", typeof tool?.output?.render === "function");
check("description is non-empty", typeof tool?.description === "string" && tool.description.length > 0);

// --- 2. parameter schema ---------------------------------------------------
check("parameters is an object schema", tool?.parameters?.type === "object");
check("title is required", JSON.stringify(tool?.parameters?.required) === JSON.stringify(["title"]));
check("title is a string", tool?.parameters?.properties?.title?.type === "string");
check("no extra params beyond title", JSON.stringify(Object.keys(tool?.parameters?.properties ?? {})) === JSON.stringify(["title"]), JSON.stringify(Object.keys(tool?.parameters?.properties ?? {})));
check("output schema is an object", tool?.output?.schema?.type === "object");
check("output requires title + seq", JSON.stringify(tool?.output?.schema?.required) === JSON.stringify(["title", "seq"]));
check("output seq is integer", tool?.output?.schema?.properties?.seq?.type === "integer");

// --- 3. render -------------------------------------------------------------
const rendered = tool.output.render({ title: "x" }, { title: "视频分镜", seq: 42 });
check("render returns one text block", Array.isArray(rendered) && rendered.length === 1 && rendered[0].type === "text");
check("render names the accepted title", typeof rendered[0]?.text === "string" && rendered[0].text.includes("视频分镜"), JSON.stringify(rendered[0]));

// --- 4. happy path ---------------------------------------------------------
const value = await tool.execute({ title: "  给插件补会话改名  " }, fakeExec());
check("passes the raw title through to sessionTitle.rename", renamed.length === 1 && renamed[0].title === "  给插件补会话改名  ", JSON.stringify(renamed));
check("passes the live session object", renamed[0]?.session === fakeSession);
check("returns the accepted snapshot title", value?.title === "给插件补会话改名", JSON.stringify(value));
check("returns the event seq", value?.seq === 42, JSON.stringify(value));

// --- 5. error branches -----------------------------------------------------
async function rejects(label, run, matcher) {
	try {
		await run();
		check(label, false, "did not throw");
	} catch (error) {
		check(label, matcher(error), error?.message);
	}
}

await rejects("empty title throws", () => tool.execute({ title: "   " }, fakeExec()), (e) => e.message.includes("non-empty title"));
await rejects("missing title throws", () => tool.execute({}, fakeExec()), (e) => e.message.includes("non-empty title"));
await rejects("non-string title throws", () => tool.execute({ title: 7 }, fakeExec()), (e) => e.message.includes("non-empty title"));
await rejects("missing agent throws", () => tool.execute({ title: "ok" }, {}), (e) => e.message.includes("requires an agent Session"));
await rejects("agent without session throws", () => tool.execute({ title: "ok" }, fakeExec({})), (e) => e.message.includes("requires an agent Session"));

const invalid = new Error("session title must contain visible characters");
invalid.name = "SessionTitleInvalidError";
const invalidTool = buildTool({ rename: () => { throw invalid; } });
await rejects(
	"SessionTitleInvalidError becomes an actionable message",
	() => invalidTool.execute({ title: "ok" }, fakeExec()),
	(e) => e.message.includes("no visible characters") && e.message.includes("session_rename")
);

const upstream = new Error("session \"session-test\" is not live in this store");
const upstreamTool = buildTool({ rename: () => { throw upstream; } });
await rejects(
	"an unrelated failure propagates unchanged",
	() => upstreamTool.execute({ title: "ok" }, fakeExec()),
	(e) => e === upstream
);

// --- report ----------------------------------------------------------------
console.log(results.join("\n"));
console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${results.length - failures}/${results.length} checks`);
process.exit(failures === 0 ? 0 : 1);
