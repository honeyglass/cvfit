# The Node and pnpm oriko is developed with. direnv loads them on cd through .envrc, so this
# repository runs Node 26 while every other one keeps the Node the system installs.
#
# Node 26 is the newest LTS. oriko itself still runs on Node 24 and up (engines in package.json),
# and the CI tests both.
{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      each = shell: nixpkgs.lib.genAttrs systems (system: shell nixpkgs.legacyPackages.${system});
    in
    {
      devShells = each (pkgs: {
        default = pkgs.mkShellNoCC {
          packages = [
            pkgs.nodejs_26
            pkgs.pnpm # starts the version package.json pins in packageManager
          ];
        };
      });
    };
}
