import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_LISTING_ROLES,
  getPublicProfileMissing,
  NMLS_REQUIRED_ROLES,
} from "./public-team";

const base = {
  role: "loan_officer",
  status: "active",
  avatar_url: "https://cdn.example.com/a.jpg",
  license_number: "123456",
  roleAllowed: true,
};

describe("getPublicProfileMissing", () => {
  it("is ready when photo, NMLS, role and account are all fine", () => {
    expect(getPublicProfileMissing(base)).toEqual([]);
  });

  it("always requires a photo (blank or whitespace counts as missing)", () => {
    expect(getPublicProfileMissing({ ...base, avatar_url: null })).toEqual(["photo"]);
    expect(getPublicProfileMissing({ ...base, avatar_url: "  " })).toEqual(["photo"]);
  });

  it("requires NMLS only for licensed roles", () => {
    expect(getPublicProfileMissing({ ...base, license_number: "" })).toEqual(["nmls"]);
    expect(getPublicProfileMissing({ ...base, role: "admin", license_number: null })).toEqual(["nmls"]);
    expect(
      getPublicProfileMissing({ ...base, role: "loan_processor", license_number: null }),
    ).toEqual([]);
  });

  it("blocks disallowed roles and inactive accounts", () => {
    expect(
      getPublicProfileMissing({ ...base, roleAllowed: false, status: "inactive" }),
    ).toEqual(["active", "role"]);
  });
});

describe("api/index.ts inlined copy", () => {
  const api = fs.readFileSync(path.resolve(__dirname, "../api/index.ts"), "utf8");
  const arr = (name: string) =>
    JSON.parse(
      (api.match(new RegExp(`const ${name} = (\\[[^\\]]*\\]);`))?.[1] ?? "null").replace(/'/g, '"'),
    );

  it("keeps the same NMLS-required and default roles", () => {
    expect(arr("PUBLIC_LISTING_NMLS_REQUIRED_ROLES")).toEqual([...NMLS_REQUIRED_ROLES]);
    expect(arr("DEFAULT_PUBLIC_LISTING_ROLES")).toEqual([...DEFAULT_PUBLIC_LISTING_ROLES]);
  });
});
