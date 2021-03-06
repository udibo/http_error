import { Status, STATUS_TEXT } from "./deps.ts";

/** Options for initializing an HttpError. */
export interface HttpErrorOptions extends ErrorOptions {
  /** The name of the error. Default based on error status. */
  name?: string;
  message?: string;
  /** The HTTP status associated with the error. Defaults to 500. */
  status?: number;
  /**
   * Determines if the error should be exposed in the response.
   * Defaults to true for client error statuses and false for server error statuses.
   */
  expose?: boolean;
}

/**
 * Converts HttpError arguments to an options object.
 * Prioritizing status and message arguments over status and message options.
 */
export function optionsFromArgs<
  Init extends HttpErrorOptions = HttpErrorOptions,
>(
  statusOrMessageOrOptions?: number | string | Init,
  messageOrOptions?: string | Init,
  options?: Init,
): Init {
  let status: number | undefined = undefined;
  let message: string | undefined = undefined;
  let init: Init | undefined = options;

  if (typeof statusOrMessageOrOptions === "number") {
    status = statusOrMessageOrOptions;
    if (typeof messageOrOptions === "string") {
      message = messageOrOptions;
    } else if (messageOrOptions) {
      init = messageOrOptions;
      message = init?.message;
    }
  } else if (typeof statusOrMessageOrOptions === "string") {
    message = statusOrMessageOrOptions;
    init = messageOrOptions as (Init | undefined);
    status = init?.status ?? status;
  } else if (typeof messageOrOptions === "string") {
    message = messageOrOptions;
  } else if (!init) {
    init = messageOrOptions ? messageOrOptions : statusOrMessageOrOptions;
    status = init?.status ?? status;
    message = init?.message;
  }

  return { ...init, status, message } as Init;
}

function errorNameForStatus(status: number): string {
  let name: string;
  if (STATUS_TEXT.has(status)) {
    name = status === Status.Teapot
      ? "Teapot"
      : STATUS_TEXT.get(status)!.replace(/\W/g, "");
    if (status !== Status.InternalServerError) name += "Error";
  } else {
    name = `Unknown${status < 500 ? "Client" : "Server"}Error`;
  }
  return name;
}

/** An error for an HTTP request. */
export class HttpError extends Error {
  /**
   * The HTTP status associated with the error.
   * Must be a client or server error status. Defaults to 500.
   */
  status: number;
  /**
   * Determines if the error should be exposed in the response.
   * Defaults to true for client error statuses and false for server error statuses.
   */
  expose: boolean;

  constructor(
    status?: number,
    message?: string,
    options?: HttpErrorOptions,
  );
  constructor(status?: number, options?: HttpErrorOptions);
  constructor(message?: string, options?: HttpErrorOptions);
  constructor(options?: HttpErrorOptions);
  constructor(
    statusOrMessageOrOptions?: number | string | HttpErrorOptions,
    messageOrOptions?: string | HttpErrorOptions,
    options?: HttpErrorOptions,
  ) {
    const init = optionsFromArgs(
      statusOrMessageOrOptions,
      messageOrOptions,
      options,
    );
    const { message, name, expose } = init;
    const status = init.status ?? Status.InternalServerError;

    if (status < 400 || status >= 600) {
      throw new RangeError("invalid error status");
    }

    super(message, init);
    Object.defineProperty(this, "name", {
      configurable: true,
      enumerable: false,
      value: name ?? errorNameForStatus(status),
      writable: true,
    });
    this.status = status;
    this.expose = expose ?? (status < 500);
  }
}

/** Checks if the value as an HttpError. */
export function isHttpError(value: unknown): value is HttpError {
  return !!value && typeof value === "object" &&
    (value instanceof HttpError ||
      (value instanceof Error &&
        typeof (value as HttpError).expose === "boolean" &&
        typeof (value as HttpError).status === "number"));
}
