import React from "react";
import { renderToString } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import fs from "fs";
import juice from "juice";
import { createElement } from "react";
import { convert } from "html-to-text";

type RenderArgs = {
  template: string;
  components: { [key: string]: string };
  emailsFolder: string;
  data?: any;
  lang: string;
  css?: string;
};

export async function render(args: RenderArgs) {
  const mdxComponents: { [key: string]: { [key: string]: React.FC<any> } } = {};

  for (const [lang, path] of Object.entries(args.components)) {
    const maybeComponents = await import(
      `${process.cwd()}/${args.emailsFolder}/${path}`
    );

    if ("components" in maybeComponents === false) {
      throw new Error(`file ${path} does not export a components variable`);
    }

    mdxComponents[lang] = maybeComponents.components;
  }

  const template = args.template;
  const data = args.data ?? {};

  // localized variables
  const localizedTemplatePath = `${process.cwd()}/${
    args.emailsFolder
  }/${template}.${args.lang}.mdx`;
  const templatePath = fs.existsSync(localizedTemplatePath)
    ? localizedTemplatePath
    : null;

  if (!templatePath) {
    throw new Error(`email template ${template} has not been found`);
  }

  if (!mdxComponents[args.lang]) {
    throw new Error(`missing mdx components for lang ${args.lang}`);
  }

  if (!mdxComponents[args.lang].Link || !mdxComponents[args.lang].Email) {
    throw new Error(
      `components Link or Email are missing for lang ${args.lang}`
    );
  }

  // prepare data
  const mergedData = {
    ...data,
    style: args.css
      ? fs.readFileSync(
          `${process.cwd()}/${args.emailsFolder}/${args.css}`,
          "utf-8"
        )
      : "",
  };

  // process mdx file
  const { evaluateSync } = await import("@mdx-js/mdx");

  const emailContent = fs.readFileSync(templatePath, "utf-8");
  const mdxContent =
    "export const data = " +
    JSON.stringify(mergedData) +
    ";\n\n" +
    `<Email>${emailContent}</Email>`;

  const Link = mdxComponents[args.lang].Link;

  let subject!: string;
  const mdx = evaluateSync(mdxContent, {
    ...(runtime as any),
    useMDXComponents: () => {
      const components: { [key: string]: React.FC<any> } = {};
      const mdxComponentsCopy = { ...mdxComponents[args.lang] };

      mdxComponentsCopy.a = Link;
      mdxComponentsCopy.link = Link;

      for (const [key, Component] of Object.entries(mdxComponentsCopy)) {
        components[key] = (props: { children: React.ReactNode }) => (
          <Component data={mergedData} {...props} />
        );
      }

      // there is one component we have to tweak
      components["Metadata"] = ({ subject: metadataSubject }) => {
        subject = metadataSubject;
        return null;
      };

      return components;
    },
  }).default;

  const html = renderToString(createElement(mdx));

  if (!subject) {
    throw new Error(`subject of email ${template} is missing`);
  }

  // push title in HTML
  const htmlWithTitle = html.replace("[[title]]", subject);

  // replace escapted chars with UTF8 ones
  const htmlWithSpecialChars = htmlWithTitle
    .replace(/(&#x27;)/gi, "'")
    .replace(/(&quot;)/gi, '"')
    .replace(/(&gt;)/gi, ">");

  // get text version to send the email
  const text = convert(htmlWithTitle, { wordwrap: 130 });

  // read CSS file and apply them inlined
  const htmlWithCssInline = juice(htmlWithSpecialChars);

  return {
    html: htmlWithCssInline,
    text,
    subject,
  };
}
