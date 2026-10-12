import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const fingerprint = "2984E221972876B15B396A43A716D236F1BB97CE";
const registry = "https://registry.npmjs.org";
const [artifact, expectedCommit, ...extra] = process.argv.slice(2);
assert.ok(
	artifact && /^[a-f0-9]{40}$/.test(expectedCommit) && extra.length === 0,
	"Usage: node tools/publish-beta.mjs <staged-tarball> <reviewed-source-commit>",
);
assert.ok(process.stdin.isTTY && process.stdout.isTTY, "Publication requires your own interactive terminal.");

const tarball = path.resolve(artifact);
const directory = path.dirname(tarball);
const sourceCommit = readFileSync(path.join(directory, "SOURCE_COMMIT"), "utf8").trim();
assert.equal(sourceCommit, expectedCommit, "Staged source differs from the reviewed commit.");
const artifactBytes = readFileSync(tarball);
const digest = createHash("sha256").update(artifactBytes).digest("hex");
const checksums = readFileSync(path.join(directory, "SHA256SUMS"), "utf8").trim().split("\n");
assert.deepEqual(checksums, [`${digest}  ${path.basename(tarball)}`], "Staged checksum or artifact set differs.");
const metadata = JSON.parse(
	execFileSync("tar", ["-xOf", "-", "package/package.json"], { input: artifactBytes, encoding: "utf8" }),
);
assert.equal(metadata.name, "@nateberkopec/pi-meridian");
assert.match(metadata.version, /^\d+\.\d+\.\d+-beta\.\d+$/);
assert.ok(
	!metadata.publishConfig?.registry || metadata.publishConfig.registry === registry,
	"Unexpected package registry override.",
);

const env = { ...process.env, LC_ALL: "C" };
const card = execFileSync("ykman", ["openpgp", "info"], { env, encoding: "utf8" });
const signing = card.split("Signature key:")[1]?.split("Decryption key:")[0];
assert.ok(signing, "Cannot identify the YubiKey signing slot.");
const cardFingerprint = signing.match(/Fingerprint:\s*([A-F0-9 ]+)/)?.[1].replaceAll(" ", "");
assert.equal(cardFingerprint, fingerprint, "Unexpected YubiKey signing key.");
assert.match(signing, /Touch policy:\s*(On|Fixed)\s*$/, "Every signature must require an uncached physical touch.");
const secretMetadata = execFileSync("gpg", ["--batch", "--with-colons", "--list-secret-keys", fingerprint], {
	env,
	encoding: "utf8",
});
let storage;
let hardwareStub = false;
for (const line of secretMetadata.split("\n")) {
	const fields = line.split(":");
	if (fields[0] === "ssb") storage = fields[14];
	if (fields[0] === "fpr" && fields[9] === fingerprint) {
		hardwareStub = Boolean(storage && storage !== "+" && storage !== "#");
	}
}
assert.ok(hardwareStub, "The exact signing subkey must be a card-backed stub, not a disk key.");
const npm = path.join(path.dirname(process.execPath), process.platform === "win32" ? "npm.cmd" : "npm");
const owner = execFileSync(npm, ["whoami", "--registry", registry], { env, encoding: "utf8" }).trim();
assert.equal(owner, "nateberkopec", "Unexpected npm publisher account.");

const approval = {
	package: metadata.name,
	version: metadata.version,
	registry,
	tag: "beta",
	access: "public",
	sourceCommit,
	sha256: digest,
	nonce: randomUUID(),
};
console.log(JSON.stringify(approval, null, 2));
console.log("Your YubiKey signature authorizes immediate publication of this exact tarball.");
const temporary = mkdtempSync(path.join(tmpdir(), "pi-meridian-approval-"));
try {
	const publishTarball = path.join(temporary, path.basename(tarball));
	writeFileSync(publishTarball, artifactBytes, { mode: 0o400 });
	const manifest = path.join(temporary, "approval.json");
	const signature = path.join(temporary, "approval.sig");
	writeFileSync(manifest, `${JSON.stringify(approval)}\n`, { mode: 0o600 });
	execFileSync("gpg", ["--local-user", `${fingerprint}!`, "--output", signature, "--detach-sign", manifest], {
		env,
		stdio: "inherit",
	});
	const status = execFileSync("gpg", ["--batch", "--status-fd", "1", "--verify", signature, manifest], {
		env,
		encoding: "utf8",
	});
	assert.ok(
		status.split("\n").some((line) => line.startsWith(`[GNUPG:] VALIDSIG ${fingerprint} `)),
		"Hardware approval signature did not verify.",
	);
	assert.equal(
		createHash("sha256").update(readFileSync(publishTarball)).digest("hex"),
		digest,
		"Tarball changed during approval.",
	);
	execFileSync(
		npm,
		["publish", publishTarball, "--registry", registry, "--access", "public", "--tag", "beta", "--ignore-scripts"],
		{ env, stdio: "inherit" },
	);
} finally {
	rmSync(temporary, { recursive: true, force: true });
}
