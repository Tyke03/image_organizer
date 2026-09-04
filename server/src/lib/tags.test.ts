import { postProcessTags } from "./tags.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ok  ${msg}`);
  } else {
    failed++;
    console.error(`  FAIL  ${msg}`);
  }
}

function eq(a: unknown, b: unknown, msg: string) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  assert(ok, msg + (ok ? "" : ` expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`));
}

console.log("postProcessTags");

eq(postProcessTags("Red Car, blue sky"), ["red", "car", "blue", "sky"], "splits and lowercases");
eq(postProcessTags("the image shows a cat"), ["cat"], "strips stopwords");
eq(postProcessTags("Woman / Beach; Sunset"), ["woman", "beach", "sunset"], "splits on punctuation");
eq(postProcessTags(["NSFW", "blonde", "blonde", "hair"]), ["nsfw", "blonde", "hair"], "dedupes array input");
eq(postProcessTags("a an the of"), [], "all stopwords -> empty");
eq(postProcessTags("A x"), [], "too-short tokens dropped");
eq(postProcessTags("self-portrait cyber_punk"), ["self-portrait", "cyber_punk"], "keeps hyphen/underscore");
eq(postProcessTags("123 45 foo"), ["foo"], "drops pure numbers");
eq(postProcessTags("  ,, ;  "), [], "empty/noise input");
eq(postProcessTags("Photo of a nude woman on beach"), ["nude", "woman", "beach"], "nsfw-friendly content kept");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
