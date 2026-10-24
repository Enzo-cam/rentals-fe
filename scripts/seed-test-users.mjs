import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const OUTPUT_NAME = "test-users.local.txt";
/** Next to the repo root whatever the working directory is, where .gitignore already ignores it. */
const OUTPUT_FILE = fileURLToPath(
  new URL(`../${OUTPUT_NAME}`, import.meta.url),
);
const REQUIRED_ENV = ["API_URL", "ORIGIN_SECRET", "FRONT_ORIGIN"];

/** Failures with a message that is safe to print: it never carries the password, cookie, secret or links. */
class ScriptError extends Error {}

/** Local time as AAAAMMDDhhmmss, so every run creates businesses and emails that do not collide. */
function timestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return (
    String(date.getFullYear()) +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/** readline cannot hide input, so the password is read from the raw stream one character at a time. */
function readHidden(prompt) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    let value = "";
    stdout.write(prompt);
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();

    function finish() {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    }

    function onData(chunk) {
      for (const char of chunk) {
        if (char === "\x03") {
          finish();
          process.exit(130);
        }
        if (char === "\r" || char === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (char === "\b" || char === "\x7f") value = value.slice(0, -1);
        else value += char;
      }
    }

    stdin.on("data", onData);
  });
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

/** Keeps only name=value of each Set-Cookie: attributes such as Path or Max-Age do not go back in Cookie. */
function cookieHeader(response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function errorCode(response) {
  try {
    const body = await response.json();
    return typeof body?.error === "string" ? body.error : "unknown";
  } catch {
    return "unknown";
  }
}

/** Content-Type goes on every POST, even without a body: the API answers 415 otherwise. */
function createRequester(env) {
  let cookie = "";
  return {
    setCookie(value) {
      cookie = value;
    },
    post(path, body) {
      return fetch(`${env.API_URL}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Origin-Secret": env.ORIGIN_SECRET,
          Origin: env.FRONT_ORIGIN,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    },
  };
}

async function expectJson(response, step) {
  if (!response.ok) {
    throw new ScriptError(
      `${step}: ${response.status} ${await errorCode(response)}`,
    );
  }
  return response.json();
}

function buildReport({ suffix, now, frontOrigin, users }) {
  const lines = [
    "Usuarios de prueba",
    `Sufijo: ${suffix}`,
    `Fecha: ${now.toISOString()}`,
    "",
    `Cada link sirve una vez, vence en 24 h y se abre en el navegador (${frontOrigin}).`,
    "",
  ];
  for (const user of users) {
    lines.push(`${user.name} <${user.email}>`);
    for (const membership of user.memberships) lines.push(`  - ${membership}`);
    lines.push(`  Link: ${user.link ?? "[sin link]"}`, "");
  }
  return lines.join("\n");
}

/** The administrator logs in, creates the businesses and always logs out; the cookie stays inside the requester. */
async function seed(env, email, password) {
  const api = createRequester(env);
  let loggedIn = false;
  try {
    const login = await api.post("/admin/auth/login", { email, password });
    if (login.status === 401) {
      throw new ScriptError(
        "Email o contraseña del administrador incorrectos.",
      );
    }
    if (login.status === 429) {
      const seconds = Number(login.headers.get("Retry-After"));
      throw new ScriptError(
        Number.isFinite(seconds)
          ? `Demasiados intentos. Probá de nuevo en ${Math.ceil(seconds / 60)} min.`
          : "Demasiados intentos. Esperá un rato y probá de nuevo.",
      );
    }
    if (!login.ok) {
      throw new ScriptError(`Login: ${login.status} ${await errorCode(login)}`);
    }
    api.setCookie(cookieHeader(login));
    loggedIn = true;

    const now = new Date();
    const suffix = timestamp(now);
    const anaEmail = `ana.${suffix}@example.com`;
    const juanEmail = `juan.${suffix}@example.com`;
    const anaBusinessName = `Alquileres Ana ${suffix}`;
    const juanBusinessName = `Eventos Juan ${suffix}`;

    /** A new link voids the previous one, so only the last link of each user is worth keeping. */
    const links = new Map();
    const remember = (userEmail, passwordLink) => {
      if (passwordLink) links.set(userEmail, passwordLink);
    };

    const ana = await expectJson(
      await api.post("/admin/businesses", {
        name: anaBusinessName,
        ownerEmail: anaEmail,
        ownerName: "Ana",
      }),
      "Alta del negocio de Ana",
    );
    remember(anaEmail, ana.passwordLink);

    const juan = await expectJson(
      await api.post("/admin/businesses", {
        name: juanBusinessName,
        ownerEmail: juanEmail,
        ownerName: "Juan",
      }),
      "Alta del negocio de Juan",
    );
    remember(juanEmail, juan.passwordLink);

    const member = await expectJson(
      await api.post(`/admin/businesses/${ana.business.id}/members`, {
        email: juanEmail,
        name: "Juan",
        role: "manager",
      }),
      "Alta de Juan como Encargado",
    );
    remember(juanEmail, member.passwordLink);

    const users = [
      {
        name: "Ana",
        email: anaEmail,
        memberships: [`Dueña de "${anaBusinessName}"`],
        link: links.get(anaEmail),
      },
      {
        name: "Juan",
        email: juanEmail,
        memberships: [
          `Dueño de "${juanBusinessName}"`,
          `Encargado de "${anaBusinessName}"`,
        ],
        link: links.get(juanEmail),
      },
    ];
    writeFileSync(
      OUTPUT_FILE,
      buildReport({ suffix, now, frontOrigin: env.FRONT_ORIGIN, users }),
      { encoding: "utf8", mode: 0o600 },
    );
    console.log(`${users.length} usuarios creados:`);
    for (const user of users) console.log(`  - ${user.email}`);
    console.log(`Roles y links en ${OUTPUT_NAME}`);
  } finally {
    if (loggedIn) {
      try {
        await api.post("/admin/auth/logout");
      } catch {
        console.error("No se pudo cerrar la sesión del administrador.");
      }
    }
  }
}

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // .env.local is optional: the variables may already be in the environment.
  }
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Faltan variables en .env.local: ${missing.join(", ")}`);
    process.exit(1);
  }
  const env = {
    API_URL: process.env.API_URL.replace(/\/+$/, ""),
    ORIGIN_SECRET: process.env.ORIGIN_SECRET,
    FRONT_ORIGIN: process.env.FRONT_ORIGIN.replace(/\/+$/, ""),
  };

  if (process.stdin.isTTY !== true) {
    console.error(
      "Hace falta una terminal interactiva. En Git Bash sin ConPTY: winpty node scripts/seed-test-users.mjs, o corrélo desde PowerShell.",
    );
    process.exit(1);
  }

  console.log(`API: ${new URL(env.API_URL).host}`);
  console.log(`Front: ${env.FRONT_ORIGIN}`);
  console.log(
    "Esto crea negocios y usuarios de prueba que el backoffice no permite borrar.",
  );
  if ((await ask("Escribí s para seguir: ")).toLowerCase() !== "s") {
    console.log("Cancelado.");
    return;
  }

  const email = await ask("Email del administrador: ");
  const password = await readHidden("Contraseña del administrador: ");
  await seed(env, email, password);
}

/** Only the error name is printed: the message of an unexpected error could carry a URL or a value typed here. */
function describeUnexpected(error) {
  if (error instanceof ScriptError) return error.message;
  const name = error instanceof Error ? error.name : "UnknownError";
  if (
    error instanceof TypeError ||
    name === "AbortError" ||
    name === "TimeoutError"
  ) {
    return "Falló el pedido a la API (red o tiempo agotado).";
  }
  return `Error inesperado: ${name}`;
}

try {
  await main();
} catch (error) {
  console.error(describeUnexpected(error));
  process.exit(1);
}
