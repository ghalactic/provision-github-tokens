import { expect, it } from "vitest";
import { TestRequestError } from "../__mocks__/@octokit/action.js";
import { requestErrorHasError } from "./octokit.js";

it("detects matching errors", () => {
  const error = new TestRequestError(400, {
    errors: [{ resource: "Label", code: "already_exists", field: "name" }],
  });

  expect(requestErrorHasError(error, { code: "already_exists" })).toBe(true);
  expect(
    requestErrorHasError(error, {
      resource: "Label",
      code: "already_exists",
      field: "name",
    }),
  ).toBe(true);
});

it("detects non-matching errors", () => {
  const error = new TestRequestError(400, { errors: [{ code: "code-a" }] });

  expect(requestErrorHasError(error, { code: "code-b" })).toBe(false);
});

it("handles errors with no data", () => {
  const error = new TestRequestError(400);

  expect(requestErrorHasError(error, { code: "any_code" })).toBe(false);
});
