import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const sdk = import.meta.resolve("@earendil-works/pi-coding-agent");

test("the tarball installs only Meridian and executes discovery in an isolated real Pi runtime", () => {
	const home = mkdtempSync(path.join(tmpdir(), "pi-meridian-package-"));
	const agentDir = path.join(home, "agent");
	const env = { ...process.env, HOME: home, PI_CODING_AGENT_DIR: agentDir, PI_OFFLINE: "1" };

	try {
		const packed = JSON.parse(
			execFileSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", home], {
				cwd: root,
				env,
				encoding: "utf8",
			}),
		)[0];
		assert.ok(!packed.files.some((file) => /^(node_modules|test|tmp|development)\//.test(file.path)));
		execFileSync("tar", ["-xzf", path.resolve(home, packed.filename), "-C", home]);
		const installed = path.join(home, "package");
		assert.match(readFileSync(path.join(installed, "LICENSE"), "utf8"), /^MIT License/);
		execFileSync("pi", ["install", installed], { cwd: home, env, timeout: 30_000 });
		const worker = `
			import assert from "node:assert/strict";
			import fs from "node:fs";
			import path from "node:path";
			import { DefaultResourceLoader, SettingsManager } from ${JSON.stringify(sdk)};
			const installed = ${JSON.stringify(installed)};
			const catalog = { object: "list", data: [{ id: "package-test", object: "model", owned_by: "anthropic",
				display_name: "Package test", context_window: 200000, capabilities: {} }] };
			let discoveries = 0;
			globalThis.fetch = async (url) => {
				assert.ok(String(url).endsWith("/v1/models"));
				discoveries++;
				return new Response(JSON.stringify(catalog));
			};
			const loader = new DefaultResourceLoader({
				cwd: process.cwd(), agentDir: process.env.PI_CODING_AGENT_DIR,
				settingsManager: SettingsManager.create(process.cwd(), process.env.PI_CODING_AGENT_DIR),
				noContextFiles: true,
			});
			await loader.reload();
			const loaded = loader.getExtensions();
			assert.deepEqual(loaded.errors, []);
			assert.deepEqual(loaded.warnings ?? [], []);
			assert.deepEqual(loaded.extensions.map(e => e.resolvedPath), [path.join(installed, "extensions/meridian.ts")]);
			assert.equal(discoveries, 1);
			assert.equal(loaded.extensions.flatMap(e => [...e.tools.keys()]).length, 0);
			assert.equal(loaded.extensions.flatMap(e => [...e.commands.keys()]).length, 0);
			assert.deepEqual(loader.getSkills().skills, []);
			assert.deepEqual(loader.getPrompts().prompts, []);
			const cached = JSON.parse(fs.readFileSync(path.join(process.env.PI_CODING_AGENT_DIR, "cache/meridian-models.json"), "utf8"));
			assert.deepEqual(cached.catalog, catalog);
			console.log("packed Meridian verified");
		`;
		const output = execFileSync("node", ["--input-type=module", "-e", worker], {
			cwd: home,
			env,
			encoding: "utf8",
			timeout: 30_000,
		});
		assert.match(output, /packed Meridian verified/);
		const settings = JSON.parse(readFileSync(path.join(agentDir, "settings.json"), "utf8"));
		assert.deepEqual(
			settings.packages.map((source) => path.resolve(agentDir, source)),
			[installed],
		);
	} finally {
		rmSync(home, { recursive: true, force: true });
	}
});
