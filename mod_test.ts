import { Status } from "./deps.ts";
import {
  HttpError,
  HttpErrorOptions,
  isHttpError,
  optionsFromArgs,
} from "./mod.ts";
import { assertEquals, assertThrows, describe, it } from "./test_deps.ts";

const httpErrorTests = describe("HttpError");

it(httpErrorTests, "without args", () => {
  const error = new HttpError();
  assertEquals(error.toString(), "InternalServerError");
  assertEquals(error.name, "InternalServerError");
  assertEquals(error.message, "");
  assertEquals(error.status, 500);
  assertEquals(error.expose, false);
  assertEquals(error.cause, undefined);
});

it(httpErrorTests, "with status", () => {
  function assertWithStatus(error: HttpError): void {
    assertEquals(error.status, 400);
    assertEquals(error.expose, true);
  }
  assertWithStatus(new HttpError(400));
  assertWithStatus(new HttpError({ status: 400 }));
  assertWithStatus(new HttpError(undefined, { status: 400 }));
});

it(httpErrorTests, "with message", () => {
  function assertWithMessage(error: HttpError): void {
    assertEquals(error.toString(), "InternalServerError: something went wrong");
    assertEquals(error.message, "something went wrong");
  }
  assertWithMessage(new HttpError("something went wrong"));
  assertWithMessage(new HttpError({ message: "something went wrong" }));
  assertWithMessage(new HttpError(undefined, "something went wrong"));
  assertWithMessage(
    new HttpError(undefined, { message: "something went wrong" }),
  );
});

it(
  httpErrorTests,
  "prefer status/message args over status/messagee options",
  () => {
    const names = ["BadRequestError", "BadGatewayError"];
    const messages = ["something went wrong", "failed"];
    const statuses = [400, 502];
    const options = { message: messages[1], status: statuses[1] };

    function assertPreferArgs(
      error: HttpError,
      expectedStatus: number,
      expectedMessage: string,
    ): void {
      const expectedName = names[expectedStatus === statuses[0] ? 0 : 1];
      assertEquals(error.toString(), `${expectedName}: ${expectedMessage}`);
      assertEquals(error.name, expectedName);
      assertEquals(error.message, expectedMessage);
      assertEquals(error.status, expectedStatus);
      assertEquals(error.expose, expectedStatus < 500);
    }
    assertPreferArgs(
      new HttpError(statuses[0], messages[0], options),
      statuses[0],
      messages[0],
    );
    assertPreferArgs(
      new HttpError(statuses[0], options),
      statuses[0],
      messages[1],
    );
    assertPreferArgs(
      new HttpError(messages[0], options),
      statuses[1],
      messages[0],
    );
    assertPreferArgs(new HttpError(options), statuses[1], messages[1]);
  },
);

it(httpErrorTests, "with cause", () => {
  const cause = new Error("fail");
  function assertWithCause(error: HttpError): void {
    assertEquals(error.cause, cause);
  }
  assertWithCause(new HttpError({ cause }));
  assertWithCause(new HttpError(undefined, { cause }));
  assertWithCause(new HttpError(undefined, undefined, { cause }));
});

it(httpErrorTests, "invalid status", () => {
  assertThrows(
    () => new HttpError(-500),
    RangeError,
    "invalid error status",
  );
  assertThrows(() => new HttpError(0), RangeError, "invalid error status");
  assertThrows(
    () => new HttpError(399),
    RangeError,
    "invalid error status",
  );
  assertThrows(
    () => new HttpError(600),
    RangeError,
    "invalid error status",
  );
});

