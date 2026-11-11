import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export function verifyIosPackage(root = ".") {
  const read = path => readFileSync(join(root, path), "utf8");
  const config = JSON.parse(read("ios/App/App/capacitor.config.json"));
  if (config.appId !== "se.shiningdays.mrbsudoku" || config.server?.url) throw new Error("Wrong iOS identity or remote startup URL");
  const project = read("ios/App/App.xcodeproj/project.pbxproj");
  for (const setting of ["PRODUCT_BUNDLE_IDENTIFIER = se.shiningdays.mrbsudoku;", "MARKETING_VERSION = 1.0.0;", "CURRENT_PROJECT_VERSION = 2;", 'DEVELOPMENT_TEAM = "";']) {
    if (project.split(setting).length !== 3) throw new Error(`Unexpected iOS setting: ${setting}`);
  }
  const plist = read("ios/App/App/Info.plist");
  if (!plist.includes("ca-app-pub-7448540924654868~5197213597")) throw new Error("Wrong iOS AdMob App ID");
  const plugins = ["AdMobPlugin", "InAppReviewPlugin", "AppPlugin", "HapticsPlugin", "CAPNetworkPlugin", "SharePlugin", "StatusBarPlugin", "SecureStoragePlugin"];
  if (JSON.stringify([...config.packageClassList].sort()) !== JSON.stringify(plugins.sort())) throw new Error("Missing or unexpected iOS plugin");
  for (const file of ["AppDelegate.swift", "SceneDelegate.swift", "App.entitlements", "PrivacyInfo.xcprivacy", "Base.lproj/Main.storyboard", "Base.lproj/LaunchScreen.storyboard"]) {
    if (!existsSync(join(root, "ios/App/App", file))) throw new Error(`Missing iOS file: ${file}`);
  }
  const walk = (path) => readdirSync(join(root, path), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]);
  const files = walk("dist-native");
  for (const path of files) {
    const target = path.replace("dist-native", "ios/App/App/public");
    if (!readFileSync(join(root, path)).equals(readFileSync(join(root, target)))) throw new Error(`Stale iOS asset: ${target}`);
  }
  const js = files.filter(path => path.endsWith(".js")).map(read).join("\n");
  for (const id of ["5823578752", "3884131928", "8705213764"]) {
    if (!js.includes(`ca-app-pub-7448540924654868/${id}`)) throw new Error(`Missing production ad unit: ${id}`);
  }
  if (/supabaseAdmin|SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9_-]{12,}/.test(js)) throw new Error("Privileged code in iOS bundle");
  if (!js.includes("https://mr-b-sudoku-solve-time.lovable.app")) throw new Error("Sudoku service origin missing");
  if (!files.some(path => path.endsWith(".woff2")) || !files.some(path => /generation.*\.js$/.test(path))) throw new Error("Fonts or Sudoku worker missing");
  console.log(`iOS production package verified: ${files.length} identical bundled files, identity/version, eight plugins, own ad IDs and service origin. Xcode compilation NOT verified.`);
}

if (process.argv[1]?.endsWith("verify-ios-package.mjs")) verifyIosPackage();