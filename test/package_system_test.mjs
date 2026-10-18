import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

test("the tarball installs into an isolated real Pi and discovers Meridian's models", async () => {
	const home = mkdtempSync(path.join(tmpdir(), "pi-meridian-package-"));
	const agentDir = path.join(home, "agent");
	const env = { ...process.env, HOME: home, PI_CODING_AGENT_DIR: agentDir, PI_SKIP_VERSION_CHECK: "1" };
	delete env.PI_OFFLINE;
	const requests = [];
	const meridian = createServer((request, response) => {
		requests.push(request.url);
		response.setHeader("content-type", "application/json");
		response.end(
			JSON.stringify({
				object: "list",
				data: [
					{
						id: "claude-package-test",
						object: "model",
						owned_by: "anthropic",
						display_name: "Package test",
						context_window: 200000,
						capabilities: {},
					},
				],
			}),
		);
	});
	await new Promise((resolve) => meridian.listen(0, "127.0.0.1", resolve));

	try {
		const packed = JSON.parse(
			execFileSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", home], {
				cwd: root,
				env,
				encoding: "utf8",
			}),
		)[0];
		assert.deepEqual(packed.files.map((file) => file.path).sort(), [
			"LICENSE",
			"README.md",
			"UPSTREAM",
			"extensions/meridian/index.ts",
			"extensions/meridian/pi/catalog.ts",
			"extensions/meridian/pi/headers.ts",
			"extensions/meridian/pi/index.ts",
			"extensions/meridian/priority-attestation.ts",
			"package.json",
		]);
		execFileSync("tar", ["-xzf", path.resolve(home, packed.filename), "-C", home]);
		const installed = path.join(home, "package");
		execFileSync("pi", ["install", installed], { cwd: home, env, timeout: 30_000 });
		const settings = JSON.parse(readFileSync(path.join(agentDir, "settings.json"), "utf8"));
		assert.deepEqual(
			settings.packages.map((source) => path.resolve(agentDir, source)),
			[installed],
		);

		const { stdout } = await promisify(execFile)("pi", ["--list-models", "meridian"], {
			cwd: home,
			env: { ...env, MERIDIAN_BASE_URL: `http://127.0.0.1:${meridian.address().port}` },
			encoding: "utf8",
			timeout: 30_000,
		});
		assert.match(stdout, /^meridian\s+claude-package-test\s/m);
		assert.deepEqual(requests, ["/v1/models"]);
		const store = JSON.parse(readFileSync(path.join(agentDir, "models-store.json"), "utf8"));
		assert.deepEqual(
			store.meridian.models.map((model) => model.id),
			["claude-package-test"],
		);
	} finally {
		meridian.close();
		rmSync(home, { recursive: true, force: true });
	}
});