const DEFAULT_ERROR_NAMES = new Map<Status, string>(([
  [Status.BadRequest, "BadRequest"],
  [Status.Unauthorized, "Unauthorized"],
  [Status.PaymentRequired, "PaymentRequired"],
  [Status.Forbidden, "Forbidden"],
  [Status.NotFound, "NotFound"],
  [Status.MethodNotAllowed, "MethodNotAllowed"],
  [Status.NotAcceptable, "NotAcceptable"],
  [Status.ProxyAuthRequired, "ProxyAuthenticationRequired"],
  [Status.RequestTimeout, "RequestTimeout"],
  [Status.Conflict, "Conflict"],
  [Status.Gone, "Gone"],
  [Status.LengthRequired, "LengthRequired"],
  [Status.PreconditionFailed, "PreconditionFailed"],
  [Status.RequestEntityTooLarge, "RequestEntityTooLarge"],
  [Status.RequestURITooLong, "RequestURITooLong"],
  [Status.UnsupportedMediaType, "UnsupportedMediaType"],
  [Status.RequestedRangeNotSatisfiable, "RequestedRangeNotSatisfiable"],
  [Status.ExpectationFailed, "ExpectationFailed"],
  [Status.Teapot, "Teapot"],
  [Status.MisdirectedRequest, "MisdirectedRequest"],
  [Status.UnprocessableEntity, "UnprocessableEntity"],
  [Status.Locked, "Locked"],
  [Status.FailedDependency, "FailedDependency"],
  [Status.TooEarly, "TooEarly"],
  [Status.UpgradeRequired, "UpgradeRequired"],
  [Status.PreconditionRequired, "PreconditionRequired"],
  [Status.TooManyRequests, "TooManyRequests"],
  [Status.RequestHeaderFieldsTooLarge, "RequestHeaderFieldsTooLarge"],
  [Status.UnavailableForLegalReasons, "UnavailableForLegalReasons"],
  [Status.InternalServerError, "InternalServer"],
  [Status.NotImplemented, "NotImplemented"],
  [Status.BadGateway, "BadGateway"],
  [Status.ServiceUnavailable, "ServiceUnavailable"],
  [Status.GatewayTimeout, "GatewayTimeout"],
  [Status.HTTPVersionNotSupported, "HTTPVersionNotSupported"],
  [Status.VariantAlsoNegotiates, "VariantAlsoNegotiates"],
  [Status.InsufficientStorage, "InsufficientStorage"],
  [Status.LoopDetected, "LoopDetected"],
  [Status.NotExtended, "NotExtended"],
  [Status.NetworkAuthenticationRequired, "NetworkAuthenticationRequired"],
] as [Status, string][]).map(([status, name]) => [status, `${name}Error`]));

function expectedDefaultErrorName(status: number): string {
  return DEFAULT_ERROR_NAMES.has(status)
    ? DEFAULT_ERROR_NAMES.get(status)!
    : `Unknown${status < 500 ? "Client" : "Server"}Error`;
}

function assertName(
  error: HttpError,
  expectedStatus: number,
  expectedMessage: string,
  expectedName?: string,
): void {
  if (!expectedName) expectedName = expectedDefaultErrorName(expectedStatus);
  assertEquals(
    [
      error.status,
      error.name,
      error.message,
      error.toString(),
    ],
    [
      expectedStatus,
      expectedName,
      expectedMessage,
      `${expectedName}: ${expectedMessage}`,
    ],
  );
}

it(httpErrorTests, "default name", () => {
  const message = "something went wrong";
  for (let status = 400; status < 600; status++) {
    assertName(new HttpError(status, message), status, message);
  }
});

it(httpErrorTests, "override name", () => {
  const message = "something went wrong";
  for (let status = 400; status < 600; status++) {
    assertName(
      new HttpError(status, message, { name: "CustomError" }),
      status,
      message,
      "CustomError",
    );
  }
});

function assertExpose(
  error: HttpError,
  expectedStatus: number,
  expectedExpose?: boolean,
): void {
  assertEquals(
    [
      error.status,
      error.expose,
    ],
    [
      expectedStatus,
      expectedExpose ?? (expectedStatus < 500),
    ],
  );
}

it(httpErrorTests, "default expose", () => {
  for (let status = 400; status < 600; status++) {
    assertExpose(new HttpError(status), status);
  }
});

