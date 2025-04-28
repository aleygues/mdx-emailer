import { array, object, string } from "yup";

const AttachmentsSchema = array(
  object({
    mimetype: string().required(),
    filename: string().required(),
    b64: string().required(),
  })
);

export const SendRequestSchema = object({
  attachments: AttachmentsSchema,
  to: array(
    object({
      email: string().required(),
      data: object(),
      lang: string(),
      attachments: AttachmentsSchema,
    })
  ).required(),
  fromEmail: string().required(),
  fromName: string().required(),
  lang: string().required(),
  data: object(),
  template: string().required(),
  files: string().required(),
  paths: object({
    css: string(),
    components: object().required(),
  }).required(),
}).required();

export const RenderRequestSchema = object({
  lang: string().required(),
  data: object(),
  template: string().required(),
  files: string().required(),
  paths: object({
    css: string(),
    components: object().required(),
  }),
}).required();
