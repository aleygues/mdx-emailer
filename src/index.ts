import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import express, { Request, Response } from "express";
import { error, info } from "./logger";
import { render } from "./renderer";
import { exit } from "process";
import { RenderRequestSchema, SendRequestSchema } from "./schemas";
import { InferType } from "yup";
import { sendEmail } from "./email";

if (!process.env.SECRET_KEY) {
  error("🔴 missing SECRET_KEY env variable");
  exit(1);
}

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  if (req.query.apikey !== process.env.SECRET_KEY) {
    res.status(403).json({ message: "wrong api key" });
    return;
  } else {
    next();
  }
});

async function prepareRenderer(req: Request, res: Response) {
  const files = JSON.parse(
    Buffer.from(req.body.files, "base64").toString("utf8")
  );

  if (!Array.isArray(files)) {
    res.status(400).json({ message: "decoded body.files should be an array" });
    return;
  }

  const emailsFolder = `./queries/${Date.now()}-${
    Math.floor(Math.random() * 8999) + 1000
  }`;
  mkdirSync(emailsFolder, { recursive: true });

  for (const file of files) {
    const fullpath = `${emailsFolder}/${file.path}`;
    const folder = fullpath.slice(0, fullpath.lastIndexOf("/"));
    if (existsSync(folder) === false) {
      mkdirSync(folder, { recursive: true });
    }
    writeFileSync(fullpath, file.content, {
      encoding: "utf-8",
    });
  }

  return {
    emailsFolder,
    paths: {
      components: req.body.paths.components,
      css: req.body.paths.css,
    },
  };
}

app.post("/render-request", async (req, res) => {
  try {
    const args: InferType<typeof RenderRequestSchema> =
      await RenderRequestSchema.validate(req.body);

    const rendererArgs = await prepareRenderer(req, res);

    if (!rendererArgs) {
      return;
    }

    try {
      res.json(
        await render({
          ...rendererArgs,
          data: args.data,
          template: args.template,
          lang: args.lang,
        })
      );
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    } finally {
      rmSync(rendererArgs.emailsFolder, { recursive: true, force: true });
    }
  } catch (e: any) {
    if (e.errors) {
      res.status(400).json({
        message: "validation error",
        errors: e.errors,
      });
    } else {
      res.status(500).json({
        message: "internal error",
      });
    }
  }
});

app.post("/send-request", async (req, res) => {
  try {
    const args: InferType<typeof SendRequestSchema> =
      await SendRequestSchema.validate(req.body);

    const rendererArgs = await prepareRenderer(req, res);

    if (!rendererArgs) {
      return;
    }

    // we may add cache based on hash here
    for (const dest of args.to) {
      const email = await render({
        ...rendererArgs,
        data: Object.assign(args.data, dest.data ?? {}),
        template: args.template,
        lang: dest.lang ?? args.lang,
      });
      const attachments = (args.attachments ?? []).concat(
        dest.attachments ?? []
      );
      sendEmail({
        to: dest.email,
        attachments,
        email,
        fromEmail: args.fromEmail,
        fromName: args.fromName,
      });
    }
    res.status(204).send();
  } catch (e: any) {
    if (e.errors) {
      res.status(400).json({
        message: "validation error",
        errors: e.errors,
      });
    } else {
      res.status(500).json({
        message: "internal error",
      });
    }
  }
});

const port = process.env.PORT || 3000;

app.listen(port, (err) => {
  if (err) {
    error(err.message);
  } else {
    info(`🚀 Server is listening on port ${port}`);
  }
});