it(httpErrorTests, "override expose", () => {
  for (let status = 400; status < 600; status++) {
    const expose = status >= 500;
    assertExpose(new HttpError(status, { expose }), status, expose);
  }
});

it(httpErrorTests, "with all options", () => {
  const cause = new Error("fail");
  function assertAllOptions(error: HttpError) {
    assertEquals(error.toString(), "CustomError: something went wrong");
    assertEquals(error.name, "CustomError");
    assertEquals(error.message, "something went wrong");
    assertEquals(error.status, 400);
    assertEquals(error.expose, false);
    assertEquals(error.cause, cause);
  }
  assertAllOptions(
    new HttpError(400, "something went wrong", {
      name: "CustomError",
      expose: false,
      cause,
    }),
  );
  assertAllOptions(
    new HttpError(400, {
      name: "CustomError",
      message: "something went wrong",
      expose: false,
      cause,
    }),
  );
  assertAllOptions(
    new HttpError("something went wrong", {
      name: "CustomError",
      status: 400,
      expose: false,
      cause,
    }),
  );
  assertAllOptions(
    new HttpError({
      name: "CustomError",
      message: "something went wrong",
      status: 400,
      expose: false,
      cause,
    }),
  );
});

it("isHttpError", () => {
  assertEquals(isHttpError(new Error()), false);
  assertEquals(isHttpError(new HttpError()), true);
  assertEquals(isHttpError(new HttpError(400, "something went wrong")), true);
  class CustomError extends HttpError {
    constructor(message: string) {
      super(420, message, { name: "CustomError" });
    }
  }
  assertEquals(isHttpError(new CustomError("too high")), true);
  class OtherError extends Error {
    constructor(message: string) {
      super(message);
    }
  }
  assertEquals(isHttpError(new OtherError("failed")), false);
  class OtherHttpError extends Error {
    status: number;
    expose: boolean;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.expose = status < 500;
    }
  }
  assertEquals(isHttpError(new OtherHttpError(400, "failed")), true);
});

const optionsFromArgsTests = describe("optionsFromArgs");

it(
  optionsFromArgsTests,
  "prefer status/message args over status/messagee options",
  () => {
    const messages = ["something went wrong", "failed"];
    const statuses = [400, 502];
    const options = { message: messages[1], status: statuses[1] };

    function assertPreferArgs(
      options: HttpErrorOptions,
      expectedStatus: number,
      expectedMessage: string,
    ): void {
      assertEquals(options, {
        status: expectedStatus,
        message: expectedMessage,
      });
    }
    assertPreferArgs(
      optionsFromArgs(statuses[0], messages[0], options),
      statuses[0],
      messages[0],
    );
    assertPreferArgs(
      optionsFromArgs(statuses[0], options),
      statuses[0],
      messages[1],
    );
    assertPreferArgs(
      optionsFromArgs(messages[0], options),
      statuses[1],
      messages[0],
    );
    assertPreferArgs(optionsFromArgs(options), statuses[1], messages[1]);
  },
);

it(
  optionsFromArgsTests,
  "supports extended options",
  () => {
    const status = 400;
    const message = "something went wrong";
    const options = { code: "invalid_request", uri: "https://example.com" };
    interface ExtendedErrorOptions extends HttpErrorOptions {
      code?: string;
      uri?: string;
    }
    const expectedOptions: ExtendedErrorOptions = {
      status,
      message,
      ...options,
    };
    function assertExtendedInit(options: ExtendedErrorOptions): void {
      assertEquals(options, expectedOptions);
    }

    assertExtendedInit(
      optionsFromArgs<ExtendedErrorOptions>(status, message, options),
    );
    assertExtendedInit(
      optionsFromArgs<ExtendedErrorOptions>(status, { message, ...options }),
    );
    assertExtendedInit(
      optionsFromArgs<ExtendedErrorOptions>(message, { status, ...options }),
    );
    assertExtendedInit(
      optionsFromArgs<ExtendedErrorOptions>({ status, message, ...options }),
    );
  },
);
