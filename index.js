/**
 * Host-only bundle that lets an Agent title its own Session.
 *
 * The tool delegates to the mounted `sessionTitle` Service — the exact path the
 * Web UI's rename dialog uses — so the accepted title is normalized, written as
 * a `session/title` event with the `user` source, and pins the title against
 * automatic regeneration.
 *
 * @module dsh-session-rename
 */

/** Model-facing tool name. */
const TOOL_NAME = "session_rename";

/**
 * Services this plugin requires. A deployment without `sessionTitle` leaves the
 * plugin inactive instead of throwing at activation.
 */
export const inject = ["tools", "sessionTitle"];

/**
 * Register the rename tool on the plugin's own context, so unloading the plugin
 * unregisters it.
 * @param ctx - plugin context carrying the injected services.
 */
export function apply(ctx) {
	ctx.tools.register({
		name: TOOL_NAME,
		description: "Rename the current session. Use it when the user asks to rename this session, or when the session title no longer describes the work. The title is pinned to the given text and automatic title generation stops for this session.",
		parameters: {
			type: "object",
			additionalProperties: false,
			properties: {
				title: {
					type: "string",
					description: "The new title: one short line in the user's language naming the actual work, not a full sentence and not a restatement of the request."
				}
			},
			required: ["title"]
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					title: {
						type: "string",
						description: "The accepted title after normalization and truncation."
					},
					seq: {
						type: "integer",
						description: "Session-log sequence of the accepted session/title event."
					}
				},
				required: ["title", "seq"]
			},
			render: (_args, value) => [{
				type: "text",
				text: `Session renamed to "${value.title}".`
			}]
		},
		async execute(args, exec) {
			const title = args?.title;
			if (typeof title !== "string" || title.trim().length === 0) {
				throw new Error(`${TOOL_NAME} requires a non-empty title string`);
			}
			const session = exec.agent?.session;
			if (session === undefined) {
				throw new Error(`${TOOL_NAME} requires an agent Session`);
			}
			try {
				const snapshot = ctx.sessionTitle.rename(session, title);
				return { title: snapshot.title, seq: snapshot.eventSeq };
			} catch (error) {
				if (error instanceof Error && error.name === "SessionTitleInvalidError") {
					throw new Error(`${TOOL_NAME} rejected that title: it has no visible characters after normalization. Pass plain text instead.`);
				}
				throw error;
			}
		}
	});
}
