# standard:disable Dotfiles/BanFileSystemClasses -- isolated Pi state for extension contract tests
require "open3"
require "tmpdir"

module MeridianExtensionHelper
  EXTENSION = File.expand_path("../../extensions/meridian.ts", __dir__)
  HELPERS = File.expand_path("../../extensions/meridian", __dir__)

  def run_wrapper(source, env = {}, query = "meridian")
    Dir.mktmpdir("meridian-provider") do |agent_dir|
      contract = File.join(agent_dir, "contract.ts")
      wrapper = File.join(agent_dir, "verify_meridian.ts")
      File.write(contract, source)
      File.write(wrapper, <<~TS)
        import contract from #{contract.to_json};
        export default async function verify(pi) {
          try {
            await contract(pi);
            console.log("MERIDIAN_CONTRACT_COMPLETE");
          } catch (error) {
            console.error(error);
            process.exit(1);
          }
        }
      TS
      run_extension({"PI_OFFLINE" => nil}.merge(env).merge("PI_CODING_AGENT_DIR" => agent_dir), wrapper, query)
    end
  end

  def verify_contract(source)
    output, status = run_wrapper(<<~TS, {"PI_OFFLINE" => "1"})
      import assert from "node:assert/strict";
      #{source}
      export default async function verify() { await check(); }
    TS
    assert status.success?, output
    assert_includes output, "MERIDIAN_CONTRACT_COMPLETE"
    refute_match(/Failed to load extension|Extension error/, output)
  end

  def run_extension(env, extension = EXTENSION, query = "claude-opus-4-6")
    Open3.capture2e(env, "pi", "--no-extensions", "--extension", extension, "--list-models", query)
  end
end
# standard:enable Dotfiles/BanFileSystemClasses
